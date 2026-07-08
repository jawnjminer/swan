import { create } from 'zustand'
import type { Screen, WedgeState, InstructorView } from '../types/vitals'

interface UIState {
  screen: Screen
  wedgeState: WedgeState
  alarmSilencedUntil: number | null
  instructorView: InstructorView
  // Selected gradual-transition duration for Quick Events. 0 = Instant.
  // Local to each device (not part of the synced simulation state).
  tweenDurationMs: number

  setScreen: (s: Screen) => void
  setWedgeState: (s: WedgeState) => void
  setInstructorView: (v: InstructorView) => void
  setTweenDuration: (ms: number) => void
  silenceAlarms: () => void
  isSilenced: () => boolean
}

export const useUIStore = create<UIState>((set, get) => ({
  screen: 'monitor',
  wedgeState: 'normal',
  alarmSilencedUntil: null,
  instructorView: 'full',
  tweenDurationMs: 0,

  setScreen: (screen) => set({ screen }),
  setWedgeState: (wedgeState) => set({ wedgeState }),
  setInstructorView: (instructorView) => set({ instructorView }),
  setTweenDuration: (tweenDurationMs) => set({ tweenDurationMs }),

  silenceAlarms: () => set({
    alarmSilencedUntil: Date.now() + 3 * 60 * 1000
  }),

  isSilenced: () => {
    const until = get().alarmSilencedUntil
    return until !== null && Date.now() < until
  },
}))
