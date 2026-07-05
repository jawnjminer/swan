import { create } from 'zustand'
import type {
  Vitals, DisconnectState, AlarmLimits, Rhythm, SignalQuality,
  DisconnectChannel, ScenarioId,
} from '../types/vitals'
import { getScenario } from '../utils/scenarios'

export const BASELINE_VITALS: Vitals = {
  heartRate: 78,
  rhythm: 'normal-sinus',
  stSegment: 0,
  pacerOn: false,
  pacerRate: 60,
  abpSys: 120,
  abpDia: 80,
  papSys: 25,
  papDia: 10,
  cvpMean: 8,
  spo2: 98,
  signalQuality: 'good',
  respRate: 14,
  etco2: 35,
  nbpSys: 0,
  nbpDia: 0,
  nbpMap: 0,
  nbpStatus: 'idle',
  tblood: 36.8,
  cco: 4.9,
  cci: 3.0,
  svv: 11,
  wedgeInflated: false,
  wedgeBreathCount: 0,
  wedgeBreathsRequired: 3,
  savedPawp: null,
}

interface VitalStore {
  vitals: Vitals
  disconnect: DisconnectState
  alarmLimits: AlarmLimits

  setHR: (hr: number) => void
  setRhythm: (r: Rhythm) => void
  setABP: (sys: number, dia: number) => void
  setPA: (sys: number, dia: number) => void
  setCVP: (mean: number) => void
  setSpO2: (val: number) => void
  setSignalQuality: (q: SignalQuality) => void
  setRespRate: (rate: number) => void
  setEtCO2: (val: number) => void
  setDisconnect: (ch: DisconnectChannel, val: boolean) => void
  setAlarmLimit: (key: keyof AlarmLimits, val: number) => void

  beginWedge: () => void
  deflateWedge: () => void
  incrementBreath: () => void
  resetBreathCount: () => void

  savePawp: (val: number) => void
  clearSavedPawp: () => void

  startNBP: () => void
  zeroTransducer: (ch: DisconnectChannel | 'all') => void

  resetToBaseline: (opts?: { clearPawp?: boolean }) => void
  applyScenario: (id: ScenarioId) => void

  getBaseline: () => Vitals
}

export const useVitalStore = create<VitalStore>((set, get) => ({
  vitals: { ...BASELINE_VITALS },
  disconnect: { art: false, pa: false, cvp: false },
  alarmLimits: {
    hrHigh: 130,
    hrLow: 50,
    abpSysHigh: 120,
    abpSysLow: 90,
    papDiaHigh: 26,
    spo2Low: 92,
    respRateHigh: 32,
    respRateLow: 6,
  },

  setHR: (hr) => set((s) => ({ vitals: { ...s.vitals, heartRate: hr } })),
  setRhythm: (r) => set((s) => ({ vitals: { ...s.vitals, rhythm: r } })),
  setABP: (sys, dia) => set((s) => ({ vitals: { ...s.vitals, abpSys: sys, abpDia: dia } })),
  setPA: (sys, dia) => set((s) => ({ vitals: { ...s.vitals, papSys: sys, papDia: dia } })),
  setCVP: (mean) => set((s) => ({ vitals: { ...s.vitals, cvpMean: mean } })),
  setSpO2: (val) => set((s) => ({ vitals: { ...s.vitals, spo2: val } })),
  setSignalQuality: (q) => set((s) => ({ vitals: { ...s.vitals, signalQuality: q } })),
  setRespRate: (rate) => set((s) => ({ vitals: { ...s.vitals, respRate: rate } })),
  setEtCO2: (val) => set((s) => ({ vitals: { ...s.vitals, etco2: val } })),

  setDisconnect: (ch, val) => set((s) => ({
    disconnect: { ...s.disconnect, [ch]: val }
  })),

  setAlarmLimit: (key, val) => set((s) => ({
    alarmLimits: { ...s.alarmLimits, [key]: val }
  })),

  beginWedge: () => set((s) => ({
    vitals: { ...s.vitals, wedgeInflated: true }
  })),

  deflateWedge: () => set((s) => ({
    vitals: { ...s.vitals, wedgeInflated: false, wedgeBreathCount: 0 }
  })),

  incrementBreath: () => set((s) => ({
    vitals: { ...s.vitals, wedgeBreathCount: s.vitals.wedgeBreathCount + 1 }
  })),

  resetBreathCount: () => set((s) => ({
    vitals: { ...s.vitals, wedgeBreathCount: 0 }
  })),

  savePawp: (val) => set((s) => ({
    vitals: { ...s.vitals, savedPawp: val }
  })),

  clearSavedPawp: () => set((s) => ({
    vitals: { ...s.vitals, savedPawp: null }
  })),

  startNBP: () => {
    set((s) => ({ vitals: { ...s.vitals, nbpStatus: 'measuring' } }))
    setTimeout(() => {
      const s = get().vitals
      // NBP correlates loosely with arterial line.
      const sys = s.abpSys + Math.round((Math.random() - 0.5) * 8)
      const dia = s.abpDia + Math.round((Math.random() - 0.5) * 6)
      const map = Math.round(dia + (sys - dia) / 3)
      set((st) => ({ vitals: { ...st.vitals, nbpSys: sys, nbpDia: dia, nbpMap: map, nbpStatus: 'done' } }))
    }, 4000)
  },

  zeroTransducer: (ch) => set((s) => {
    if (ch === 'all') {
      return { disconnect: { art: false, pa: false, cvp: false } }
    }
    return { disconnect: { ...s.disconnect, [ch]: false } }
  }),

  resetToBaseline: (opts) => set((s) => ({
    vitals: {
      ...BASELINE_VITALS,
      // PAWP persists across reset unless explicitly cleared (clinical reality:
      // the recorded wedge value is the point of the exercise).
      savedPawp: opts?.clearPawp ? null : s.vitals.savedPawp,
    },
    disconnect: { art: false, pa: false, cvp: false }
  })),

  applyScenario: (id) => {
    // Normal == return to baseline. The 'normal' scenario has an empty
    // vitals partial by design (it's the reference point), so an implicit
    // merge would be a no-op. Be explicit.
    if (id === 'normal') {
      set((s) => ({
        vitals: { ...BASELINE_VITALS, savedPawp: s.vitals.savedPawp },
        disconnect: { art: false, pa: false, cvp: false },
      }))
      return
    }
    set((s) => {
      const def = getScenario(id)
      return {
        vitals: { ...s.vitals, ...def.vitals },
        disconnect: def.disconnect ? { ...s.disconnect, ...def.disconnect } : s.disconnect,
      }
    })
  },

  getBaseline: () => ({ ...BASELINE_VITALS }),
}))
