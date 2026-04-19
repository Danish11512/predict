import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'

import { useVisibleInterval } from '@hooks/useVisibleInterval'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import { devLog } from '@shared/lib/devLog'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { useCalendarLiveExplorerStore } from '@stores/calendarLiveExplorerStore'
import {
  CalendarLiveExplorerEntryStatus,
  CALENDAR_LIVE_POLL_MS,
  DEFAULT_CALENDAR_LIVE_POLL_ENABLED,
  type CalendarLiveExplorerPollOptions,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

export function useCalendarLiveExplorerPoll<T extends CalendarLivePayload>(
  endpoint: ApiExplorerEndpoint,
  options?: CalendarLiveExplorerPollOptions,
): void {
  const pollMs = options?.pollMs ?? CALENDAR_LIVE_POLL_MS
  const extraEnabled = options?.enabled ?? DEFAULT_CALENDAR_LIVE_POLL_ENABLED

  const location = useLocation()
  const extraPathnames = options?.extraPathnames
  const pathOk = useMemo(() => {
    const n = location.pathname.replace(/\/+$/, '') || '/'
    if (n === `/${endpoint.routerPath}`) {
      return true
    }
    if (extraPathnames === undefined || extraPathnames.length === 0) {
      return false
    }
    return extraPathnames.includes(n)
  }, [location.pathname, endpoint.routerPath, extraPathnames])

  const setEntry = useCalendarLiveExplorerStore((s) => s.setCalendarLiveEntry)
  const url = toProxiedUrl(endpoint.proxyPath)

  const load = useCallback(async () => {
    const prior = useCalendarLiveExplorerStore.getState().entries[endpoint.id]
    if (prior?.status !== CalendarLiveExplorerEntryStatus.Ok) {
      setEntry(endpoint.id, { status: CalendarLiveExplorerEntryStatus.Loading })
    }

    const res = await fetchJsonObject<T>(url)
    if (!res.ok) {
      devLog.warn('calendar-live poll error', {
        endpointId: endpoint.id,
        url,
        message: res.message,
      })
      setEntry(endpoint.id, {
        status: CalendarLiveExplorerEntryStatus.Error,
        message: res.message,
      })
      return
    }
    setEntry(endpoint.id, {
      status: CalendarLiveExplorerEntryStatus.Ok,
      payload: res.data,
      updatedAt: Date.now(),
    })
  }, [endpoint.id, setEntry, url])

  useVisibleInterval(load, pollMs, pathOk && extraEnabled)
}
