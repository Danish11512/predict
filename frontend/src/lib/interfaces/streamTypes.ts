/** SSE stream event shapes (matches backend GET /stream). */

export type StreamRequestEvent = {
	request_id: string
	prompt: string
	field: string | null
}

export type StreamProgressEvent = {
	percent: number
}

export type StreamErrorEvent = {
	code: string
	message: string
}

/** GET /live-games and SSE `data` payload (backend runner / state). */
export type LiveGamesPayload = {
	updated_utc: string | null
	games: GameRecord[]
}

/** DOM-only fields from the sports page tile (clock text, href, heuristic outcomes). */
export type ScrapedGameTile = {
	title?: string | null
	market_href?: string | null
	status?: string | null
	game_clock?: string | null
	team_a?: TeamOutcome
	team_b?: TeamOutcome
	outcomes?: TeamOutcome[]
	volume_raw?: string | null
	markets_count?: string | null
}

/** Whitelisted Kalshi event fields from Trade API `GET /events/{ticker}`. */
export type TradeEventSnapshot = {
	event_ticker?: string | null
	series_ticker?: string | null
	title?: string | null
	sub_title?: string | null
	category?: string | null
	mutually_exclusive?: boolean | null
	available_on_brokers?: boolean | null
	collateral_return_type?: string | null
	product_metadata?: Record<string, unknown> | null
	last_updated_ts?: string | null
}

/** Whitelisted Kalshi market snapshot (nested markets on event). */
export type TradeMarketSnapshot = Record<string, string | number | boolean | null | unknown[] | Record<string, unknown>>

export type GameRecord = {
	scraped: ScrapedGameTile
	event: TradeEventSnapshot | null
	markets: TradeMarketSnapshot[]
}

export type TeamOutcome = {
	name?: string | null
	win_pct?: number | null
	price?: number | null
}

