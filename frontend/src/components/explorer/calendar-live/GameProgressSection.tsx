import { memo, useMemo } from 'react'

import type { GameProgressV1 } from '@typings/calendarLiveTypes'
import { gameProgressDisplayLines } from '@utils/formatGameProgress'

export type GameProgressSectionProps = {
  gameProgress: GameProgressV1
  /** BEM prefix: `home-games` or `calendar-live-explorer` */
  classPrefix: 'home-games' | 'calendar-live-explorer'
  /** Heading + sport/type/widget line; home column hides these. */
  showMeta?: boolean
}

export const GameProgressSection = memo(function GameProgressSection({
  gameProgress,
  classPrefix,
  showMeta = true,
}: GameProgressSectionProps) {
  const lines = useMemo(() => gameProgressDisplayLines(gameProgress), [gameProgress])
  const pct =
    gameProgress.finished_ratio != null && Number.isFinite(gameProgress.finished_ratio)
      ? Math.round(gameProgress.finished_ratio * 100)
      : null
  const widgetLive =
    typeof gameProgress.widget_status === 'string' &&
    gameProgress.widget_status.toLowerCase() === 'live'

  return (
    <div className={`${classPrefix}__game-progress`}>
      {showMeta ? (
        <>
          <h3 className={`${classPrefix}__game-progress-title`}>Game progress</h3>
          <p className={`${classPrefix}__game-progress-sport`}>
            {gameProgress.sport}
            {gameProgress.kalshi_live_data_type ? (
              <span className={`${classPrefix}__game-progress-type`}>
                {' '}
                · {gameProgress.kalshi_live_data_type}
              </span>
            ) : null}
            {widgetLive ? (
              <span className={`${classPrefix}__game-progress-widget-live`}> · Widget live</span>
            ) : null}
          </p>
        </>
      ) : null}
      {gameProgress.progress_warning ? (
        <p className={`${classPrefix}__game-progress-warning`} role="status">
          {gameProgress.progress_warning}
        </p>
      ) : null}
      {pct != null ? (
        <div
          className={`${classPrefix}__game-progress-meter`}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Estimated regulation progress"
        >
          <div
            className={`${classPrefix}__game-progress-meter-fill`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ul className={`${classPrefix}__game-progress-list`}>
          {lines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 48)}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
})
