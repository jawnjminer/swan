import { describe, it, expect } from 'vitest'
import { SCENARIO_TABLE, SCENARIO_ORDER, getScenario } from '../scenarios'
import type { ScenarioId } from '../../types/vitals'

describe('SCENARIO_TABLE', () => {
  it('contains exactly the four expected scenarios in order', () => {
    expect(SCENARIO_ORDER).toEqual<ScenarioId[]>([
      'normal', 'cardiogenic-shock', 'severe-pe', 'septic-shock',
    ])
    expect(Object.keys(SCENARIO_TABLE).sort()).toEqual(SCENARIO_ORDER.slice().sort())
  })

  it('every entry has a label, description, and id matches key', () => {
    for (const id of SCENARIO_ORDER) {
      const s = getScenario(id)
      expect(s.id, `id matches key for ${id}`).toBe(id)
      expect(s.label.length, `label non-empty for ${id}`).toBeGreaterThan(0)
      expect(s.description.length, `description non-empty for ${id}`).toBeGreaterThan(20)
    }
  })

  it('cardiogenic-shock: hypotension + elevated PAP + tachycardia', () => {
    const v = SCENARIO_TABLE['cardiogenic-shock'].vitals
    expect(v.abpSys).toBeLessThan(100)
    expect(v.papSys).toBeGreaterThan(35)
    expect(v.heartRate).toBeGreaterThan(100)
  })

  it('severe-pe: high PA pressure with normal-ish diastolic gradient + hypoxemia', () => {
    const v = SCENARIO_TABLE['severe-pe'].vitals
    expect(v.papSys).toBeGreaterThan(40)
    expect(v.papDia).toBeGreaterThanOrEqual(15)
    // Wide PA pulse pressure (sys - dia)
    expect((v.papSys as number) - (v.papDia as number)).toBeGreaterThanOrEqual(20)
    expect(v.spo2).toBeLessThan(90)
  })

  it('septic-shock: tachycardia + hypotension + low CVP (distributive)', () => {
    const v = SCENARIO_TABLE['septic-shock'].vitals
    expect(v.heartRate).toBeGreaterThan(100)
    expect(v.abpSys).toBeLessThan(90)
    expect(v.cvpMean).toBeLessThan(8)
  })

  it('normal scenario has no overrides', () => {
    const v = SCENARIO_TABLE['normal'].vitals
    expect(Object.keys(v).length).toBe(0)
  })

  it('scenario vitals are within physiologically plausible ranges', () => {
    for (const id of SCENARIO_ORDER) {
      const v = SCENARIO_TABLE[id].vitals
      if (typeof v.heartRate === 'number') {
        expect(v.heartRate, `HR for ${id}`).toBeGreaterThanOrEqual(30)
        expect(v.heartRate, `HR for ${id}`).toBeLessThanOrEqual(220)
      }
      if (typeof v.abpSys === 'number') {
        expect(v.abpSys, `ABP sys for ${id}`).toBeGreaterThanOrEqual(40)
        expect(v.abpSys, `ABP sys for ${id}`).toBeLessThanOrEqual(260)
      }
      if (typeof v.spo2 === 'number') {
        expect(v.spo2, `SpO2 for ${id}`).toBeGreaterThanOrEqual(50)
        expect(v.spo2, `SpO2 for ${id}`).toBeLessThanOrEqual(100)
      }
      if (typeof v.papDia === 'number' && typeof v.papSys === 'number') {
        expect(v.papDia, `PAdia < sys for ${id}`).toBeLessThanOrEqual(v.papSys)
      }
    }
  })
})
