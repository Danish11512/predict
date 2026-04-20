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

function formatSeconds(sec: number): string {
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
