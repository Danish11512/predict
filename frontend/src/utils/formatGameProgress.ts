import type { GameProgressV1 } from '@typings/calendarLiveTypes'

const SCORE_STAT_KEYS = new Set([
  'home_score',
  'away_score',
  'home_points',
  'away_points',
  'score_home',
  'score_away',
  'home_team_score',
  'away_team_score',
])

/** Wall / shot clock style: `m:ss`, or longer human-readable when needed. */
export function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) {
    return '—'
  }
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}h ${mm}m ${s}s`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

// --- Compact live clock (beside LIVE label) ---------------------------------

export type LiveClockInlineResult = {
  /** Muted text beside LIVE (may include em dash). */
  clockVisual: string
  /** Single phrase for the live row `aria-label`. */
  ariaLabel: string
}

const MMSS_CLOCK = /^\s*(\d{1,2}):(\d{2})\s*$/

const AGREEMENT_SLACK_SEC = 1

/** Parse leading MM:SS substring from Kalshi clock strings (matches backend `_parse_mmss_clock`). */
function parseMmssClockSeconds(raw: string): number | null {
  const m = MMSS_CLOCK.exec(raw.trim())
  if (!m) {
    return null
  }
  const mm = Number.parseInt(m[1]!, 10)
  const ss = Number.parseInt(m[2]!, 10)
  if (ss >= 60) {
    return null
  }
  return mm * 60 + ss
}

function formatLivePeriodPrefix(sportRaw: string, periodIndex: number | null): string | null {
  if (periodIndex == null || periodIndex < 1) {
    return null
  }
  const s = sportRaw.toLowerCase()
  if (s === 'nba' || s === 'wnba') {
    if (periodIndex <= 4) {
      return `Q${periodIndex}`
    }
    return periodIndex === 5 ? 'OT' : `OT${periodIndex - 4}`
  }
  if (s === 'nfl' || s === 'ncaaf') {
    if (periodIndex <= 4) {
      return `Q${periodIndex}`
    }
    return periodIndex === 5 ? 'OT' : `OT${periodIndex - 4}`
  }
  if (s === 'nhl') {
    if (periodIndex <= 3) {
      return `P${periodIndex}`
    }
    return periodIndex === 4 ? 'OT' : `OT${periodIndex - 3}`
  }
  if (s === 'cbb') {
    if (periodIndex <= 2) {
      return `H${periodIndex}`
    }
    return periodIndex === 3 ? 'OT' : `OT${periodIndex - 2}`
  }
  if (s === 'mlb') {
    return `Inn ${periodIndex}`
  }
  if (s === 'soccer' || s === 'mls') {
    if (periodIndex <= 2) {
      return periodIndex === 1 ? '1H' : '2H'
    }
    return periodIndex === 3 ? 'ET' : `ET${periodIndex - 2}`
  }
  if (periodIndex <= 4) {
    return `Q${periodIndex}`
  }
  return `OT${periodIndex - 4}`
}

function floorSegmentSecondsRemaining(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw < 0) {
    return null
  }
  return Math.floor(raw)
}

function trimClockDisplay(clockDisplay: unknown): string {
  if (typeof clockDisplay !== 'string') {
    return ''
  }
  return clockDisplay.trim()
}

function liveClockSegmentFallbackBody(periodPrefix: string | null, seg: number): string {
  const prefix = periodPrefix != null ? `${periodPrefix} · ` : ''
  return `${prefix}Segment Seconds Remaining ${formatSeconds(seg)}`
}

function resolveLiveClockTimePart(
  agree: boolean,
  seg: number | null,
  clockRaw: string,
  parsedClock: number | null,
): string | null {
  if (agree && seg != null) {
    return formatSeconds(seg)
  }
  if (clockRaw) {
    if (parsedClock != null) {
      return formatSeconds(parsedClock)
    }
    return clockRaw
  }
  return null
}

function combinePeriodPrefixAndTime(periodPrefix: string | null, timePart: string | null): string {
  if (periodPrefix != null && timePart != null) {
    return `${periodPrefix} ${timePart}`
  }
  if (timePart != null) {
    return timePart
  }
  if (periodPrefix != null) {
    return periodPrefix
  }
  return '—'
}

/**
 * Compact live clock for display beside LIVE: e.g. `Q3 4:32`, segment fallback, or em dash.
 */
export function liveClockInline(gp: GameProgressV1 | null | undefined): LiveClockInlineResult {
  if (gp == null) {
    return {
      clockVisual: '—',
      ariaLabel: 'Live. Game clock unavailable.',
    }
  }

  const t = gp.timers
  const sport = gp.sport ?? 'generic'
  const periodPrefix = formatLivePeriodPrefix(sport, t.period_index ?? null)
  const seg = floorSegmentSecondsRemaining(t.segment_seconds_remaining)
  const clockRaw = trimClockDisplay(t.clock_display)
  const parsedClock = clockRaw ? parseMmssClockSeconds(clockRaw) : null

  const agree =
    seg != null && parsedClock != null && Math.abs(seg - parsedClock) <= AGREEMENT_SLACK_SEC

  if (!clockRaw && seg != null) {
    const body = liveClockSegmentFallbackBody(periodPrefix, seg)
    return {
      clockVisual: body,
      ariaLabel: `Live. ${body}`,
    }
  }

  const timePart = resolveLiveClockTimePart(agree, seg, clockRaw, parsedClock)
  const clockVisual = combinePeriodPrefixAndTime(periodPrefix, timePart)

  return {
    clockVisual,
    ariaLabel: clockVisual === '—' ? 'Live. Game clock unavailable.' : `Live. ${clockVisual}`,
  }
}

// --- Verbose explorer lines -------------------------------------------------

/** Human-readable lines for home + explorer (omits empty fragments). */
export function gameProgressDisplayLines(gp: GameProgressV1): string[] {
  const lines: string[] = []
  const pd = gp.product_details
  if (pd != null && typeof pd === 'object' && 'title' in pd && pd.title != null) {
    lines.push(String(pd.title))
  }
  const sc = gp.scores
  if (sc != null && (sc.home != null || sc.away != null)) {
    const h = sc.home != null ? String(sc.home) : '—'
    const a = sc.away != null ? String(sc.away) : '—'
    lines.push(`Score ${h}–${a}`)
  }
  const t = gp.timers
  if (gp.finished_ratio != null && Number.isFinite(gp.finished_ratio)) {
    lines.push(`Regulation ~${Math.round(gp.finished_ratio * 100)}% complete`)
  }
  if (t.period_index != null) {
    lines.push(`Segment ${t.period_index}`)
  }
  if (t.clock_display) {
    lines.push(`Clock ${t.clock_display}`)
  }
  if (t.segment_seconds_remaining != null) {
    lines.push(`Time left in segment ${formatSeconds(t.segment_seconds_remaining)}`)
  }
  if (t.regulation_elapsed_seconds != null) {
    lines.push(`Elapsed (reg) ${formatSeconds(t.regulation_elapsed_seconds)}`)
  }
  if (t.regulation_remaining_seconds != null) {
    lines.push(`Remaining (reg) ${formatSeconds(t.regulation_remaining_seconds)}`)
  }
  const stats = gp.statistics
  const omitScoreDupes = sc != null && (sc.home != null || sc.away != null)
  const keys = Object.keys(stats).filter((k) => !(omitScoreDupes && SCORE_STAT_KEYS.has(k)))
  if (keys.length > 0) {
    const parts = keys.slice(0, 8).map((k) => `${k}: ${String(stats[k])}`)
    lines.push(`Stats · ${parts.join(' · ')}`)
  }
  return lines
}
