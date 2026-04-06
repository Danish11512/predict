"""Merge sports-page scrape rows with Kalshi Trade API event + nested markets."""
from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import config
import kalshi_trade_client

LOG = logging.getLogger(__name__)

_MARKET_PATH = re.compile(r"^/markets/([^/?#]+)/?$")

EVENT_FIELD_KEYS = frozenset(
    {
        "event_ticker",
        "series_ticker",
        "title",
        "sub_title",
        "category",
        "mutually_exclusive",
        "available_on_brokers",
        "collateral_return_type",
        "product_metadata",
        "last_updated_ts",
    }
)

MARKET_FIELD_KEYS = frozenset(
    {
        "ticker",
        "event_ticker",
        "title",
        "yes_sub_title",
        "no_sub_title",
        "rules_primary",
        "rules_secondary",
        "last_price_dollars",
        "previous_price_dollars",
        "previous_yes_bid_dollars",
        "previous_yes_ask_dollars",
        "yes_bid_dollars",
        "yes_ask_dollars",
        "no_bid_dollars",
        "no_ask_dollars",
        "volume_fp",
        "volume_24h_fp",
        "open_interest_fp",
        "liquidity_dollars",
        "status",
        "open_time",
        "close_time",
        "created_time",
        "expiration_time",
        "expected_expiration_time",
        "latest_expiration_time",
        "result",
        "expiration_value",
        "settlement_ts",
        "settlement_timer_seconds",
        "settlement_value_dollars",
        "market_type",
        "tick_size",
        "notional_value_dollars",
        "price_ranges",
        "response_price_units",
        "can_close_early",
        "early_close_condition",
        "custom_strike",
        "fractional_trading_enabled",
        "price_level_structure",
    }
)


def market_ticker_from_href(market_href: str | None) -> str | None:
    if not market_href or not isinstance(market_href, str):
        return None
    m = _MARKET_PATH.match(market_href.strip())
    return m.group(1) if m else None


def event_ticker_from_market_ticker(market_ticker: str) -> str | None:
    parts = market_ticker.split("-")
    if len(parts) < 3:
        return None
    return f"{parts[0]}-{parts[1]}"


def _pick_keys(raw: dict[str, Any], allowed: frozenset[str]) -> dict[str, Any]:
    return {k: raw[k] for k in allowed if k in raw}


def normalize_event(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if not raw:
        return None
    out = _pick_keys(raw, EVENT_FIELD_KEYS)
    return out if out else None


def normalize_market(raw: dict[str, Any]) -> dict[str, Any]:
    return _pick_keys(raw, MARKET_FIELD_KEYS)


def scraped_tile_fields(game: dict[str, Any]) -> dict[str, Any]:
    """DOM-only fields preserved under `scraped`."""
    keys = (
        "title",
        "market_href",
        "status",
        "game_clock",
        "team_a",
        "team_b",
        "outcomes",
        "volume_raw",
        "markets_count",
    )
    return {k: game.get(k) for k in keys}


def games_scrape_only_shape(games: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """When Trade API is skipped or fails entirely, still emit the stable `{scraped, event, markets}` list."""
    return [{"scraped": scraped_tile_fields(g), "event": None, "markets": []} for g in games]


def enrich_games_with_trade_api(games: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    For each scrape row, attach `scraped`, optional `event`, and `markets` (Trade API snapshots).
    On API failure for an event, that row still has `scraped` and empty `markets` / null `event`.
    """
    if not games:
        return []

    event_to_indices: dict[str, list[int]] = {}
    index_to_event: dict[int, str] = {}
    for i, game in enumerate(games):
        mt = market_ticker_from_href(game.get("market_href"))
        if not mt:
            continue
        et = event_ticker_from_market_ticker(mt)
        if not et:
            continue
        event_to_indices.setdefault(et, []).append(i)
        index_to_event[i] = et

    event_payload: dict[str, dict[str, Any] | None] = {}
    unique_events = list(event_to_indices.keys())
    max_workers = min(len(unique_events), config.kalshi_trade_max_concurrent) or 1

    def fetch_one(et: str) -> tuple[str, dict[str, Any] | None]:
        try:
            raw = kalshi_trade_client.fetch_event_with_nested_markets(
                et,
                base_url=config.kalshi_trade_api_base,
                timeout_sec=config.kalshi_trade_timeout_sec,
                max_attempts=config.kalshi_trade_max_attempts,
            )
            return et, raw
        except Exception as e:
            LOG.warning("Trade API fetch failed for event %s: %s", et, e)
            return et, None

    if unique_events:
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            for et, raw_ev in ex.map(fetch_one, unique_events):
                event_payload[et] = raw_ev

    out: list[dict[str, Any]] = []
    for i, game in enumerate(games):
        scraped = scraped_tile_fields(game)
        et = index_to_event.get(i)
        raw_ev = event_payload.get(et) if et else None
        if raw_ev is None:
            out.append({"scraped": scraped, "event": None, "markets": []})
            continue
        nested = raw_ev.get("markets")
        markets_raw = nested if isinstance(nested, list) else []
        markets = [normalize_market(m) for m in markets_raw if isinstance(m, dict)]
        ev_norm = normalize_event(raw_ev)
        if ev_norm is None and markets:
            ev_norm = {"event_ticker": et, "title": None, "sub_title": None}
        out.append({"scraped": scraped, "event": ev_norm, "markets": markets})
    return out
