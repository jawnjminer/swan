import { describe, it, expect } from 'vitest'
import {
  EVENT_TABLE, EVENT_ORDER, CATEGORY_ORDER, ACTIVE_STATE_MAP, getEvent,
} from '../events'
import type { EventId, Vitals } from '../../types/vitals'
import { BASELINE_VITALS } from '../../stores/vitalStore'

describe('EVENT_ORDER / EVENT_TABLE', () => {
  it('covers the expected count per category', () => {
    expect(EVENT_ORDER.hemodynamic).toHaveLength(7)
    expect(EVENT_ORDER.rhythm).toHaveLength(9)
    expect(EVENT_ORDER.monitoring).toHaveLength(9)
  })

  it('every ordered id exists in the table with a matching id + non-empty label', () => {
    for (const cat of CATEGORY_ORDER) {
      for (const id of EVENT_ORDER[cat]) {
        const def = getEvent(id)
        expect(def, `event ${id} exists`).toBeDefined()
        expect(def.id).toBe(id)
        expect(def.category).toBe(cat)
        expect(def.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('EVENT_ORDER references every key in EVENT_TABLE exactly once', () => {
    const ordered = CATEGORY_ORDER.flatMap(c => EVENT_ORDER[c])
    const tableKeys = Object.keys(EVENT_TABLE) as EventId[]
    expect(ordered.slice().sort()).toEqual(tableKeys.slice().sort())
  })

  it('hemodynamic numeric vitals are within plausible physiological ranges', () => {
    for (const id of EVENT_ORDER.hemodynamic) {
      const v = EVENT_TABLE[id].vitals ?? {}
      if (typeof v.heartRate === 'number') {
        expect(v.heartRate, `HR ${id}`).toBeGreaterThanOrEqual(30)
        expect(v.heartRate, `HR ${id}`).toBeLessThanOrEqual(220)
      }
      if (typeof v.abpSys === 'number' && typeof v.abpDia === 'number') {
        expect(v.abpDia, `dia<sys ${id}`).toBeLessThan(v.abpSys)
      }
      if (typeof v.spo2 === 'number') {
        expect(v.spo2, `SpO2 ${id}`).toBeGreaterThanOrEqual(50)
        expect(v.spo2, `SpO2 ${id}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('pa-deflated clears both wedge flags', () => {
    const v = EVENT_TABLE['pa-deflated'].vitals!
    expect(v.wedgeInflated).toBe(false)
    expect(v.paOverWedged).toBe(false)
  })

  it('pa-over-wedged sets both paOverWedged and wedgeInflated', () => {
    const v = EVENT_TABLE['pa-over-wedged'].vitals!
    expect(v.paOverWedged).toBe(true)
    expect(v.wedgeInflated).toBe(true)
  })

  it('rhythm events carry a valid rhythm enum', () => {
    const validRhythms = new Set([
      'normal-sinus', 'afib', 'atrial-flutter', 'svt', 'v-tach', 'v-fib',
      'asystole', 'complete-heart-block',
    ])
    for (const id of EVENT_ORDER.rhythm) {
      const r = EVENT_TABLE[id].vitals?.rhythm
      expect(validRhythms.has(r as string), `rhythm for ${id}: ${r}`).toBe(true)
    }
  })
})

describe('ACTIVE_STATE_MAP', () => {
  it('predicates return false for a baseline patient', () => {
    for (const id of Object.keys(ACTIVE_STATE_MAP) as EventId[]) {
      const fn = ACTIVE_STATE_MAP[id]!
      expect(fn(BASELINE_VITALS), `${id} inactive at baseline`).toBe(false)
    }
  })

  it('predicates flip true when the corresponding state is engaged', () => {
    const mk = (over: Partial<Vitals>): Vitals => ({ ...BASELINE_VITALS, ...over })
    expect(ACTIVE_STATE_MAP['art-dampened']!(mk({ abpDampened: true }))).toBe(true)
    expect(ACTIVE_STATE_MAP['pa-wedged']!(mk({ wedgeInflated: true }))).toBe(true)
    expect(ACTIVE_STATE_MAP['pa-wedged']!(mk({ wedgeInflated: true, paOverWedged: true }))).toBe(false)
    expect(ACTIVE_STATE_MAP['pa-over-wedged']!(mk({ paOverWedged: true }))).toBe(true)
    expect(ACTIVE_STATE_MAP['spo2-off']!(mk({ signalQuality: 'poor' }))).toBe(true)
    expect(ACTIVE_STATE_MAP['ecg-off']!(mk({ ecgLeadsOff: true }))).toBe(true)
  })
})
