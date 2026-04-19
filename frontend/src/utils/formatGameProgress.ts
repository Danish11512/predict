import type { GameProgressV1 } from '@typings/calendarLiveTypes'

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
  const keys = Object.keys(stats)
  if (keys.length > 0) {
    const parts = keys.slice(0, 8).map((k) => `${k}: ${String(stats[k])}`)
    lines.push(`Stats · ${parts.join(' · ')}`)
  }
  return lines
}
