import { create } from 'zustand'

type ExplorerUiState = {
  /** Last selected explorer path (with leading slash), kept in sync with the router */
  activeExplorerPath: string
  setActiveExplorerPath: (path: string) => void
}

export const useExplorerUiStore = create<ExplorerUiState>((set) => ({
  activeExplorerPath: '/',
  setActiveExplorerPath: (path) => set({ activeExplorerPath: path }),
}))
