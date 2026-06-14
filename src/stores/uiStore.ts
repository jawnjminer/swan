import { create } from 'zustand'
import type { Screen, WedgeState } from '../types/vitals'

interface UIState {
  screen: Screen
  wedgeState: WedgeState
  alarmSilencedUntil: number | null
  savedPAWP: number | null

  setScreen: (s: Screen) => void
  setWedgeState: (s: WedgeState) => void
  silenceAlarms: () => void
  isSilenced: () => boolean
  savePAWP: (val: number) => void
  clearSavedPAWP: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  screen: 'monitor',
  wedgeState: 'normal',
  alarmSilencedUntil: null,
  savedPAWP: null,

  setScreen: (screen) => set({ screen }),
  setWedgeState: (wedgeState) => set({ wedgeState }),

  silenceAlarms: () => set({
    alarmSilencedUntil: Date.now() + 3 * 60 * 1000
  }),

  isSilenced: () => {
    const until = get().alarmSilencedUntil
    return until !== null && Date.now() < until
  },

  savePAWP: (val) => set({ savedPAWP: val }),
  clearSavedPAWP: () => set({ savedPAWP: null }),
}))
