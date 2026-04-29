import { memo, useMemo } from 'react'

import type { GameProgressV1 } from '@typings/calendarLiveTypes'
import { liveClockInline } from '@utils/formatGameProgress'

export type LiveStatusIndicatorProps = {
  classPrefix: 'home-games' | 'calendar-live-explorer'
  isLive: boolean
  gameProgress?: GameProgressV1 | null
}

export const LiveStatusIndicator = memo(function LiveStatusIndicator({
  classPrefix,
  isLive,
  gameProgress,
}: LiveStatusIndicatorProps) {
  const { clockVisual, ariaLabel } = useMemo(
    () => liveClockInline(gameProgress ?? null),
    [gameProgress],
  )

  if (!isLive) {
    return null
  }

  return (
    <p className={`${classPrefix}__status-line`} role="status" aria-label={ariaLabel}>
      <span className={`${classPrefix}__live-indicator`} aria-hidden="true">
        <span className={`${classPrefix}__live-dot`} aria-hidden />
        <span className={`${classPrefix}__live-label`}>LIVE</span>
        <span className={`${classPrefix}__live-clock`}>{clockVisual}</span>
      </span>
    </p>
  )
})
