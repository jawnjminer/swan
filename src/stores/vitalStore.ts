import { create } from 'zustand'
import type {
  Vitals, DisconnectState, AlarmLimits, Rhythm, SignalQuality,
  DisconnectChannel, ScenarioId, EventId, TweenState,
} from '../types/vitals'
import { getScenario } from '../utils/scenarios'
import { EVENT_TABLE } from '../utils/events'
import { broadcastState, type SimulationState } from '../utils/supabase'

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
  abpDampened: false,
  ecgLeadsOff: false,
  paOverWedged: false,
}

interface VitalStore {
  vitals: Vitals
  disconnect: DisconnectState
  alarmLimits: AlarmLimits
  tween: TweenState | null

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

  // Quick events + gradual transitions
  fireEvent: (id: EventId, durationMs: number) => void
  cancelTween: () => void

  // Cross-device sync
  setVitalsFromRemote: (state: SimulationState) => void

  getBaseline: () => Vitals
}

// ─── Broadcast role ────────────────────────────────────────────────────────
// Only the instructor console broadcasts. The bedside monitor is a pure
// subscriber; if it also broadcast, remote updates would echo back in a loop.
// The ControlPanel calls enableBroadcasting() on mount.
let _isBroadcaster = false
let _applyingRemote = false

export function enableBroadcasting() { _isBroadcaster = true }
export function isBroadcaster() { return _isBroadcaster }

// ─── Module-level tween engine ─────────────────────────────────────────────
// Kept outside Zustand so the 60fps RAF loop doesn't churn React state — we
// only push to the store (and broadcast) on a ~100ms cadence.
let _rafId: number | null = null

function _cancelRaf() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null }
}

function _lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1)
}

export const useVitalStore = create<VitalStore>((set, get) => ({
  vitals: { ...BASELINE_VITALS },
  disconnect: { art: false, pa: false, cvp: false },
  tween: null,
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

  fireEvent: (id, durationMs) => {
    const def = EVENT_TABLE[id]
    if (!def) return
    _cancelRaf()

    const current = get().vitals

    // Split target fields: non-numeric snap immediately; numeric interpolate.
    const snapFields: Partial<Vitals> = {}
    const tweenStart: Partial<Vitals> = {}
    const tweenTarget: Partial<Vitals> = {}

    if (def.vitals) {
      for (const key of Object.keys(def.vitals) as (keyof Vitals)[]) {
        const val = def.vitals[key]
        if (typeof val === 'number') {
          ;(tweenStart as Record<string, number>)[key] = current[key] as number
          ;(tweenTarget as Record<string, number>)[key] = val
        } else {
          ;(snapFields as Record<string, unknown>)[key] = val
        }
      }
    }

    // Disconnects always snap.
    if (def.disconnect) {
      set((s) => ({ disconnect: { ...s.disconnect, ...def.disconnect } }))
    }

    // Apply the snap fields (rhythm, booleans) immediately.
    if (Object.keys(snapFields).length > 0) {
      set((s) => ({ vitals: { ...s.vitals, ...snapFields } }))
    }

    const hasTween = Object.keys(tweenTarget).length > 0

    // Instant, or nothing to interpolate → apply targets now and finish.
    if (durationMs === 0 || !hasTween) {
      if (hasTween) set((s) => ({ vitals: { ...s.vitals, ...tweenTarget } }))
      set(() => ({ tween: null }))
      _broadcast(get)
      return
    }

    const startTime = Date.now()
    set(() => ({
      tween: {
        active: true,
        eventLabel: def.label,
        startValues: tweenStart,
        targetValues: tweenTarget,
        startTime,
        durationMs,
        remainingMs: durationMs,
      },
    }))

    let lastTick = 0
    const step = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)

      const interp: Partial<Vitals> = {}
      for (const key of Object.keys(tweenTarget) as (keyof Vitals)[]) {
        const a = (tweenStart as Record<string, number>)[key]
        const b = (tweenTarget as Record<string, number>)[key]
        ;(interp as Record<string, number>)[key] = Math.round(_lerp(a, b, progress))
      }

      const now = Date.now()
      if (now - lastTick >= 100 || progress >= 1) {
        lastTick = now
        set((s) => ({
          vitals: { ...s.vitals, ...interp },
          tween: s.tween ? { ...s.tween, remainingMs: Math.max(0, durationMs - elapsed) } : null,
        }))
        _broadcast(get)
      }

      if (progress < 1) {
        _rafId = requestAnimationFrame(step)
      } else {
        set(() => ({ tween: null }))
        _rafId = null
      }
    }
    _rafId = requestAnimationFrame(step)
  },

  cancelTween: () => {
    _cancelRaf()
    set(() => ({ tween: null }))
    _broadcast(get)
  },

  setVitalsFromRemote: (state) => {
    _applyingRemote = true
    set(() => ({
      vitals: state.vitals,
      disconnect: state.disconnect,
      alarmLimits: state.alarmLimits,
    }))
    _applyingRemote = false
  },

  getBaseline: () => ({ ...BASELINE_VITALS }),
}))

/** Broadcast current simulation state to any subscribed bedside monitors. */
function _broadcast(get: () => VitalStore) {
  if (!_isBroadcaster || _applyingRemote) return
  const s = get()
  broadcastState({ vitals: s.vitals, disconnect: s.disconnect, alarmLimits: s.alarmLimits })
}

// Instructor-authoritative broadcast: any change to the shared simulation
// state (vitals / disconnect / alarmLimits) is pushed to subscribers. The
// broadcast helper is internally throttled (~10Hz) and no-ops when sync is
// not configured or when this client is not the broadcaster (bedside).
useVitalStore.subscribe((state, prev) => {
  if (!_isBroadcaster || _applyingRemote) return
  if (
    state.vitals !== prev.vitals ||
    state.disconnect !== prev.disconnect ||
    state.alarmLimits !== prev.alarmLimits
  ) {
    broadcastState({
      vitals: state.vitals,
      disconnect: state.disconnect,
      alarmLimits: state.alarmLimits,
    })
  }
})
