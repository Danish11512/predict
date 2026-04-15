import { create } from 'zustand'

type ExplorerUiState = {
  /** Last selected explorer path (with leading slash), kept in sync with the router */
  activeExplorerPath: string
  setActiveExplorerPath: (path: string) => void
  /** Last successful poll time per endpoint id (calendar LIVE panels bump this while mounted). */
  endpointFreshnessEpochMs: Record<string, number>
  touchEndpointFreshness: (endpointId: string) => void
}

export const useExplorerUiStore = create<ExplorerUiState>((set) => ({
  activeExplorerPath: '/',
  setActiveExplorerPath: (path) => set({ activeExplorerPath: path }),
  endpointFreshnessEpochMs: {},
  touchEndpointFreshness: (endpointId) =>
    set((s) => ({
      endpointFreshnessEpochMs: { ...s.endpointFreshnessEpochMs, [endpointId]: Date.now() },
    })),
}))
