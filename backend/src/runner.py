"""Orchestrate: create driver, login, navigate to sports, poll live games and optionally notify via callback."""
from __future__ import annotations

import sys
import threading
import time
from collections.abc import Callable

from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import config
import driver as driver_mod
import auth
import sports
import state
import utils

SPORTS_CATEGORY_PATH = "/category/sports/all-sports"
SPORTS_TILE_WAIT = 20


def run(
    on_payload: Callable[[dict], None] | None = None,
    stop_event: threading.Event | None = None,
) -> None:
    drv = driver_mod.create_driver()
    try:
        print(f"Opening Kalshi site {config.kalshi_public_url}", file=sys.stderr)
        drv.get(config.kalshi_public_url)
        utils.step_delay()
        try:
            if not auth.login(drv, stop_event=stop_event):
                print("Login failed.", file=sys.stderr)
                sys.exit(1)
        except state.ShutdownRequested:
            print("Shutdown requested during login.", file=sys.stderr)
            return
        print("Login succeeded.", file=sys.stderr)
        sports_url = config.kalshi_public_url.rstrip("/") + SPORTS_CATEGORY_PATH
        print("Navigating to /category/sports/all-sports", file=sys.stderr)
        drv.get(sports_url)
        utils.step_delay()
        try:
            WebDriverWait(drv, SPORTS_TILE_WAIT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, sports.TILE_SELECTOR))
            )
        except Exception:
            print("Sports page did not load", file=sys.stderr)
            state.enqueue_error("no_games", "Sports page did not load")
            time.sleep(1)
            sys.exit(1)
        state.enqueue_progress(100)
        while stop_event is None or not stop_event.is_set():
            try:
                games = sports.get_live_games(drv)
            except Exception as e:
                print(f"Scrape error: {e}", file=sys.stderr)
                if stop_event is not None and stop_event.wait(timeout=config.live_games_poll_sec):
                    break
                elif stop_event is None:
                    time.sleep(config.live_games_poll_sec)
                continue
            payload = {
                "updated_utc": datetime.utcnow().isoformat() + "Z",
                "games": games,
            }
            if on_payload is not None:
                on_payload(payload)
            if stop_event is not None:
                if stop_event.wait(timeout=config.live_games_poll_sec):
                    break
            else:
                time.sleep(config.live_games_poll_sec)
    finally:
        try:
            drv.quit()
        except Exception:
            pass
        print("Runner stopped, driver closed.", file=sys.stderr)

