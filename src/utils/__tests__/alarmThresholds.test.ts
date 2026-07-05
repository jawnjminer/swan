import { describe, it, expect } from 'vitest'
import { evaluateAlarms, isCritical, CRITICAL_SEVERITIES } from '../alarmThresholds'
import { BASELINE_VITALS, useVitalStore } from '../../stores/vitalStore'
import type { AlarmLimits, DisconnectState } from '../../types/vitals'

const DEFAULT_LIMITS: AlarmLimits = {
  hrHigh: 130, hrLow: 50,
  abpSysHigh: 120, abpSysLow: 90,
  papDiaHigh: 26,
  spo2Low: 92,
  respRateHigh: 32, respRateLow: 6,
}

const NO_DISCONNECT: DisconnectState = { art: false, pa: false, cvp: false }

describe('evaluateAlarms', () => {
  it('baseline patient with default limits triggers no alarms', () => {
    const alarms = evaluateAlarms(BASELINE_VITALS, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(alarms).toEqual([])
  })

  it('reports hr-high when HR exceeds limit and hr-low when below', () => {
    const high = evaluateAlarms({ ...BASELINE_VITALS, heartRate: 140 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(high.map(a => a.severity)).toContain('hr-high')
    expect(high.find(a => a.severity === 'hr-high')!.message).toMatch(/140/)
    const low = evaluateAlarms({ ...BASELINE_VITALS, heartRate: 45 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(low.map(a => a.severity)).toContain('hr-low')
  })

  it('reports abp-high / abp-low around thresholds', () => {
    expect(evaluateAlarms({ ...BASELINE_VITALS, abpSys: 130 }, DEFAULT_LIMITS, NO_DISCONNECT).map(a => a.severity)).toContain('abp-high')
    expect(evaluateAlarms({ ...BASELINE_VITALS, abpSys: 80 }, DEFAULT_LIMITS, NO_DISCONNECT).map(a => a.severity)).toContain('abp-low')
    expect(evaluateAlarms({ ...BASELINE_VITALS, abpSys: 100 }, DEFAULT_LIMITS, NO_DISCONNECT)).toEqual([])
  })

  it('reports pap-high when PAdia exceeds limit', () => {
    const r = evaluateAlarms({ ...BASELINE_VITALS, papDia: 30 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(r.map(a => a.severity)).toContain('pap-high')
  })

  it('reports spo2-low when SpO2 falls below threshold', () => {
    const r = evaluateAlarms({ ...BASELINE_VITALS, spo2: 90 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(r.map(a => a.severity)).toContain('spo2-low')
    const ok = evaluateAlarms({ ...BASELINE_VITALS, spo2: 95 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(ok).toEqual([])
  })

  it('reports resp-high and resp-low with exclusive bands', () => {
    const high = evaluateAlarms({ ...BASELINE_VITALS, respRate: 40 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(high.map(a => a.severity)).toContain('resp-high')
    const low = evaluateAlarms({ ...BASELINE_VITALS, respRate: 4 }, DEFAULT_LIMITS, NO_DISCONNECT)
    expect(low.map(a => a.severity)).toContain('resp-low')
  })

  it('disconnect states always alarm (regardless of limits)', () => {
    const disconnects: DisconnectState = { art: true, pa: true, cvp: true }
    const r = evaluateAlarms(BASELINE_VITALS, DEFAULT_LIMITS, disconnects)
    expect(r.map(a => a.severity).sort()).toEqual(['art-disconnect', 'cvp-disconnect', 'pa-disconnect'])
  })
})

describe('isCritical / CRITICAL_SEVERITIES', () => {
  it('only disconnect severities are critical', () => {
    expect(isCritical('art-disconnect')).toBe(true)
    expect(isCritical('pa-disconnect')).toBe(true)
    expect(isCritical('cvp-disconnect')).toBe(true)
    expect(isCritical('hr-high')).toBe(false)
    expect(isCritical('spo2-low')).toBe(false)
    expect(CRITICAL_SEVERITIES.has('spo2-low')).toBe(false)
  })
})

describe('useVitalStore actions', () => {
  it('applyScenario applies all expected vitals at once', () => {
    useVitalStore.getState().resetToBaseline({ clearPawp: true })
    useVitalStore.getState().applyScenario('cardiogenic-shock')
    const v = useVitalStore.getState().vitals
    expect(v.heartRate).toBe(110)
    expect(v.abpSys).toBe(90)
    expect(v.papSys).toBe(45)
    expect(v.papDia).toBe(25)
  })

  it('applyScenario("normal") resets vitals to baseline', () => {
    useVitalStore.getState().applyScenario('severe-pe')
    expect(useVitalStore.getState().vitals.heartRate).toBe(130)
    useVitalStore.getState().applyScenario('normal')
    const v = useVitalStore.getState().vitals
    expect(v.heartRate).toBe(BASELINE_VITALS.heartRate)
    expect(v.abpSys).toBe(BASELINE_VITALS.abpSys)
    expect(v.papSys).toBe(BASELINE_VITALS.papSys)
    expect(v.spo2).toBe(BASELINE_VITALS.spo2)
  })

  it('applyScenario("normal") preserves savedPawp', () => {
    useVitalStore.getState().savePawp(20)
    useVitalStore.getState().applyScenario('severe-pe')
    useVitalStore.getState().applyScenario('normal')
    expect(useVitalStore.getState().vitals.savedPawp).toBe(20)
  })

  it('resetToBaseline preserves savedPawp by default', () => {
    useVitalStore.getState().savePawp(15)
    useVitalStore.getState().applyScenario('severe-pe')
    useVitalStore.getState().resetToBaseline()
    expect(useVitalStore.getState().vitals.savedPawp).toBe(15)
    useVitalStore.getState().resetToBaseline({ clearPawp: true })
    expect(useVitalStore.getState().vitals.savedPawp).toBeNull()
  })

  it('beginWedge/deflateWedge toggles wedgeInflated and resets breath count on deflate', () => {
    useVitalStore.getState().resetToBaseline({ clearPawp: true })
    useVitalStore.getState().beginWedge()
    expect(useVitalStore.getState().vitals.wedgeInflated).toBe(true)
    useVitalStore.getState().incrementBreath()
    useVitalStore.getState().incrementBreath()
    expect(useVitalStore.getState().vitals.wedgeBreathCount).toBe(2)
    useVitalStore.getState().deflateWedge()
    expect(useVitalStore.getState().vitals.wedgeInflated).toBe(false)
    expect(useVitalStore.getState().vitals.wedgeBreathCount).toBe(0)
  })
})
