import type { AlarmLimits, Vitals, DisconnectState, AlarmSeverity } from '../types/vitals'

export interface AlarmCheckResult {
  severity: AlarmSeverity
  message: string
}

/**
 * Pure alarm-threshold check across all vitals and disconnect states.
 * Used both for the live AlarmMonitor and the ControlPanel preview so the
 * instructor sees what the trainee currently sees.
 */
export function evaluateAlarms(
  vitals: Vitals,
  limits: AlarmLimits,
  disconnect: DisconnectState,
): AlarmCheckResult[] {
  const out: AlarmCheckResult[] = []
  if (vitals.heartRate > limits.hrHigh) out.push({ severity: 'hr-high', message: `High HR: ${vitals.heartRate} bpm` })
  else if (vitals.heartRate < limits.hrLow) out.push({ severity: 'hr-low', message: `Low HR: ${vitals.heartRate} bpm` })
  if (vitals.abpSys > limits.abpSysHigh) out.push({ severity: 'abp-high', message: `High ABP: ${vitals.abpSys} mmHg` })
  else if (vitals.abpSys < limits.abpSysLow) out.push({ severity: 'abp-low', message: `Low ABP: ${vitals.abpSys} mmHg` })
  if (vitals.papDia > limits.papDiaHigh) out.push({ severity: 'pap-high', message: `High PAdia: ${vitals.papDia} mmHg` })
  if (vitals.spo2 < limits.spo2Low) out.push({ severity: 'spo2-low', message: `Low SpO2: ${vitals.spo2}%` })
  if (vitals.respRate > limits.respRateHigh) out.push({ severity: 'resp-high', message: `High RR: ${vitals.respRate}` })
  else if (vitals.respRate < limits.respRateLow) out.push({ severity: 'resp-low', message: `Low RR: ${vitals.respRate}` })
  if (disconnect.art) out.push({ severity: 'art-disconnect', message: 'ART DISCONNECT' })
  if (disconnect.pa) out.push({ severity: 'pa-disconnect', message: 'PA DISCONNECT' })
  if (disconnect.cvp) out.push({ severity: 'cvp-disconnect', message: 'CVP DISCONNECT' })
  return out
}

export const CRITICAL_SEVERITIES = new Set<AlarmSeverity>([
  'art-disconnect', 'pa-disconnect', 'cvp-disconnect',
])

export function isCritical(severity: AlarmSeverity): boolean {
  return CRITICAL_SEVERITIES.has(severity)
}
