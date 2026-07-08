import { describe, it, expect, beforeEach } from 'vitest'
import { useVitalStore, BASELINE_VITALS } from '../../stores/vitalStore'

describe('vitalStore — fireEvent (instant path)', () => {
  beforeEach(() => {
    useVitalStore.getState().resetToBaseline({ clearPawp: true })
    useVitalStore.setState({ tween: null })
  })

  it('instant duration applies all numeric + enum targets immediately', () => {
    useVitalStore.getState().fireEvent('cardiogenic-shock', 0)
    const v = useVitalStore.getState().vitals
    expect(v.heartRate).toBe(110)
    expect(v.abpSys).toBe(90)
    expect(v.papSys).toBe(45)
    expect(useVitalStore.getState().tween).toBeNull()
  })

  it('rhythm (enum) snaps instantly even with a non-zero duration', () => {
    useVitalStore.getState().fireEvent('v-tach', 30_000)
    // Rhythm is a string field → snaps immediately regardless of duration.
    expect(useVitalStore.getState().vitals.rhythm).toBe('v-tach')
    // A tween should be running for the numeric HR/ABP fields.
    expect(useVitalStore.getState().tween?.active).toBe(true)
    // Clean up the RAF-driven tween so it doesn't leak into other tests.
    useVitalStore.getState().cancelTween()
  })

  it('boolean monitoring events snap instantly at any duration', () => {
    useVitalStore.getState().fireEvent('ecg-off', 60_000)
    expect(useVitalStore.getState().vitals.ecgLeadsOff).toBe(true)
    // No numeric fields → no tween.
    expect(useVitalStore.getState().tween).toBeNull()
  })

  it('pa-over-wedged sets both flags instantly', () => {
    useVitalStore.getState().fireEvent('pa-over-wedged', 0)
    const v = useVitalStore.getState().vitals
    expect(v.paOverWedged).toBe(true)
    expect(v.wedgeInflated).toBe(true)
  })

  it('pa-deflated clears both wedge flags', () => {
    useVitalStore.getState().fireEvent('pa-over-wedged', 0)
    useVitalStore.getState().fireEvent('pa-deflated', 0)
    const v = useVitalStore.getState().vitals
    expect(v.paOverWedged).toBe(false)
    expect(v.wedgeInflated).toBe(false)
  })

  it('cancelTween clears an in-flight transition', () => {
    useVitalStore.getState().fireEvent('hypotension', 30_000)
    expect(useVitalStore.getState().tween?.active).toBe(true)
    useVitalStore.getState().cancelTween()
    expect(useVitalStore.getState().tween).toBeNull()
  })

  it('setVitalsFromRemote overwrites vitals/disconnect/alarmLimits', () => {
    useVitalStore.getState().setVitalsFromRemote({
      vitals: { ...BASELINE_VITALS, heartRate: 42 },
      disconnect: { art: true, pa: false, cvp: false },
      alarmLimits: useVitalStore.getState().alarmLimits,
    })
    expect(useVitalStore.getState().vitals.heartRate).toBe(42)
    expect(useVitalStore.getState().disconnect.art).toBe(true)
  })
})
