import { create } from 'zustand'

import type { ApiExplorerEndpointId } from '@typings/apiExplorerTypes'
import type { CalendarLiveExplorerEntry } from '@typings/calendarLiveExplorerTypes'

type CalendarLiveExplorerState = {
  entries: Partial<Record<ApiExplorerEndpointId, CalendarLiveExplorerEntry>>
  setCalendarLiveEntry: (id: ApiExplorerEndpointId, entry: CalendarLiveExplorerEntry) => void
}

export const useCalendarLiveExplorerStore = create<CalendarLiveExplorerState>((set) => ({
  entries: {},
  setCalendarLiveEntry: (id, entry) =>
    set((s) => ({
      entries: { ...s.entries, [id]: entry },
    })),
}))
