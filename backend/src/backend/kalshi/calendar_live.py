"""Aggregate Kalshi Trade API data into a calendar-style LIVE snapshot (max 10 events)."""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, NamedTuple
from urllib.parse import quote

import httpx

from backend.kalshi.constants import (
    CARD_FEED_MAX_PAGES,
    DEFAULT_CALENDAR_LIVE_MAX_EVENTS,
    EVENT_LIST_MAX_PAGES,
    EVENTS_PAGE_LIMIT,
    KALSHI_CAL_META_GENERAL,
    KALSHI_CAL_META_SPORTS_AGGREGATION,
    KALSHI_CAL_META_SPORTS_CARD_FEED,
    MILESTONE_END_GRACE,
    MILESTONE_LIST_MAX_PAGES,
    MILESTONE_TICKER_FALLBACK_SAMPLE,
    MILESTONES_LIMIT,
    PRIMARY_LIVE_HYDRATE_MAX,
    SERIES_FETCH_CONCURRENCY,
    SPORTS_AGGREGATION_POOL_MAX_TICKERS,
    SPORTS_AGGREGATION_POOL_ME_MULTIPLIER,
    SPORTS_AGGREGATION_POOL_MIN_ROWS,
)
from backend.kalshi.http_client import kalshi_get, kalshi_v1_get
from backend.kalshi.sports_live import event_is_sports
from backend.settings import Settings

_log = logging.getLogger(__name__)


def _parse_dt_utc(val: object) -> datetime | None:
    if not isinstance(val, str) or not val.strip():
        return None
    s = val.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _milestone_is_live_now(m: dict[str, Any], now: datetime) -> bool:
    """Milestone started; not ended, or ended within grace (API end can be early vs real-world LIVE)."""
    start = _parse_dt_utc(m.get("start_date"))
    if start is None or start > now:
        return False
    end = _parse_dt_utc(m.get("end_date"))
    if end is None:
        return True
    if end >= now:
        return True
    return (now - end) <= MILESTONE_END_GRACE


class CalendarLiveAggregated(NamedTuple):
    """Shared aggregation for calendar-live and sports-only snapshots (one Kalshi fan-out)."""

    ms: MilestoneTickerIndex
    mv_ids: set[str]
    by_ticker: dict[str, dict[str, Any]]
    sources: dict[str, str]
    scored: list[tuple[float, float, str]]


class MilestoneTickerIndex(NamedTuple):
    """Milestone-derived ticker sets: primary vs related, and live-window vs all."""

    all_tickers: frozenset[str]
    live_tickers: frozenset[str]
    primary_all: frozenset[str]
    related_all: frozenset[str]
    primary_live: frozenset[str]
    related_live: frozenset[str]


def build_milestone_ticker_index(milestones: list[dict[str, Any]]) -> MilestoneTickerIndex:
    primary_all: set[str] = set()
    related_all: set[str] = set()
    primary_live: set[str] = set()
    related_live: set[str] = set()
    now = datetime.now(timezone.utc)
    for m in milestones:
        live = _milestone_is_live_now(m, now)
        pa = m.get("primary_event_tickers")
        if isinstance(pa, list):
            for t in pa:
                if isinstance(t, str) and t:
                    primary_all.add(t)
                    if live:
                        primary_live.add(t)
        ra = m.get("related_event_tickers")
        if isinstance(ra, list):
            for t in ra:
                if isinstance(t, str) and t:
                    related_all.add(t)
                    if live:
                        related_live.add(t)
    all_t = primary_all | related_all
    live_t = primary_live | related_live
    return MilestoneTickerIndex(
        frozenset(all_t),
        frozenset(live_t),
        frozenset(primary_all),
        frozenset(related_all),
        frozenset(primary_live),
        frozenset(related_live),
    )


def _slug_from_metadata(meta: object) -> str | None:
    """Best-effort middle path segment for kalshi.com/markets URLs."""
    if not isinstance(meta, dict):
        return None
    for key in (
        "custom_nav_slug",
        "category_slug",
        "series_slug",
        "slug",
        "url_slug",
        "nav_slug",
    ):
        raw = meta.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip("/").split("/")[-1]
    for val in meta.values():
        if isinstance(val, str) and 8 <= len(val) <= 120:
            v = val.strip()
            if re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)+$", v) and not v.startswith("http"):
                return v
        if isinstance(val, dict):
            inner = _slug_from_metadata(val)
            if inner:
                return inner
    return None


def build_kalshi_markets_url(
    series_ticker: str,
    event_ticker: str,
    *,
    event_product_metadata: object | None,
    series_product_metadata: object | None = None,
) -> str:
    """Public event URL on kalshi.com (pattern matches common three-segment paths when slug is known)."""
    series_seg = quote(series_ticker.lower(), safe="")
    event_seg = quote(event_ticker, safe="")
    mid = _slug_from_metadata(event_product_metadata) or _slug_from_metadata(series_product_metadata)
    if mid:
        return f"https://kalshi.com/markets/{series_seg}/{quote(mid, safe='')}/{event_seg}"
    return f"https://kalshi.com/markets/{series_seg}/{event_seg}"


def _float_fp(val: object | None) -> float:
    if val is None:
        return 0.0
    try:
        return float(str(val))
    except (TypeError, ValueError):
        return 0.0


def _merge_markets(a: list[dict[str, Any]], b: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_ticker: dict[str, dict[str, Any]] = {}
    for m in a + b:
        t = m.get("ticker")
        if isinstance(t, str):
            by_ticker[t] = m
    return list(by_ticker.values())


def _merge_event_payloads(
    primary: dict[str, Any],
    secondary: dict[str, Any],
) -> dict[str, Any]:
    out = dict(primary)
    for k, v in secondary.items():
        if k not in out or out[k] is None:
            out[k] = v
    ma = primary.get("markets") if isinstance(primary.get("markets"), list) else []
    mb = secondary.get("markets") if isinstance(secondary.get("markets"), list) else []
    if ma or mb:
        out["markets"] = _merge_markets(
            [x for x in ma if isinstance(x, dict)],
            [x for x in mb if isinstance(x, dict)],
        )
    return out


def _event_score(
    event: dict[str, Any],
    ms: MilestoneTickerIndex,
    multivariate_tickers: set[str],
) -> float:
    et = event.get("event_ticker")
    score = 0.0
    if isinstance(et, str):
        if et in ms.primary_live:
            score += 1_000_000.0
        elif et in ms.related_live:
            score += 420_000.0
        elif et in ms.primary_all:
            score += 140_000.0
        elif et in ms.related_all:
            score += 35_000.0
    if isinstance(et, str) and et in multivariate_tickers:
        score += 5_000.0
    markets = event.get("markets") if isinstance(event.get("markets"), list) else []
    any_active = False
    vol_score = 0.0
    for m in markets:
        if not isinstance(m, dict):
            continue
        st = str(m.get("status") or "").lower()
        if st == "active":
            any_active = True
        vol_score += _float_fp(m.get("volume_fp"))
        vol_score += _float_fp(m.get("volume_24h_fp")) * 0.01
    score += min(vol_score, 75_000.0)
    if any_active:
        score += 50_000.0
    return score


async def _get_json(settings: Settings, path: str, params: dict[str, Any] | None) -> dict[str, Any]:
    r = await kalshi_get(settings, path, params=params)
    r.raise_for_status()
    return r.json()


async def _fetch_paged_event_list(
    settings: Settings,
    path: str,
    base_params: dict[str, Any],
    *,
    max_pages: int,
) -> list[dict[str, Any]]:
    acc: list[dict[str, Any]] = []
    cursor: str | None = None
    for _ in range(max_pages):
        params = dict(base_params)
        if cursor:
            params["cursor"] = cursor
        data = await _get_json(settings, path, params)
        ev = data.get("events")
        if isinstance(ev, list):
            acc.extend(x for x in ev if isinstance(x, dict))
        c = data.get("cursor")
        if not isinstance(c, str) or not c.strip():
            break
        cursor = c
    return acc


async def _fetch_open_events(settings: Settings) -> list[dict[str, Any]]:
    return await _fetch_paged_event_list(
        settings,
        "/events",
        {
            "status": "open",
            "with_nested_markets": True,
            "limit": EVENTS_PAGE_LIMIT,
        },
        max_pages=EVENT_LIST_MAX_PAGES,
    )


async def _fetch_multivariate_events(settings: Settings) -> list[dict[str, Any]]:
    return await _fetch_paged_event_list(
        settings,
        "/events/multivariate",
        {"with_nested_markets": True, "limit": EVENTS_PAGE_LIMIT},
        max_pages=EVENT_LIST_MAX_PAGES,
    )


async def _fetch_milestones_list(settings: Settings) -> list[dict[str, Any]]:
    start = (datetime.now(timezone.utc) - timedelta(days=4)).strftime("%Y-%m-%dT%H:%M:%SZ")
    milestones: list[dict[str, Any]] = []
    cursor: str | None = None
    for _ in range(MILESTONE_LIST_MAX_PAGES):
        params: dict[str, Any] = {
            "limit": MILESTONES_LIMIT,
            "minimum_start_date": start,
        }
        if cursor:
            params["cursor"] = cursor
        data = await _get_json(settings, "/milestones", params)
        raw = data.get("milestones")
        if isinstance(raw, list):
            milestones.extend(x for x in raw if isinstance(x, dict))
        c = data.get("cursor")
        if not isinstance(c, str) or not c.strip():
            break
        cursor = c
    return milestones


async def _fetch_series(settings: Settings, series_ticker: str) -> dict[str, Any] | None:
    path = f"/series/{quote(series_ticker, safe='')}"
    try:
        data = await _get_json(settings, path, None)
    except (httpx.HTTPStatusError, httpx.RequestError):
        return None
    s = data.get("series")
    return s if isinstance(s, dict) else None


async def _fetch_single_event_with_markets(settings: Settings, event_ticker: str) -> dict[str, Any] | None:
    try:
        data = await _get_json(
            settings,
            f"/events/{quote(event_ticker, safe='')}",
            {"with_nested_markets": True},
        )
    except httpx.HTTPStatusError:
        return None
    ev_obj = data.get("event")
    if not isinstance(ev_obj, dict):
        return None
    mk = ev_obj.get("markets")
    if not isinstance(mk, list) or not mk:
        top_mk = data.get("markets")
        if isinstance(top_mk, list):
            mk = top_mk
    if isinstance(mk, list):
        ev_obj["markets"] = [x for x in mk if isinstance(x, dict)]
    else:
        ev_obj["markets"] = []
    return ev_obj


async def aggregate_calendar_live_candidates(settings: Settings) -> CalendarLiveAggregated:
    """Single Kalshi fan-out: milestones + open + multivariate, scored candidate list."""
    r_open, r_mv, r_mile = await asyncio.gather(
        _fetch_open_events(settings),
        _fetch_multivariate_events(settings),
        _fetch_milestones_list(settings),
        return_exceptions=True,
    )
    open_ev = r_open if not isinstance(r_open, BaseException) else []
    mv_ev = r_mv if not isinstance(r_mv, BaseException) else []
    milestones_list = r_mile if not isinstance(r_mile, BaseException) else []
    if not isinstance(open_ev, list):
        open_ev = []
    if not isinstance(mv_ev, list):
        mv_ev = []
    if not isinstance(milestones_list, list):
        milestones_list = []
    ms = build_milestone_ticker_index([x for x in milestones_list if isinstance(x, dict)])
    mv_ids = {e["event_ticker"] for e in mv_ev if isinstance(e.get("event_ticker"), str)}

    by_ticker: dict[str, dict[str, Any]] = {}
    sources: dict[str, str] = {}

    for e in open_ev:
        et = e.get("event_ticker")
        if not isinstance(et, str):
            continue
        by_ticker[et] = e
        sources[et] = "events_open"

    for e in mv_ev:
        et = e.get("event_ticker")
        if not isinstance(et, str):
            continue
        if et in by_ticker:
            by_ticker[et] = _merge_event_payloads(by_ticker[et], e)
            sources[et] = f"{sources[et]}+multivariate"
        else:
            by_ticker[et] = e
            sources[et] = "multivariate"

    to_pl = sorted(e for e in ms.primary_live if e not in by_ticker)[:PRIMARY_LIVE_HYDRATE_MAX]
    if to_pl:
        pl_rows = await asyncio.gather(*[_fetch_single_event_with_markets(settings, et) for et in to_pl])
        for et, ev_obj in zip(to_pl, pl_rows, strict=True):
            if ev_obj is not None:
                by_ticker[et] = ev_obj
                sources[et] = "primary_live_hydrate"

    if not by_ticker and ms.all_tickers:
        for et in sorted(ms.all_tickers)[:MILESTONE_TICKER_FALLBACK_SAMPLE]:
            ev_obj = await _fetch_single_event_with_markets(settings, et)
            if ev_obj is None:
                continue
            by_ticker[et] = ev_obj
            sources[et] = "milestone_fetch"

    scored: list[tuple[float, float, str]] = []
    for et, ev in by_ticker.items():
        sc = _event_score(ev, ms, mv_ids)
        lu = _parse_dt_utc(ev.get("last_updated_ts"))
        lu_ts = lu.timestamp() if lu else 0.0
        scored.append((sc, lu_ts, et))
    scored.sort(key=lambda x: (-x[0], -x[1], x[2]))
    return CalendarLiveAggregated(ms=ms, mv_ids=mv_ids, by_ticker=by_ticker, sources=sources, scored=scored)


def _calendar_live_max_events(settings: Settings) -> int:
    n = settings.kalshi_calendar_live_max_events
    return n if isinstance(n, int) and n > 0 else DEFAULT_CALENDAR_LIVE_MAX_EVENTS


async def _fetch_series_cache_for_tickers(
    settings: Settings,
    agg: CalendarLiveAggregated,
    tickers: list[str],
) -> dict[str, dict[str, Any] | None]:
    series_needed: set[str] = set()
    for et in tickers:
        ev = agg.by_ticker.get(et)
        if isinstance(ev, dict):
            st = ev.get("series_ticker")
            if isinstance(st, str) and st:
                series_needed.add(st)
    series_list = sorted(series_needed)
    if not series_list:
        return {}
    sem = asyncio.Semaphore(SERIES_FETCH_CONCURRENCY)

    async def _one(s: str) -> tuple[str, dict[str, Any] | None]:
        async with sem:
            return (s, await _fetch_series(settings, s))

    pairs = await asyncio.gather(*[_one(s) for s in series_list])
    return dict(pairs)


def _shape_out_events(
    agg: CalendarLiveAggregated,
    selected: list[str],
    series_cache: dict[str, dict[str, Any] | None],
) -> list[dict[str, Any]]:
    out_events: list[dict[str, Any]] = []
    for et in selected:
        ev = agg.by_ticker.get(et)
        if not isinstance(ev, dict):
            continue
        st = ev.get("series_ticker")
        series_ticker = st if isinstance(st, str) else ""
        series_obj = series_cache.get(series_ticker) if series_ticker else None
        spm = series_obj.get("product_metadata") if isinstance(series_obj, dict) else None
        epm = ev.get("product_metadata")
        url = build_kalshi_markets_url(
            series_ticker or "unknown",
            et,
            event_product_metadata=epm,
            series_product_metadata=spm if isinstance(spm, dict) else None,
        )
        markets = ev.get("markets") if isinstance(ev.get("markets"), list) else []
        out_events.append(
            {
                "event_ticker": et,
                "title": ev.get("title"),
                "series_ticker": series_ticker,
                "kalshi_url": url,
                "source": agg.sources.get(et, "unknown"),
                "in_milestone_set": et in agg.ms.all_tickers,
                "event": ev,
                "markets": [m for m in markets if isinstance(m, dict)],
            }
        )
    return out_events


async def finalize_calendar_live_payload(
    settings: Settings,
    agg: CalendarLiveAggregated,
    *,
    max_events: int,
    sports_only: bool,
) -> dict[str, Any]:
    """Pick top ``max_events`` rows (optionally sports-filtered) and attach series metadata + URLs."""
    me = max_events if max_events > 0 else DEFAULT_CALENDAR_LIVE_MAX_EVENTS
    if not sports_only:
        selected = [et for _, _, et in agg.scored[:me]]
        series_cache = await _fetch_series_cache_for_tickers(settings, agg, selected)
        out_events = _shape_out_events(agg, selected, series_cache)
        return {
            "max_events": me,
            "returned": len(out_events),
            "milestone_event_tickers_count": len(agg.ms.all_tickers),
            "milestone_live_event_tickers_count": len(agg.ms.live_tickers),
            "kalshi_calendar": dict(KALSHI_CAL_META_GENERAL),
            "events": out_events,
        }

    pool_limit = min(
        len(agg.scored),
        max(SPORTS_AGGREGATION_POOL_MIN_ROWS, me * SPORTS_AGGREGATION_POOL_ME_MULTIPLIER),
        SPORTS_AGGREGATION_POOL_MAX_TICKERS,
    )
    pool_tickers = [et for _, _, et in agg.scored[:pool_limit]]
    series_cache = await _fetch_series_cache_for_tickers(settings, agg, pool_tickers)

    calendar_top = [et for _, _, et in agg.scored[:me]]
    calendar_top_set = set(calendar_top)

    sports_selected: list[str] = []
    for et in pool_tickers:
        if len(sports_selected) >= me:
            break
        ev = agg.by_ticker.get(et)
        if not isinstance(ev, dict):
            continue
        st = ev.get("series_ticker")
        series_ticker = st if isinstance(st, str) else ""
        series_obj = series_cache.get(series_ticker) if series_ticker else None
        if event_is_sports(ev, series_obj if isinstance(series_obj, dict) else None, settings):
            sports_selected.append(et)

    sports_set = set(sports_selected)
    out_events = _shape_out_events(agg, sports_selected, series_cache)

    parity = {
        "calendar_live_top_tickers": calendar_top,
        "sports_tickers": sports_selected,
        "sports_in_calendar_live_top": sorted(sports_set & calendar_top_set),
        "sports_not_in_calendar_live_top": sorted(sports_set - calendar_top_set),
    }

    return {
        "max_events": me,
        "returned": len(out_events),
        "milestone_event_tickers_count": len(agg.ms.all_tickers),
        "milestone_live_event_tickers_count": len(agg.ms.live_tickers),
        "filter": "sports",
        "source": "aggregation",
        "sports_live_tz": settings.kalshi_sports_live_tz,
        "sports_require_today_et": settings.kalshi_sports_live_require_today_et,
        "kalshi_calendar": dict(KALSHI_CAL_META_SPORTS_AGGREGATION),
        "parity": parity,
        "events": out_events,
    }


async def build_calendar_live_payload(settings: Settings) -> dict[str, Any]:
    """Return up to configured max open events aligned with calendar-style LIVE heuristics."""
    me = _calendar_live_max_events(settings)
    agg = await aggregate_calendar_live_candidates(settings)
    return await finalize_calendar_live_payload(settings, agg, max_events=me, sports_only=False)


async def _fetch_card_feed_sports(max_events: int) -> tuple[list[str], list[dict[str, Any]], dict[str, Any]]:
    """Fetch ``/v1/live_data/card_feed?category=Sports``, paginating until we have enough tickers.

    Returns (ordered_tickers, sections, milestone_map).
    """
    tickers: list[str] = []
    seen: set[str] = set()
    all_sections: list[dict[str, Any]] = []
    milestones: dict[str, Any] = {}
    cards: dict[str, Any] = {}
    cursor: str | None = None

    for _ in range(CARD_FEED_MAX_PAGES):
        params: dict[str, Any] = {"category": "Sports"}
        if cursor:
            params["cursor"] = cursor
        resp = await kalshi_v1_get("/live_data/card_feed", params=params)
        resp.raise_for_status()
        data = resp.json()

        for section in data.get("sections", []):
            all_sections.append(section)
            for item in section.get("items", []):
                et = item.get("event_ticker")
                if isinstance(et, str) and et not in seen:
                    tickers.append(et)
                    seen.add(et)

        hd = data.get("hydrated_data", {})
        milestones.update(hd.get("milestones", {}))
        cards.update(hd.get("cards", {}))

        if len(tickers) >= max_events:
            break
        nc = data.get("next_cursor")
        if not isinstance(nc, str) or not nc.strip():
            break
        cursor = nc

    return tickers, all_sections, milestones


async def _fetch_live_data_batch(milestone_ids: list[str]) -> dict[str, Any]:
    """Fetch ``/v1/live_data/batch`` for a set of milestone UUIDs.

    Returns a dict keyed by milestone_id with the live_data details.
    """
    if not milestone_ids:
        return {}
    ids_param = ",".join(milestone_ids)
    resp = await kalshi_v1_get("/live_data/batch", params={"milestone_ids": ids_param})
    resp.raise_for_status()
    data = resp.json()
    out: dict[str, Any] = {}
    raw = data.get("live_datas")
    if not isinstance(raw, list):
        return out
    for ld in raw:
        if not isinstance(ld, dict):
            continue
        mid = ld.get("milestone_id")
        if isinstance(mid, str):
            out[mid] = ld
    return out


def _milestone_ids_for_tickers(
    tickers: list[str],
    milestones: dict[str, Any],
) -> list[str]:
    """Collect milestone IDs whose primary/related tickers overlap with ``tickers``."""
    wanted = set(tickers)
    ids: list[str] = []
    for mid, m in milestones.items():
        related = set()
        for key in ("primary_event_tickers", "related_event_tickers"):
            raw = m.get(key)
            if isinstance(raw, list):
                related.update(t for t in raw if isinstance(t, str))
        if related & wanted:
            ids.append(mid)
    return ids


async def _build_sports_from_card_feed(settings: Settings, max_events: int) -> dict[str, Any]:
    """Build the sports calendar payload using Kalshi's card_feed API (matches kalshi.com/calendar)."""
    tickers, sections, cf_milestones = await _fetch_card_feed_sports(max_events)
    selected = tickers[:max_events]

    if not selected:
        raise ValueError("card_feed returned no sports tickers")

    event_futs = [_fetch_single_event_with_markets(settings, t) for t in selected]
    event_results = await asyncio.gather(*event_futs, return_exceptions=True)
    by_ticker: dict[str, dict[str, Any]] = {}
    for t, ev in zip(selected, event_results, strict=True):
        if isinstance(ev, dict):
            by_ticker[t] = ev

    series_needed: set[str] = set()
    for ev in by_ticker.values():
        st = ev.get("series_ticker")
        if isinstance(st, str) and st:
            series_needed.add(st)
    sem = asyncio.Semaphore(SERIES_FETCH_CONCURRENCY)

    async def _one_series(s: str) -> tuple[str, dict[str, Any] | None]:
        async with sem:
            return (s, await _fetch_series(settings, s))

    series_pairs = await asyncio.gather(*[_one_series(s) for s in sorted(series_needed)])
    series_cache: dict[str, dict[str, Any] | None] = dict(series_pairs)

    milestone_ids = _milestone_ids_for_tickers(selected, cf_milestones)
    live_data: dict[str, Any] = {}
    if milestone_ids:
        try:
            live_data = await _fetch_live_data_batch(milestone_ids)
        except Exception:
            _log.warning("live_data/batch call failed; continuing without live status", exc_info=True)

    ticker_to_milestone: dict[str, str] = {}
    for mid, m in cf_milestones.items():
        for key in ("primary_event_tickers", "related_event_tickers"):
            raw = m.get(key)
            if isinstance(raw, list):
                for t in raw:
                    if isinstance(t, str) and t not in ticker_to_milestone:
                        ticker_to_milestone[t] = mid

    live_section_tickers: set[str] = set()
    for section in sections:
        if section.get("is_live"):
            for item in section.get("items", []):
                et = item.get("event_ticker")
                if isinstance(et, str):
                    live_section_tickers.add(et)

    out_events: list[dict[str, Any]] = []
    for et in selected:
        ev = by_ticker.get(et)
        if not isinstance(ev, dict):
            continue
        st = ev.get("series_ticker")
        series_ticker = st if isinstance(st, str) else ""
        series_obj = series_cache.get(series_ticker) if series_ticker else None
        spm = series_obj.get("product_metadata") if isinstance(series_obj, dict) else None
        epm = ev.get("product_metadata")
        url = build_kalshi_markets_url(
            series_ticker or "unknown",
            et,
            event_product_metadata=epm,
            series_product_metadata=spm if isinstance(spm, dict) else None,
        )
        markets = ev.get("markets") if isinstance(ev.get("markets"), list) else []

        mid = ticker_to_milestone.get(et)
        ld = live_data.get(mid) if mid else None
        game_status = None
        widget_status = None
        live_title = None
        if isinstance(ld, dict):
            details = ld.get("details", {})
            if isinstance(details, dict):
                game_status = details.get("status")
                widget_status = details.get("widget_status")
                pd = details.get("product_details")
                if isinstance(pd, dict):
                    live_title = pd.get("title")

        row: dict[str, Any] = {
            "event_ticker": et,
            "title": ev.get("title"),
            "series_ticker": series_ticker,
            "kalshi_url": url,
            "source": "card_feed",
            "is_live": et in live_section_tickers,
            "game_status": game_status,
            "widget_status": widget_status,
            "live_title": live_title,
            "event": ev,
            "markets": [m for m in markets if isinstance(m, dict)],
        }
        out_events.append(row)

    return {
        "max_events": max_events,
        "returned": len(out_events),
        "source": "card_feed",
        "filter": "sports",
        "sports_live_tz": settings.kalshi_sports_live_tz,
        "kalshi_calendar": dict(KALSHI_CAL_META_SPORTS_CARD_FEED),
        "events": out_events,
    }


async def build_sports_calendar_live_payload(settings: Settings) -> dict[str, Any]:
    """Sports calendar payload via card_feed (matches kalshi.com/calendar), fallback to aggregation."""
    me = _calendar_live_max_events(settings)
    try:
        return await _build_sports_from_card_feed(settings, me)
    except Exception:
        _log.warning("card_feed sports path failed; falling back to aggregation", exc_info=True)
        agg = await aggregate_calendar_live_candidates(settings)
        return await finalize_calendar_live_payload(settings, agg, max_events=me, sports_only=True)
