import { useEffect } from 'react'
import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import { playWarningTone, playCriticalTone, stopAlarmTone } from '../utils/alarmTones'

export default function AlarmMonitor() {
  const vitals = useVitalStore(s => s.vitals)
  const disconnect = useVitalStore(s => s.disconnect)
  const alarmLimits = useVitalStore(s => s.alarmLimits)
  const isSilenced = useUIStore(s => s.isSilenced)

  const checks = [
    { severity: 'hr-high' as const, msg: `High HR: ${vitals.heartRate} bpm`, check: () => vitals.heartRate > alarmLimits.hrHigh },
    { severity: 'hr-low' as const, msg: `Low HR: ${vitals.heartRate} bpm`, check: () => vitals.heartRate < alarmLimits.hrLow },
    { severity: 'abp-high' as const, msg: `High ABP: ${vitals.abpSys} mmHg`, check: () => vitals.abpSys > alarmLimits.abpSysHigh },
    { severity: 'abp-low' as const, msg: `Low ABP: ${vitals.abpSys} mmHg`, check: () => vitals.abpSys < alarmLimits.abpSysLow },
    { severity: 'pap-high' as const, msg: `High PAdia: ${vitals.papDia} mmHg`, check: () => vitals.papDia > alarmLimits.papDiaHigh },
    { severity: 'spo2-low' as const, msg: `Low SpO2: ${vitals.spo2}%`, check: () => vitals.spo2 < alarmLimits.spo2Low },
    { severity: 'resp-high' as const, msg: `High RR: ${vitals.respRate}`, check: () => vitals.respRate > alarmLimits.respRateHigh },
    { severity: 'resp-low' as const, msg: `Low RR: ${vitals.respRate}`, check: () => vitals.respRate < alarmLimits.respRateLow },
    { severity: 'art-disconnect' as const, msg: 'ART DISCONNECT', check: () => disconnect.art },
    { severity: 'pa-disconnect' as const, msg: 'PA DISCONNECT', check: () => disconnect.pa },
    { severity: 'cvp-disconnect' as const, msg: 'CVP DISCONNECT', check: () => disconnect.cvp },
  ]

  const criticalSeverities = new Set(['art-disconnect', 'pa-disconnect', 'cvp-disconnect'])
  const activeWarnings = checks.filter(c => !criticalSeverities.has(c.severity) && c.check())
  const activeCriticals = checks.filter(c => criticalSeverities.has(c.severity) && c.check())

  const hasWarning = activeWarnings.length > 0
  const hasCritical = activeCriticals.length > 0
  const silenced = isSilenced()

  useEffect(() => {
    if (silenced) {
      stopAlarmTone()
      return
    }
    if (hasCritical) {
      playCriticalTone()
    } else if (hasWarning) {
      playWarningTone()
    } else {
      stopAlarmTone()
    }
  }, [hasWarning, hasCritical, silenced])

  return null
}
