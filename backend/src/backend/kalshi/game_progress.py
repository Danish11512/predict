"""Derive structured game progress from Kalshi ``live_data`` rows (``details`` is schema-flexible)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Literal

from backend.kalshi.sports_live import series_key_from_event_ticker

SportCode = Literal[
    "nba",
    "wnba",
    "cbb",
    "ncaaf",
    "nfl",
    "nhl",
    "mlb",
    "mls",
    "soccer",
    "generic",
]


def _norm_str(val: object | None) -> str | None:
    if val is None:
        return None
    if isinstance(val, str) and val.strip():
        return val.strip()
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        return str(val)
    return None


def _as_int(val: object | None) -> int | None:
    if val is None:
        return None
    if isinstance(val, bool):
        return None
    if isinstance(val, int):
        return val
    if isinstance(val, float):
        if val != val:  # NaN
            return None
        return int(val)
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        try:
            return int(float(s))
        except ValueError:
            return None
    return None


def _as_float(val: object | None) -> float | None:
    if val is None:
        return None
    if isinstance(val, bool):
        return None
    if isinstance(val, int | float):
        f = float(val)
        if f != f:
            return None
        return f
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        try:
            return float(s)
        except ValueError:
            return None
    return None


_MMSS_CLOCK = re.compile(r"^\s*(\d{1,2}):(\d{2})\s*$")


def _parse_mmss_clock(s: str) -> int | None:
    m = _MMSS_CLOCK.match(s)
    if not m:
        return None
    mm = int(m.group(1))
    ss = int(m.group(2))
    if ss >= 60:
        return None
    return mm * 60 + ss


def _get_first_int(d: dict[str, Any], keys: tuple[str, ...]) -> int | None:
    for k in keys:
        v = d.get(k)
        n = _as_int(v)
        if n is not None:
            return n
    return None


def _get_first_str(d: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for k in keys:
        v = d.get(k)
        s = _norm_str(v)
        if s is not None:
            return s
    return None


def _flatten_details_for_lookup(details: dict[str, Any]) -> dict[str, Any]:
    """Merge ``product_details`` (and one-level nested dicts) into a single lookup map."""
    out: dict[str, Any] = dict(details)
    pd = details.get("product_details")
    if isinstance(pd, dict):
        for k, v in pd.items():
            lk = f"product_details.{k}"
            if k not in out:
                out[k] = v
            out[lk] = v
    return out


def infer_sport_code(series_ticker: str, live_data_type: str | None) -> SportCode:
    st = series_key_from_event_ticker(series_ticker.strip()) if series_ticker.strip() else ""
    blob = f"{st} {live_data_type or ''}".upper()
    if "WNBA" in blob or "WNBAGAME" in blob:
        return "wnba"
    if "NBA" in blob or "NBAGAME" in blob:
        return "nba"
    if "CBB" in blob or "NCAAM" in blob or "NCAA" in blob and "BASK" in blob:
        return "cbb"
    if "NFL" in blob or "NFLGAME" in blob or "SUPERBOWL" in blob:
        return "nfl"
    if "NCAAF" in blob or "CFB" in blob:
        return "ncaaf"
    if "NHL" in blob or "NHLGAME" in blob or "KHL" in blob or "SHL" in blob or "AHL" in blob:
        return "nhl"
    if "MLB" in blob or "MLBGAME" in blob or "NPB" in blob or "KBO" in blob:
        return "mlb"
    if "MLS" in blob or "MLSGAME" in blob:
        return "mls"
    if any(
        x in blob
        for x in (
            "SOCCER",
            "EPL",
            "UCL",
            "LALIGA",
            "BUNDESLIGA",
            "SERIEA",
            "FIFA",
            "CONCACAF",
            "CONMEBOL",
            "UECL",
            "UEL",
            "SAUDIPL",
        )
    ):
        return "soccer"
    return "generic"


def _regulation_segments(sport: SportCode) -> tuple[int, int] | None:
    """(segment_count, seconds_per_segment) for clock-based regulation models."""
    if sport == "nba":
        return (4, 12 * 60)
    if sport == "wnba":
        return (4, 10 * 60)
    if sport in ("cbb",):
        return (2, 20 * 60)
    if sport in ("nfl", "ncaaf"):
        return (4, 15 * 60)
    if sport == "nhl":
        return (3, 20 * 60)
    if sport == "mls":
        return (2, 45 * 60)
    if sport == "soccer":
        return (2, 45 * 60)
    return None


def _extract_period_index(flat: dict[str, Any], sport: SportCode) -> int | None:
    q = _get_first_int(
        flat,
        (
            "quarter",
            "period",
            "current_period",
            "period_number",
            "period_index",
        ),
    )
    if q is not None and q >= 1:
        return q
    inn = _get_first_int(flat, ("inning", "current_inning"))
    if inn is not None and inn >= 1:
        return inn
    half = _get_first_int(flat, ("half", "period_half"))
    if half is not None and 1 <= half <= 2 and sport in ("cbb", "ncaaf", "soccer", "mls"):
        return half
    minute = _get_first_int(flat, ("minute", "match_minute", "game_minute"))
    if minute is not None and sport in ("soccer", "mls"):
        return 1 if minute <= 45 else 2
    return None


def _extract_segment_remaining_seconds(flat: dict[str, Any]) -> int | None:
    for k in (
        "period_seconds_remaining",
        "seconds_remaining_in_period",
        "time_remaining_in_period_seconds",
        "quarter_seconds_remaining",
        "half_seconds_remaining",
        "segment_seconds_remaining",
        "seconds_remaining",
        "clock_seconds_remaining",
    ):
        n = _as_int(flat.get(k))
        if n is not None and n >= 0:
            return n
    for k in ("game_clock", "clock", "period_clock", "time_remaining", "display_clock"):
        s = _get_first_str(flat, (k,))
        if s and (sec := _parse_mmss_clock(s)) is not None:
            return sec
    return None


def _extract_regulation_minutes_soccer(flat: dict[str, Any]) -> int | None:
    return _get_first_int(flat, ("minute", "match_minute", "game_minute"))


def _extract_inning_half_top(flat: dict[str, Any]) -> bool | None:
    raw = flat.get("inning_half") or flat.get("half_inning")
    if isinstance(raw, str):
        low = raw.lower()
        if "top" in low:
            return True
        if "bottom" in low or "bot" in low:
            return False
    return None


def _finished_ratio_mlb(flat: dict[str, Any]) -> float | None:
    inn = _get_first_int(flat, ("inning", "current_inning"))
    if inn is None or inn < 1:
        return None
    top = _extract_inning_half_top(flat)
    frac = float(inn - 1) / 9.0
    if top is True:
        frac += 0.5 / 9.0
    elif top is False:
        frac += 1.0 / 9.0
    else:
        frac += 0.25 / 9.0
    return max(0.0, min(1.0, frac))


def _finished_ratio_clock_sport(
    sport: SportCode,
    period_idx: int | None,
    seg_remaining: int | None,
    flat: dict[str, Any],
) -> float | None:
    tpl = _regulation_segments(sport)
    if tpl is None:
        return None
    n_seg, seg_len = tpl
    if period_idx is None or period_idx < 1:
        return None
    if period_idx > n_seg:
        return 1.0
    rem = seg_remaining
    if rem is None:
        rem = _extract_segment_remaining_seconds(flat)
    if rem is None or rem < 0:
        return None
    elapsed_in_seg = max(0, seg_len - min(rem, seg_len))
    prev = period_idx - 1
    total_reg = n_seg * seg_len
    elapsed = prev * seg_len + elapsed_in_seg
    return max(0.0, min(1.0, elapsed / float(total_reg)))


def _finished_ratio_soccer(flat: dict[str, Any], sport: SportCode) -> float | None:
    if sport not in ("soccer", "mls"):
        return None
    minute = _extract_regulation_minutes_soccer(flat)
    if minute is None or minute < 0:
        return None
    if minute > 90:
        return 1.0
    return max(0.0, min(1.0, minute / 90.0))


def _collect_statistics(flat: dict[str, Any]) -> dict[str, str | int | float]:
    """Small primitive snapshot for UI / analytics (keys vary by sport)."""
    out: dict[str, str | int | float] = {}
    priority_keys = (
        "home_score",
        "away_score",
        "score_home",
        "score_away",
        "home_team_score",
        "away_team_score",
        "down",
        "distance",
        "yards_to_go",
        "balls",
        "strikes",
        "outs",
        "on_first",
        "on_second",
        "on_third",
        "possession",
    )
    for k in priority_keys:
        if k in flat and k not in out:
            v = flat[k]
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                fv = float(v)
                out[k] = int(fv) if fv == int(fv) else fv
            elif isinstance(v, str) and v.strip():
                out[k] = v.strip()[:120]
        if len(out) >= 16:
            break
    if len(out) < 20:
        skip = {"status", "widget_status", "product_details"}
        for k, v in flat.items():
            if k in out or k in skip or k.startswith("product_details."):
                continue
            if isinstance(v, bool):
                continue
            if isinstance(v, (int, float)):
                if isinstance(v, float) and v != v:
                    continue
                out[str(k)[:64]] = v
            elif isinstance(v, str) and len(v) <= 120 and v.strip():
                out[str(k)[:64]] = v.strip()
            if len(out) >= 20:
                break
    return out


def _timers(
    sport: SportCode,
    period_idx: int | None,
    seg_remaining: int | None,
    flat: dict[str, Any],
    finished_ratio: float | None,
) -> dict[str, Any]:
    tpl = _regulation_segments(sport)
    seg_rem = seg_remaining
    if seg_rem is None:
        seg_rem = _extract_segment_remaining_seconds(flat)
    total_reg_sec: int | None
    elapsed_reg_sec: int | None
    remaining_reg_sec: int | None
    if tpl is not None and finished_ratio is not None:
        n_seg, seg_len = tpl
        total_reg_sec = n_seg * seg_len
        elapsed_reg_sec = int(round(finished_ratio * total_reg_sec))
        remaining_reg_sec = max(0, total_reg_sec - elapsed_reg_sec)
    else:
        total_reg_sec = tpl[0] * tpl[1] if tpl else None
        elapsed_reg_sec = _get_first_int(
            flat,
            ("elapsed_seconds", "game_elapsed_seconds", "seconds_elapsed", "time_elapsed_seconds"),
        )
        remaining_reg_sec = _get_first_int(
            flat,
            (
                "remaining_seconds",
                "game_remaining_seconds",
                "seconds_remaining_in_regulation",
                "regulation_seconds_remaining",
            ),
        )
        if (
            elapsed_reg_sec is None
            and remaining_reg_sec is None
            and total_reg_sec is not None
            and finished_ratio is not None
        ):
            elapsed_reg_sec = int(round(finished_ratio * total_reg_sec))
            remaining_reg_sec = max(0, total_reg_sec - elapsed_reg_sec)
    clock_display = _get_first_str(
        flat,
        ("game_clock", "clock", "period_clock", "display_clock", "time_remaining"),
    )
    return {
        "period_index": period_idx,
        "segment_seconds_remaining": seg_rem,
        "regulation_total_seconds": total_reg_sec,
        "regulation_elapsed_seconds": elapsed_reg_sec,
        "regulation_remaining_seconds": remaining_reg_sec,
        "clock_display": clock_display,
    }


def _kalshi_in_play(details: dict[str, Any]) -> bool:
    st = _norm_str(details.get("status"))
    ws = _norm_str(details.get("widget_status"))
    if st is None or ws is None:
        return False
    return st.lower() == "live" and ws.lower() == "live"


def game_progress_from_live_data(
    live_data: dict[str, Any] | None,
    *,
    series_ticker: str,
    now: datetime | None = None,
) -> dict[str, Any] | None:
    """Return structured progress for a calendar row, or ``None`` when not in-play / unusable."""
    if not isinstance(live_data, dict):
        return None
    details = live_data.get("details")
    if not isinstance(details, dict):
        return None
    if not _kalshi_in_play(details):
        return None
    now = now or datetime.now(timezone.utc)
    _ = now  # reserved for future wall-clock estimates when API omits timers

    flat = _flatten_details_for_lookup(details)
    ld_type = _norm_str(live_data.get("type"))
    sport = infer_sport_code(series_ticker, ld_type)
    period_idx = _extract_period_index(flat, sport)
    seg_rem = _extract_segment_remaining_seconds(flat)

    finished_ratio: float | None = None
    if sport == "mlb":
        finished_ratio = _finished_ratio_mlb(flat)
    elif sport in ("soccer", "mls"):
        finished_ratio = _finished_ratio_soccer(flat, sport) or _finished_ratio_clock_sport(
            sport, period_idx, seg_rem, flat
        )
    else:
        finished_ratio = _finished_ratio_clock_sport(sport, period_idx, seg_rem, flat)

    timers = _timers(sport, period_idx, seg_rem, flat, finished_ratio)
    statistics = _collect_statistics(flat)

    return {
        "sport": sport,
        "kalshi_live_data_type": ld_type,
        "finished_ratio": finished_ratio,
        "timers": timers,
        "statistics": statistics,
    }
