/** SSE stream event shapes (matches backend GET /stream). */

export type StreamRequestEvent = {
	request_id: string;
	prompt: string;
	field: string | null;
};

export type StreamProgressEvent = {
	percent: number;
};

export type StreamErrorEvent = {
	code: string;
	message: string;
};

/** GET /live-games and SSE `data` payload (backend runner / state). */
export type LiveGamesPayload = {
	updated_utc: string | null;
	games: GameRecord[];
};

export type GameRecord = {
	title?: string | null;
	market_href?: string | null;
	status?: string | null;
	game_clock?: string | null;
	team_a?: TeamOutcome;
	team_b?: TeamOutcome;
	outcomes?: TeamOutcome[];
	volume_raw?: string | null;
	markets_count?: string | null;
};

export type TeamOutcome = {
	name?: string | null;
	win_pct?: number | null;
	price?: number | null;
};
