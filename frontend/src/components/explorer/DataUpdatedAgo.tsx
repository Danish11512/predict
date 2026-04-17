import { memo, useMemo, useSyncExternalStore } from 'react'

import {
  getWallClockMsServerSnapshot,
  getWallClockMsSnapshot,
  subscribeWallClockMs,
} from '@shared/lib/wallClockMs'

type DataUpdatedAgoProps = {
  /** Epoch ms when the displayed payload was last refreshed successfully */
  updatedAt: number | undefined
}

/**
 * Shows “Updated Ns ago”, ticking once per second via a shared wall-clock subscription.
 */
function DataUpdatedAgoInner({ updatedAt }: DataUpdatedAgoProps) {
  const nowMs = useSyncExternalStore(
    subscribeWallClockMs,
    getWallClockMsSnapshot,
    getWallClockMsServerSnapshot,
  )

  const secondsAgo = useMemo(() => {
    if (updatedAt === undefined) {
      return null
    }
    return Math.max(0, Math.floor((nowMs - updatedAt) / 1000))
  }, [nowMs, updatedAt])

  if (updatedAt === undefined) {
    return (
      <span
        className="text-muted-foreground text-sm whitespace-nowrap"
        title="Waiting for first successful response"
      >
        —
      </span>
    )
  }

  const iso = new Date(updatedAt).toISOString()

  return (
    <span
      className="text-muted-foreground text-sm tabular-nums whitespace-nowrap"
      title={`Last successful fetch: ${iso}`}
    >
      Updated {secondsAgo}s ago
    </span>
  )
}

export const DataUpdatedAgo = memo(DataUpdatedAgoInner)
