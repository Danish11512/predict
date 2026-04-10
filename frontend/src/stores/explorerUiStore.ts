import { create } from 'zustand'

import { DEFAULT_EXPLORER_PATH } from '@constants/apiEndpointsConstants'

type ExplorerUiState = {
  /** Last selected explorer path (with leading slash), kept in sync with the router */
  activeExplorerPath: string
  setActiveExplorerPath: (path: string) => void
}

export const useExplorerUiStore = create<ExplorerUiState>((set) => ({
  activeExplorerPath: DEFAULT_EXPLORER_PATH,
  setActiveExplorerPath: (path) => set({ activeExplorerPath: path }),
}))
