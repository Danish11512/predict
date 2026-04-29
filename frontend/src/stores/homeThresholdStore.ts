import { create } from 'zustand'

type HomeThresholdState = {
  threshold: number
  setThreshold: (v: number) => void
}

export const useHomeThresholdStore = create<HomeThresholdState>((set) => ({
  threshold: 60,
  setThreshold: (v) => set({ threshold: v }),
}))
