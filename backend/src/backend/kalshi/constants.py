"""Shared Kalshi tuning literals (limits, public URLs, classification sets)."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

# Public Kalshi v1 API (unauthenticated card_feed, live_data, etc.)
KALSHI_V1_PUBLIC_BASE_URL = "https://api.elections.kalshi.com/v1"

# --- calendar-live snapshot ---

DEFAULT_CALENDAR_LIVE_MAX_EVENTS = 10

# Browser→backend poll dedupe: full sports payload refresh at most this often.
CALENDAR_LIVE_SPORTS_HTTP_CACHE_TTL_SEC = 5.0

KALSHI_CAL_META_SPORTS_CARD_FEED: dict[str, Any] = {
    "matches_kalshi_com_calendar_sports_strip": True,
    "pipeline": "live_data_card_feed_category_sports",
    "for_website_sports_live_strip_use": None,
    "note": (
        "Ordered like GET /v1/live_data/card_feed?category=Sports (same strip as the website when this path is used)."
    ),
}
KALSHI_CAL_META_SPORTS_AGGREGATION: dict[str, Any] = {
    "matches_kalshi_com_calendar_sports_strip": False,
    "pipeline": "milestone_scored_aggregation_sports_filter",
    "for_website_sports_live_strip_use": "GET /calendar-live (retry for card_feed)",
    "note": (
        "card_feed failed; sports rows come from milestone aggregation — compare parity.* to aggregation top N, "
        "not the website ordering."
    ),
}

EVENTS_PAGE_LIMIT = 200
MILESTONES_LIMIT = 500
EVENT_LIST_MAX_PAGES = 2
MILESTONE_LIST_MAX_PAGES = 2
PRIMARY_LIVE_HYDRATE_MAX = 40
MILESTONE_END_GRACE = timedelta(hours=8)
# Sports path can touch hundreds of unique series; each kalshi_get uses its own client — cap concurrency.
SERIES_FETCH_CONCURRENCY = 16

# When no open events but milestones exist, sample this many milestone tickers for hydration.
MILESTONE_TICKER_FALLBACK_SAMPLE = 40

# card_feed pagination (max outer iterations)
CARD_FEED_MAX_PAGES = 3

# Sports-only aggregation pool sizing in finalize_sports_calendar_from_aggregation
SPORTS_AGGREGATION_POOL_MIN_ROWS = 80
SPORTS_AGGREGATION_POOL_ME_MULTIPLIER = 40
SPORTS_AGGREGATION_POOL_MAX_TICKERS = 400

# --- sports classification ---

DEFAULT_SPORTS_SERIES_PREFIXES: frozenset[str] = frozenset(
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

SPORTS_CATEGORY_HINTS: frozenset[str] = frozenset(
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

NON_SPORTS_CATEGORIES: frozenset[str] = frozenset(
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

METADATA_SPORTS_RE = re.compile(
    r"\b(nba|nfl|mlb|nhl|mls|wnba|ncaa|pga|lpga|ufc|mma|"
    r"premier league|champions league|soccer|f1|formula|nascar|tennis|olympics?)\b",
    re.I,
)


def parse_iso_utc(val: object) -> datetime | None:
    """Parse ISO-8601 string or numeric timestamp → UTC-aware ``datetime``.

    Handles ``Z`` suffix, missing tzinfo ⇒ UTC, and int/float as Unix timestamps.
    Returns ``None`` for empty/missing/unparsable values.
    """
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
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    return None
