import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'

import { useVisibleInterval } from '@hooks/useVisibleInterval'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { useCalendarLiveExplorerStore } from '@stores/calendarLiveExplorerStore'
import { useExplorerUiStore } from '@stores/explorerUiStore'
import {
  CalendarLiveExplorerEntryStatus,
  DEFAULT_CALENDAR_LIVE_POLL_ENABLED,
  type CalendarLiveExplorerPollOptions,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

/** One poll per second while the explorer route is mounted, tab visible, and interval enabled. */
export const CALENDAR_LIVE_POLL_MS = 1000

/**
 * Polls a calendar-live JSON endpoint while this route is active and the browser tab is visible.
 * Updates {@link useCalendarLiveExplorerStore} on each successful response so other UI can read
 * snapshots; skips fetch (and thus store writes) when the tab is hidden or polling is disabled.
 */
export function useCalendarLiveExplorerPoll<T extends CalendarLivePayload>(
  endpoint: ApiExplorerEndpoint,
  options?: CalendarLiveExplorerPollOptions,
): void {
  const pollMs = options?.pollMs ?? CALENDAR_LIVE_POLL_MS
  const extraEnabled = options?.enabled ?? DEFAULT_CALENDAR_LIVE_POLL_ENABLED

  const location = useLocation()
  const pathOk = useMemo(() => {
    const n = location.pathname.replace(/\/+$/, '') || '/'
    return n === `/${endpoint.routerPath}`
  }, [location.pathname, endpoint.routerPath])

  const setEntry = useCalendarLiveExplorerStore((s) => s.setCalendarLiveEntry)
  const touch = useExplorerUiStore((s) => s.touchEndpointFreshness)
  const url = toProxiedUrl(endpoint.proxyPath)

  const load = useCallback(async () => {
    const prior = useCalendarLiveExplorerStore.getState().entries[endpoint.id]
    if (prior?.status !== CalendarLiveExplorerEntryStatus.Ok) {
      setEntry(endpoint.id, { status: CalendarLiveExplorerEntryStatus.Loading })
    }

    const res = await fetchJsonObject<T>(url)
    if (!res.ok) {
      setEntry(endpoint.id, {
        status: CalendarLiveExplorerEntryStatus.Error,
        message: res.message,
      })
      return
    }
    touch(endpoint.id)
    setEntry(endpoint.id, {
      status: CalendarLiveExplorerEntryStatus.Ok,
      payload: res.data,
      updatedAt: Date.now(),
    })
  }, [endpoint.id, setEntry, touch, url])

  useVisibleInterval(load, pollMs, pathOk && extraEnabled)
}
