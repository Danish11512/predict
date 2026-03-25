"""Scrape LIVE market tiles from the sports category page."""
import logging
import re
from urllib.parse import urlparse
from selenium.webdriver.common.by import By

LOG = logging.getLogger(__name__)

TILE_SELECTOR = "[data-testid='market-tile']"


def _text(el) -> str:
    """Return element text or empty string."""
    try:
        return (el.text or "").strip()
    except Exception:
        return ""


def _int_attr(el, attr: str, default: int | None = None) -> int | None:
    """Get integer from element attribute (e.g. aria-valuenow)."""
    try:
        v = el.get_attribute(attr)
        if v is None:
            return default
        return int(v)
    except (TypeError, ValueError):
        return default


def _parse_tile(tile) -> dict | None:
    """Extract game dict from a LIVE market-tile element. Returns None on failure."""
    try:
        title = ""
        title_el = tile.find_elements(By.CSS_SELECTOR, "h2")
        if title_el:
            title = _text(title_el[0])

        market_href = None
        link_el = tile.find_elements(By.CSS_SELECTOR, "a[href^='/markets/']")
        if link_el:
            href = link_el[0].get_attribute("href")
            if href and href.startswith("http"):
                market_href = urlparse(href).path
            else:
                market_href = href

        full_text = _text(tile)
        status = "LIVE" if "LIVE" in full_text else None
        game_clock = None
        if "LIVE" in full_text:
            # Heuristic: look for clock-like pattern (e.g. "2ND - 00:00" or "HALF - 00:00")
            m = re.search(r"(\d+(?:ST|ND|RD|TH)\s*-\s*[\d:]+|HALF\s*-\s*[\d:]+)", full_text, re.I)
            if m:
                game_clock = m.group(1).strip()

        # Build up to 4 outcomes; first two also exposed as team_a/team_b for backward compatibility.
        # Score and team/outcome image_url: not yet scraped; DOM selectors for visible score or img src can be added here later; frontend uses Avatar fallback until then.
        progress_bars = tile.find_elements(By.CSS_SELECTOR, "[role='progressbar'], [aria-valuenow]")
        team_rows = tile.find_elements(By.CSS_SELECTOR, "[class*='team'], tr, [class*='outcome']")
        outcomes: list[dict] = []
        if team_rows:
            for i, row in enumerate(team_rows[:4]):
                o: dict = {"name": None, "win_pct": None, "price": None}
                o["name"] = _text(row)
                bar = row.find_elements(By.CSS_SELECTOR, "[aria-valuenow]")
                if bar:
                    o["win_pct"] = _int_attr(bar[0], "aria-valuenow")
                btns = row.find_elements(By.CSS_SELECTOR, "button span, [class*='price']")
                for b in btns:
                    txt = _text(b)
                    if re.match(r"^\d+$", txt):
                        o["price"] = int(txt)
                        break
                outcomes.append(o)
        elif progress_bars:
            for i, bar in enumerate(progress_bars[:4]):
                parent = bar.find_element(By.XPATH, "./..")
                o: dict = {"name": None, "win_pct": None, "price": None}
                o["win_pct"] = _int_attr(bar, "aria-valuenow")
                o["name"] = _text(parent) or _text(bar)
                outcomes.append(o)
        team_a = outcomes[0] if len(outcomes) > 0 else {"name": None, "win_pct": None, "price": None}
        team_b = outcomes[1] if len(outcomes) > 1 else {"name": None, "win_pct": None, "price": None}

        volume_raw = None
        if "vol" in full_text.lower():
            m = re.search(r"(\$[\d,]+(?:\.\d+)?[KMB]?\s*vol)", full_text, re.I)
            if m:
                volume_raw = m.group(1).strip()

        markets_count = None
        if "market" in full_text.lower():
            m = re.search(r"(\d+)\s*markets?", full_text, re.I)
            if m:
                markets_count = f"{m.group(1)} markets"

        return {
            "title": title or None,
            "market_href": market_href,
            "status": status,
            "game_clock": game_clock,
            "team_a": team_a,
            "team_b": team_b,
            "outcomes": outcomes,
            "volume_raw": volume_raw,
            "markets_count": markets_count,
        }
    except Exception as e:
        LOG.warning("Failed to parse market tile: %s", e, exc_info=False)
        return None


def get_live_games(driver) -> list[dict]:
    """
    Find all [data-testid="market-tile"] elements, keep only those whose text contains "LIVE",
    extract fields per tile, and return a list of game dicts.
    Per-tile exceptions are logged and that tile is skipped (no partial data appended).
    """
    out: list[dict] = []
    try:
        tiles = driver.find_elements(By.CSS_SELECTOR, TILE_SELECTOR)
    except Exception as e:
        LOG.warning("Failed to find market tiles: %s", e)
        return out
    for tile in tiles:
        try:
            if "LIVE" not in _text(tile):
                continue
        except Exception:
            continue
        parsed = _parse_tile(tile)
        if parsed is not None:
            out.append(parsed)
    return out
