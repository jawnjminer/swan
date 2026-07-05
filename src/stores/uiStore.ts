import { create } from 'zustand'
import type { Screen, WedgeState, InstructorView } from '../types/vitals'

interface UIState {
  screen: Screen
  wedgeState: WedgeState
  alarmSilencedUntil: number | null
  instructorView: InstructorView

  setScreen: (s: Screen) => void
  setWedgeState: (s: WedgeState) => void
  setInstructorView: (v: InstructorView) => void
  silenceAlarms: () => void
  isSilenced: () => boolean
}

export const useUIStore = create<UIState>((set, get) => ({
  screen: 'monitor',
  wedgeState: 'normal',
  alarmSilencedUntil: null,
  instructorView: 'full',

  setScreen: (screen) => set({ screen }),
  setWedgeState: (wedgeState) => set({ wedgeState }),
  setInstructorView: (instructorView) => set({ instructorView }),

  silenceAlarms: () => set({
    alarmSilencedUntil: Date.now() + 3 * 60 * 1000
  }),

  isSilenced: () => {
    const until = get().alarmSilencedUntil
    return until !== null && Date.now() < until
  },
}))
