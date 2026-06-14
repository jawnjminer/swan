export type Rhythm = 'normal-sinus' | 'afib' | 'svt' | 'v-tach' | 'v-fib' | 'asystole'
export type SignalQuality = 'good' | 'fair' | 'poor'

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
export type AlarmSeverity = 'hr-high' | 'hr-low' | 'abp-high' | 'abp-low' | 'pap-high' | 'spo2-low' | 'resp-high' | 'resp-low' | 'art-disconnect' | 'pa-disconnect' | 'cvp-disconnect'

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
