import { create } from 'zustand'
import type { Vitals, DisconnectState, AlarmLimits, Rhythm, SignalQuality } from '../types/vitals'

const BASELINE: Vitals = {
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
}

export const useVitalStore = create<{
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
  setDisconnect: (ch: keyof DisconnectState, val: boolean) => void
  setAlarmLimit: (key: keyof AlarmLimits, val: number) => void

  inflateWedge: () => void
  deflateWedge: () => void
  incrementBreath: () => void
  resetBreathCount: () => void

  setWedgeState: (inflated: boolean) => void

  startNBP: () => void
  zeroTransducer: (ch: 'art' | 'pa' | 'cvp' | 'all') => void

  resetToBaseline: () => void
  loadScenario: (scenario: Partial<Vitals> & { disconnect?: Partial<DisconnectState> }) => void

  getBaseline: () => Vitals
}>((set, get) => ({
  vitals: { ...BASELINE },
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

  inflateWedge: () => set((s) => ({
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

  setWedgeState: (inflated) => set((s) => ({
    vitals: { ...s.vitals, wedgeInflated: inflated }
  })),

  startNBP: () => {
    set((s) => ({ vitals: { ...s.vitals, nbpStatus: 'measuring' } }))
    setTimeout(() => {
      const s = get().vitals
      // NBP correlates loosely with arterial line
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

  resetToBaseline: () => set({
    vitals: { ...BASELINE },
    disconnect: { art: false, pa: false, cvp: false }
  }),

  loadScenario: (scenario) => set((s) => ({
    vitals: { ...s.vitals, ...scenario },
    disconnect: scenario.disconnect ? { ...s.disconnect, ...scenario.disconnect } : s.disconnect
  })),

  getBaseline: () => ({ ...BASELINE }),
}))
