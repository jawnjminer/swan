export type Rhythm =
  | 'normal-sinus' | 'afib' | 'svt' | 'v-tach' | 'v-fib' | 'asystole'
  | 'atrial-flutter' | 'complete-heart-block'
export type SignalQuality = 'good' | 'fair' | 'poor'
export type DisconnectChannel = 'art' | 'pa' | 'cvp'

export type ScenarioId = 'normal' | 'cardiogenic-shock' | 'severe-pe' | 'septic-shock'

export interface Vitals {
  heartRate: number
  rhythm: Rhythm
  stSegment: number
  pacerOn: boolean
  pacerRate: number

  abpSys: number
  abpDia: number

  papSys: number
  papDia: number

  cvpMean: number

  spo2: number
  signalQuality: SignalQuality

  respRate: number
  etco2: number

  // Additional MX750 display parameters
  nbpSys: number
  nbpDia: number
  nbpMap: number
  nbpStatus: 'idle' | 'measuring' | 'done'
  tblood: number
  cco: number
  cci: number
  svv: number

  wedgeInflated: boolean
  wedgeBreathCount: number
  wedgeBreathsRequired: number

  // PAWP is patient data (last successfully measured wedge pressure) and lives
  // here rather than uiStore so it survives resetToBaseline by default.
  savedPawp: number | null

  // Waveform-appearance flags — alter morphology without changing the numeric
  // physiology. Instructor-controlled monitoring events.
  abpDampened: boolean    // narrow pulse pressure, rounded, no dicrotic notch
  ecgLeadsOff: boolean    // flatline + electrical noise on the ECG channel
  paOverWedged: boolean   // balloon over-inflated: flat high-pressure trace
}

export interface DisconnectState {
  art: boolean
  pa: boolean
  cvp: boolean
}

export interface AlarmLimits {
  hrHigh: number
  hrLow: number
  abpSysHigh: number
  abpSysLow: number
  papDiaHigh: number
  spo2Low: number
  respRateHigh: number
  respRateLow: number
}

export type AlarmType = 'warning' | 'critical'
export type AlarmSeverity =
  | 'hr-high' | 'hr-low'
  | 'abp-high' | 'abp-low'
  | 'pap-high'
  | 'spo2-low'
  | 'resp-high' | 'resp-low'
  | 'art-disconnect' | 'pa-disconnect' | 'cvp-disconnect'

export interface ActiveAlarm {
  id: string
  severity: AlarmSeverity
  type: AlarmType
  message: string
  vitalKey?: string
  timestamp: number
}

export type WedgeState = 'normal' | 'inflating' | 'wedged' | 'post-wedge' | 'editing' | 'saved'
export type Screen = 'monitor' | 'wedge' | 'edit-wedge' | 'control'

export type InstructorView = 'compact' | 'full'

// ─── Quick clinical events ─────────────────────────────────────────────────
export type EventCategory = 'hemodynamic' | 'rhythm' | 'monitoring'

export type EventId =
  // Hemodynamic
  | 'hypotension' | 'hypertension' | 'hemorrhage'
  | 'vasodilatory-shock' | 'cardiogenic-shock' | 'septic-shock' | 'severe-pe'
  // Rhythm
  | 'sinus-tach' | 'sinus-brady' | 'afib' | 'atrial-flutter' | 'svt'
  | 'v-tach' | 'v-fib' | 'asystole' | 'complete-heart-block'
  // Monitoring
  | 'art-dampened' | 'art-restored'
  | 'pa-wedged' | 'pa-over-wedged' | 'pa-deflated'
  | 'spo2-off' | 'spo2-restored'
  | 'ecg-off' | 'ecg-restored'

// ─── Gradual transition (tween) state ──────────────────────────────────────
export interface TweenState {
  active: boolean
  eventLabel: string
  startValues: Partial<Vitals>
  targetValues: Partial<Vitals>
  startTime: number   // Date.now() ms at start
  durationMs: number  // total duration; 0 = instant
  remainingMs: number // countdown for the banner
}
