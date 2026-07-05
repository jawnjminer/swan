import { useEffect } from 'react'
import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import { playWarningTone, playCriticalTone, stopAlarmTone } from '../utils/alarmTones'
import { evaluateAlarms, isCritical } from '../utils/alarmThresholds'

export default function AlarmMonitor() {
  const vitals = useVitalStore(s => s.vitals)
  const disconnect = useVitalStore(s => s.disconnect)
  const alarmLimits = useVitalStore(s => s.alarmLimits)
  const isSilenced = useUIStore(s => s.isSilenced)

  const active = evaluateAlarms(vitals, alarmLimits, disconnect)
  const hasCritical = active.some(r => isCritical(r.severity))
  const hasWarning = active.length > 0 && !hasCritical
  const silenced = isSilenced()

  useEffect(() => {
    if (silenced) {
      stopAlarmTone()
      return
    }
    if (hasCritical) playCriticalTone()
    else if (hasWarning) playWarningTone()
    else stopAlarmTone()
  }, [hasWarning, hasCritical, silenced])

  return null
}
