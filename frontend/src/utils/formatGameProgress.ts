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

// --- Pills UI helpers --------------------------------------------------------

export type GamePillsInfo = {
  liveLabel: string
  /** e.g. "72%" for progress, or "OT" for overtime */
  pctOrOt: string | null
  /** e.g. "Q3 4:32" or "3RD - 6:35" */
  positionTime: string | null
  /** Elapsed regulation time formatted */
  elapsedDisplay: string | null
  /** Compact stats string (unique, no score dupes) */
  statsDisplay: string | null
  /** Last play from product_details */
  lastPlayDisplay: string | null
}

const LAST_PLAY_KEYS = new Set(['last_play', 'last_event', 'description', 'summary', 'last_action'])

export function getGamePillsInfo(gp: GameProgressV1): GamePillsInfo {
  const clock = liveClockInline(gp)
  const isNoData = gp.strategy === 'none' || gp.strategy == null
  const pct =
    gp.finished_ratio != null && Number.isFinite(gp.finished_ratio)
      ? Math.round(gp.finished_ratio * 100)
      : null
  const isOt = gp.progress_warning === 'Overtime'
  // Show "0%" when no data so user always sees something
  const pctOrOt = isOt ? 'OT' : pct != null ? `${pct}%` : isNoData ? '0%' : null

  // Elapsed regulation seconds (clock sports) or elapsed-since-start (universal)
  const elapsedReg =
    gp.timers.regulation_elapsed_seconds != null &&
    Number.isFinite(gp.timers.regulation_elapsed_seconds)
      ? formatSeconds(gp.timers.regulation_elapsed_seconds)
      : null
  const elapsedWall =
    gp.timers.elapsed_since_start_seconds != null &&
    Number.isFinite(gp.timers.elapsed_since_start_seconds)
      ? formatSeconds(gp.timers.elapsed_since_start_seconds)
      : null
  // Prefer regulation elapsed for clock sports, else wall clock for period-only/temporal
  // Show "0:00" fallback when no data
  const elapsedDisplay =
    elapsedReg ?? (gp.strategy === 'clock' ? null : elapsedWall) ?? (isNoData ? '0:00' : null)

  const sc = gp.scores
  const omitScoreDupes = sc != null && (sc.home != null || sc.away != null)
  const keys = Object.keys(gp.statistics).filter((k) => !(omitScoreDupes && SCORE_STAT_KEYS.has(k)))
  const statsDisplay =
    keys.length > 0
      ? keys
          .slice(0, 5)
          .map((k) => `${k}: ${String(gp.statistics[k])}`)
          .join(' | ')
      : null
  const pd = gp.product_details
  let lastPlayDisplay: string | null = null
  if (pd && typeof pd === 'object') {
    const pdObj = pd as Record<string, unknown>
    for (const k of LAST_PLAY_KEYS) {
      const v = pdObj[k]
      if (typeof v === 'string' && v.trim()) {
        lastPlayDisplay = v.trim()
        break
      }
    }
  }
  return {
    liveLabel: 'LIVE',
    pctOrOt,
    positionTime: clock.clockVisual !== '—' ? clock.clockVisual : null,
    elapsedDisplay,
    statsDisplay,
    lastPlayDisplay,
  }
}

// --- Compact live clock (beside LIVE label) [kept for above] -----------------

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

function formatLivePeriodPrefix(
  sportRaw: string,
  periodIndex: number | null,
  totalPeriods: number | null,
): string | null {
  if (periodIndex == null || periodIndex < 1) {
    return null
  }
  const s = sportRaw.toLowerCase()
  const suf = totalPeriods != null && totalPeriods > 0 ? `/${totalPeriods}` : ''

  if (s === 'nba' || s === 'wnba') {
    if (periodIndex <= 4) {
      return `Q${periodIndex}${suf}`
    }
    return periodIndex === 5 ? 'OT' : `OT${periodIndex - 4}`
  }
  if (s === 'nfl' || s === 'ncaaf') {
    if (periodIndex <= 4) {
      return `Q${periodIndex}${suf}`
    }
    return periodIndex === 5 ? 'OT' : `OT${periodIndex - 4}`
  }
  if (s === 'nhl') {
    if (periodIndex <= 3) {
      return `P${periodIndex}${suf}`
    }
    return periodIndex === 4 ? 'OT' : `OT${periodIndex - 3}`
  }
  if (s === 'cbb') {
    if (periodIndex <= 2) {
      return `H${periodIndex}${suf}`
    }
    return periodIndex === 3 ? 'OT' : `OT${periodIndex - 2}`
  }
  if (s === 'mlb') {
    return `Inn ${periodIndex}${suf}`
  }
  if (s === 'soccer' || s === 'mls') {
    if (periodIndex <= 2) {
      return periodIndex === 1 ? '1H' : '2H'
    }
    return periodIndex === 3 ? 'ET' : `ET${periodIndex - 2}`
  }
  // Period-only sports
  if (s === 'tennis') {
    return `Set ${periodIndex}${suf}`
  }
  if (s === 'golf') {
    return `Rd ${periodIndex}${suf}`
  }
  if (s === 'racing') {
    return `Lap ${periodIndex}${suf}`
  }
  if (s === 'cricket') {
    if (periodIndex <= 2) {
      return `Inn ${periodIndex}${suf}`
    }
    return `Over ${periodIndex}`
  }
  if (s === 'fighting') {
    return `Rd ${periodIndex}${suf}`
  }
  if (s === 'darts') {
    return `Leg ${periodIndex}${suf}`
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
  const periodPrefix = formatLivePeriodPrefix(
    sport,
    t.period_index ?? null,
    t.total_periods ?? null,
  )
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
