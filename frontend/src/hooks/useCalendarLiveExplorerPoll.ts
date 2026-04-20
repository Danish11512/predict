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
    const evs = res.data.events ?? []
    // #region agent log
    fetch('http://127.0.0.1:7287/ingest/09ecf6d9-8437-4ae0-abaa-9982611f2ee8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'e574ad',
      },
      body: JSON.stringify({
        sessionId: 'e574ad',
        hypothesisId: 'H2-H5',
        location: 'useCalendarLiveExplorerPoll.ts',
        message: 'poll fetch ok',
        data: {
          eventCount: evs.length,
          withGameProgress: evs.filter((e) => e.game_progress != null).length,
          routerPath: endpoint.routerPath,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion agent log
  }, [endpoint.id, endpoint.routerPath, setEntry, url])

  useEffect(() => {
    const n = location.pathname.replace(/\/+$/, '') || '/'
    // #region agent log
    fetch('http://127.0.0.1:7287/ingest/09ecf6d9-8437-4ae0-abaa-9982611f2ee8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'e574ad',
      },
      body: JSON.stringify({
        sessionId: 'e574ad',
        hypothesisId: 'H5',
        location: 'useCalendarLiveExplorerPoll.ts',
        message: 'poll gate',
        data: {
          pathname: n,
          pathOk,
          pollActive: pathOk && extraEnabled,
          extraPathnames: extraPathnames ?? [],
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion agent log
  }, [location.pathname, pathOk, extraEnabled, extraPathnames])

  useVisibleInterval(load, pollMs, pathOk && extraEnabled)
}
