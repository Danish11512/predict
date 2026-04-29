import { memo, useMemo } from 'react'

import type { GameProgressV1 } from '@typings/calendarLiveTypes'
import { getGamePillsInfo } from '@utils/formatGameProgress'

export type GameProgressSectionProps = {
  gameProgress: GameProgressV1
}

export const GameProgressSection = memo(function GameProgressSection({
  gameProgress,
}: GameProgressSectionProps) {
  const info = useMemo(() => getGamePillsInfo(gameProgress), [gameProgress])

  const pills: { text: string; className: string }[] = []
  pills.push({ text: info.liveLabel, className: 'gp-pill--live' })
  if (info.pctOrOt) {
    pills.push({ text: info.pctOrOt, className: 'gp-pill--stat' })
  }
  if (info.positionTime) {
    pills.push({ text: info.positionTime, className: 'gp-pill--clock' })
  }

  return (
    <div className="gp-root">
      <div className="gp-pills">
        {pills.map((p, i) => (
          <span key={i} className={`gp-pill ${p.className}`}>
            {p.text}
          </span>
        ))}
      </div>
      {info.elapsedDisplay || info.statsDisplay || info.lastPlayDisplay ? (
        <div className="gp-details">
          {info.elapsedDisplay ? (
            <span className="gp-elapsed">Elapsed {info.elapsedDisplay}</span>
          ) : null}
          {info.statsDisplay ? <span className="gp-stats">{info.statsDisplay}</span> : null}
          {info.lastPlayDisplay ? (
            <span className="gp-last-play">{info.lastPlayDisplay}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})
