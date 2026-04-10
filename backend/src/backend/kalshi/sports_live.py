"""Heuristics to classify Kalshi calendar-LIVE rows as *sports* for filtered endpoints."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from backend.settings import Settings

# Default series ticker prefixes (first segment of event_ticker, uppercased) treated as sports.
_DEFAULT_SPORTS_SERIES_PREFIXES: frozenset[str] = frozenset(
    {
        "KXNBA",
        "KXNBAGAME",
        "KXWNBA",
        "KXWNBAGAME",
        "KXNFL",
        "KXNFLGAME",
        "KXMLB",
        "KXMLBGAME",
        "KXNHL",
        "KXNHLGAME",
        "KXMLS",
        "KXMLSGAME",
        "KXNCAAF",
        "KXNCAA",
        "KXNCAAM",
        "KXCFB",
        "KXCBB",
        "KXUFC",
        "KXMMA",
        "KXPGATOUR",
        "KXLPGA",
        "KXEPL",
        "KXUCL",
        "KXSERIEA",
        "KXBUNDESLIGA",
        "KXLALIGA",
        "KXF1",
        "KXNASCAR",
        "KXINDY",
        "KXTEN",
        "KXATP",
        "KXWTA",
        "KXOLY",
        "KXSOCCER",
        "KXFIFA",
        "KXUFCFIGHT",
        "KXBOXING",
        "KXCRICKET",
        "KXIPL",
        "KXRUGBY",
        "KXSUPERBOWL",
        # International / regional leagues surfaced by card_feed
        "KXCONCACAF",
        "KXCONMEBOL",
        "KXUECL",
        "KXUEL",
        "KXT20",
        "KXPSL",
        "KXNPB",
        "KXKBO",
        "KXKHL",
        "KXSHL",
        "KXAFL",
        "KXCBA",
        "KXEUROLEAGUE",
        "KXSAUDIPL",
        "KXEGYPL",
        "KXSUPERLIG",
        "KXDARTS",
        "KXAHL",
        "KXBALLERLEAGUE",
        "KXUFL",
    }
)

# If series.category / tags match these, count as sports (substring, lowercased).
_SPORTS_CATEGORY_HINTS: frozenset[str] = frozenset(
    {
        "sport",
        "sports",
        "nba",
        "nfl",
        "mlb",
        "nhl",
        "mls",
        "wnba",
        "ncaa",
        "golf",
        "pga",
        "ufc",
        "mma",
        "soccer",
        "football",
        "basketball",
        "baseball",
        "hockey",
        "tennis",
        "f1",
        "nascar",
        "olymp",
        "cricket",
        "rugby",
        "boxing",
    }
)

# Strong non-sports categories on the series: reject unless a sports prefix matches the event ticker.
_NON_SPORTS_CATEGORIES: frozenset[str] = frozenset(
    {
        "politics",
        "elections",
        "economics",
        "weather",
        "crypto",
        "science",
        "entertainment",
        "financials",
        "companies",
    }
)

_METADATA_SPORTS_RE = re.compile(
    r"\b(nba|nfl|mlb|nhl|mls|wnba|ncaa|pga|lpga|ufc|mma|"
    r"premier league|champions league|soccer|f1|formula|nascar|tennis|olympics?)\b",
    re.I,
)


def _parse_extra_prefixes(raw: str) -> frozenset[str]:
    parts = [p.strip().upper() for p in raw.replace(";", ",").split(",")]
    return frozenset(p for p in parts if p)


def sports_series_prefixes(settings: Settings) -> frozenset[str]:
    return _DEFAULT_SPORTS_SERIES_PREFIXES | _parse_extra_prefixes(settings.kalshi_sports_series_prefixes_extra)


def series_key_from_event_ticker(event_ticker: str) -> str:
    et = event_ticker.strip().upper()
    if "-" in et:
        return et.split("-", 1)[0]
    return et


def _flatten_strings(obj: object, out: list[str]) -> None:
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            _flatten_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _flatten_strings(v, out)


def _metadata_sports_hit(meta: object) -> bool:
    if meta is None:
        return False
    acc: list[str] = []
    _flatten_strings(meta, acc)
    blob = " ".join(acc).lower()
    if not blob.strip():
        return False
    return _METADATA_SPORTS_RE.search(blob) is not None


def _category_hint_hit(val: object) -> bool:
    if isinstance(val, str) and val.strip():
        low = val.lower()
        for hint in _SPORTS_CATEGORY_HINTS:
            if hint in low:
                return True
    if isinstance(val, list):
        for x in val:
            if isinstance(x, str) and _category_hint_hit(x):
                return True
    return False


def _series_non_sports_category(series_obj: dict[str, Any] | None) -> bool:
    if not isinstance(series_obj, dict):
        return False
    cat = series_obj.get("category")
    if isinstance(cat, str) and cat.strip().lower() in _NON_SPORTS_CATEGORIES:
        return True
    return False


def _prefix_is_sports(series_ticker: str, prefixes: frozenset[str]) -> bool:
    st = series_ticker.strip().upper()
    if st in prefixes:
        return True
    key = series_key_from_event_ticker(st) if "-" in st else st
    if key in prefixes:
        return True
    return any(key.startswith(p) for p in prefixes)


def leg_event_ticker_is_sports(leg_event_ticker: str, settings: Settings) -> bool:
    """Sports if leg ticker series key matches a configured sports prefix (no extra HTTP)."""
    if not isinstance(leg_event_ticker, str) or not leg_event_ticker.strip():
        return False
    prefs = sports_series_prefixes(settings)
    key = series_key_from_event_ticker(leg_event_ticker)
    return key in prefs


def event_is_sports(
    event: dict[str, Any],
    series_obj: dict[str, Any] | None,
    settings: Settings,
) -> bool:
    """Combine prefix, series category/tags, metadata, title, and multivariate legs (any leg)."""
    prefs = sports_series_prefixes(settings)
    et = event.get("event_ticker")
    st = event.get("series_ticker")
    series_ticker = st if isinstance(st, str) else ""

    prefix_hit = False
    if isinstance(et, str) and et:
        prefix_hit = _prefix_is_sports(series_key_from_event_ticker(et), prefs)
    if series_ticker and not prefix_hit:
        prefix_hit = _prefix_is_sports(series_ticker, prefs)

    meta_hit = _metadata_sports_hit(event.get("product_metadata"))
    if not meta_hit and isinstance(series_obj, dict):
        meta_hit = _metadata_sports_hit(series_obj.get("product_metadata"))

    cat_hit = _category_hint_hit(event.get("category"))
    if not cat_hit and isinstance(series_obj, dict):
        cat_hit = _category_hint_hit(series_obj.get("category"))
        if not cat_hit:
            cat_hit = _category_hint_hit(series_obj.get("tags"))

    title_hit = _category_hint_hit(event.get("title"))

    multivariate_leg_hit = False
    markets = event.get("markets") if isinstance(event.get("markets"), list) else []
    for m in markets:
        if not isinstance(m, dict):
            continue
        legs = m.get("mve_selected_legs")
        if not isinstance(legs, list):
            continue
        for leg in legs:
            if not isinstance(leg, dict):
                continue
            let = leg.get("event_ticker")
            if isinstance(let, str) and leg_event_ticker_is_sports(let, settings):
                multivariate_leg_hit = True
                break
        if multivariate_leg_hit:
            break

    sports_signal = prefix_hit or meta_hit or cat_hit or title_hit or multivariate_leg_hit

    if _series_non_sports_category(series_obj) and not prefix_hit and not multivariate_leg_hit:
        # Avoid classifying political/weather series via a loose title/metadata match alone.
        sports_signal = False

    if not sports_signal:
        return False

    if settings.kalshi_sports_live_require_today_et:
        return event_touches_sports_calendar_day(event, settings)

    return True


def _parse_ts_value(val: object) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(float(val), tz=ZoneInfo("UTC"))
    if isinstance(val, str) and val.strip():
        s = val.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        return dt.astimezone(ZoneInfo("UTC"))
    return None


def _collect_event_window_times(ev: dict[str, Any]) -> list[datetime]:
    found: list[datetime] = []
    for key in (
        "strike_date",
        "expected_expiration_time",
        "expiration_time",
        "open_time",
        "close_time",
        "created_time",
    ):
        dt = _parse_ts_value(ev.get(key))
        if dt:
            found.append(dt)
    markets = ev.get("markets") if isinstance(ev.get("markets"), list) else []
    for m in markets:
        if not isinstance(m, dict):
            continue
        for key in ("close_time", "expected_expiration_time", "open_time", "expiration_time"):
            dt = _parse_ts_value(m.get(key))
            if dt:
                found.append(dt)
        ct = m.get("close_ts")
        if isinstance(ct, int):
            dt = _parse_ts_value(ct)
            if dt:
                found.append(dt)
    return found


def event_touches_sports_calendar_day(ev: dict[str, Any], settings: Settings) -> bool:
    """True if any parsed instant falls on the configured local calendar day (inclusive)."""
    try:
        tz = ZoneInfo(settings.kalshi_sports_live_tz.strip() or "America/New_York")
    except Exception:
        tz = ZoneInfo("America/New_York")
    now = datetime.now(tz)
    sod = now.replace(hour=0, minute=0, second=0, microsecond=0)
    eod = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    times = _collect_event_window_times(ev)
    if not times:
        return True
    for t in times:
        local = t.astimezone(tz)
        if sod <= local <= eod:
            return True
    earliest = min(times)
    latest = max(times)
    if earliest.astimezone(tz) <= eod and latest.astimezone(tz) >= sod:
        return True
    return False
