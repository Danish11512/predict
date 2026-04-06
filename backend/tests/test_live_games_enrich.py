"""Unit tests for live game ticker parsing and Trade API merge helpers."""
from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

_src = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(_src))

# live_games_enrich imports config (dotenv); tests run without venv deps.
_mock_config = types.SimpleNamespace(
    kalshi_trade_api_base="https://api.elections.kalshi.com/trade-api/v2",
    kalshi_trade_timeout_sec=15.0,
    kalshi_trade_max_concurrent=4,
    kalshi_trade_max_attempts=4,
)
sys.modules["config"] = _mock_config

import live_games_enrich  # noqa: E402


class TestTickerParsing(unittest.TestCase):
    def test_market_ticker_from_href(self) -> None:
        self.assertEqual(
            live_games_enrich.market_ticker_from_href("/markets/KXMARMAD-26-MICH"),
            "KXMARMAD-26-MICH",
        )
        self.assertEqual(
            live_games_enrich.market_ticker_from_href("/markets/KXMARMAD-26-MICH/"),
            "KXMARMAD-26-MICH",
        )
        self.assertIsNone(live_games_enrich.market_ticker_from_href(None))
        self.assertIsNone(live_games_enrich.market_ticker_from_href("/events/foo"))

    def test_event_ticker_from_market_ticker(self) -> None:
        self.assertEqual(
            live_games_enrich.event_ticker_from_market_ticker("KXMARMAD-26-MICH"),
            "KXMARMAD-26",
        )
        self.assertIsNone(live_games_enrich.event_ticker_from_market_ticker("SHORT"))


class TestNormalize(unittest.TestCase):
    def test_normalize_market_whitelist(self) -> None:
        raw = {
            "ticker": "T1",
            "title": "Yes",
            "last_price_dollars": "0.50",
            "noise": "drop",
        }
        self.assertEqual(
            live_games_enrich.normalize_market(raw),
            {"ticker": "T1", "title": "Yes", "last_price_dollars": "0.50"},
        )


class TestEnrichMerge(unittest.TestCase):
    def test_enrich_fetches_deduped_events(self) -> None:
        games = [
            {
                "title": "A",
                "market_href": "/markets/KXMARMAD-26-MICH",
                "status": "LIVE",
                "game_clock": None,
                "team_a": {},
                "team_b": {},
                "outcomes": [],
                "volume_raw": None,
                "markets_count": None,
            },
            {
                "title": "B",
                "market_href": "/markets/KXMARMAD-26-OTHER",
                "status": "LIVE",
                "game_clock": None,
                "team_a": {},
                "team_b": {},
                "outcomes": [],
                "volume_raw": None,
                "markets_count": None,
            },
        ]
        fake_event = {
            "event_ticker": "KXMARMAD-26",
            "series_ticker": "KXMARMAD",
            "title": "Game",
            "markets": [{"ticker": "KXMARMAD-26-MICH", "last_price_dollars": "0.1"}],
        }

        with patch(
            "live_games_enrich.kalshi_trade_client.fetch_event_with_nested_markets",
            return_value=fake_event,
        ) as fetch:
            out = live_games_enrich.enrich_games_with_trade_api(games)
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["event"]["title"], "Game")
        self.assertEqual(out[1]["markets"][0]["ticker"], "KXMARMAD-26-MICH")

    def test_scrape_only_when_no_href(self) -> None:
        games = [{"title": "X", "market_href": None}]
        out = live_games_enrich.enrich_games_with_trade_api(games)
        self.assertEqual(len(out), 1)
        self.assertIsNone(out[0]["event"])
        self.assertEqual(out[0]["scraped"]["title"], "X")


if __name__ == "__main__":
    unittest.main()
