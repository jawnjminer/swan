import type { EventId, EventCategory, Vitals, DisconnectState } from '../types/vitals'

export interface EventDefinition {
  id: EventId
  label: string
  category: EventCategory
  /**
   * Target patient state for this event.
   * Numeric fields are interpolated over the selected duration.
   * String (rhythm) and boolean fields snap instantly.
   */
  vitals?: Partial<Vitals>
  disconnect?: Partial<DisconnectState>
}

export const EVENT_TABLE: Record<EventId, EventDefinition> = {
  // ─── Hemodynamic ─────────────────────────────────────────────────────────
  'hypotension': {
    id: 'hypotension', label: 'Hypotension', category: 'hemodynamic',
    vitals: { heartRate: 115, abpSys: 85, abpDia: 55, cvpMean: 4, spo2: 94, respRate: 20 },
  },
  'hypertension': {
    id: 'hypertension', label: 'Hypertension', category: 'hemodynamic',
    vitals: { heartRate: 88, abpSys: 180, abpDia: 110 },
  },
  'hemorrhage': {
    id: 'hemorrhage', label: 'Hemorrhage', category: 'hemodynamic',
    vitals: { heartRate: 130, abpSys: 75, abpDia: 45, cvpMean: 2, spo2: 92, papSys: 18, papDia: 8 },
  },
  'vasodilatory-shock': {
    id: 'vasodilatory-shock', label: 'Vasodilatory Shock', category: 'hemodynamic',
    vitals: { heartRate: 125, abpSys: 75, abpDia: 40, cvpMean: 4, papSys: 22, papDia: 9, spo2: 93 },
  },
  'cardiogenic-shock': {
    id: 'cardiogenic-shock', label: 'Cardiogenic Shock', category: 'hemodynamic',
    vitals: { heartRate: 110, abpSys: 90, abpDia: 60, papSys: 45, papDia: 25, cvpMean: 15, spo2: 91, respRate: 22 },
  },
  'septic-shock': {
    id: 'septic-shock', label: 'Septic Shock', category: 'hemodynamic',
    vitals: { heartRate: 125, abpSys: 80, abpDia: 45, papSys: 30, papDia: 12, cvpMean: 5, spo2: 93, respRate: 25 },
  },
  'severe-pe': {
    id: 'severe-pe', label: 'Severe PE', category: 'hemodynamic',
    vitals: { heartRate: 130, abpSys: 85, abpDia: 50, papSys: 50, papDia: 20, cvpMean: 12, spo2: 88, respRate: 28 },
  },

  // ─── Rhythm ──────────────────────────────────────────────────────────────
  'sinus-tach': {
    id: 'sinus-tach', label: 'Sinus Tachycardia', category: 'rhythm',
    vitals: { rhythm: 'normal-sinus', heartRate: 115 },
  },
  'sinus-brady': {
    id: 'sinus-brady', label: 'Sinus Bradycardia', category: 'rhythm',
    vitals: { rhythm: 'normal-sinus', heartRate: 40 },
  },
  'afib': {
    id: 'afib', label: 'Atrial Fibrillation', category: 'rhythm',
    vitals: { rhythm: 'afib', heartRate: 110 },
  },
  'atrial-flutter': {
    id: 'atrial-flutter', label: 'Atrial Flutter', category: 'rhythm',
    vitals: { rhythm: 'atrial-flutter', heartRate: 130 },
  },
  'svt': {
    id: 'svt', label: 'SVT', category: 'rhythm',
    vitals: { rhythm: 'svt', heartRate: 175 },
  },
  'v-tach': {
    id: 'v-tach', label: 'Ventricular Tachycardia', category: 'rhythm',
    vitals: { rhythm: 'v-tach', heartRate: 180, abpSys: 75, abpDia: 40 },
  },
  'v-fib': {
    id: 'v-fib', label: 'Ventricular Fibrillation', category: 'rhythm',
    vitals: { rhythm: 'v-fib', heartRate: 0, abpSys: 0, abpDia: 0 },
  },
  'asystole': {
    id: 'asystole', label: 'Asystole', category: 'rhythm',
    vitals: { rhythm: 'asystole', heartRate: 0, abpSys: 0, abpDia: 0 },
  },
  'complete-heart-block': {
    id: 'complete-heart-block', label: 'Complete Heart Block', category: 'rhythm',
    vitals: { rhythm: 'complete-heart-block', heartRate: 35 },
  },

  // ─── Monitoring ──────────────────────────────────────────────────────────
  'art-dampened': {
    id: 'art-dampened', label: 'Art Line Dampened', category: 'monitoring',
    vitals: { abpDampened: true },
  },
  'art-restored': {
    id: 'art-restored', label: 'Art Line Restored', category: 'monitoring',
    vitals: { abpDampened: false },
  },
  'pa-wedged': {
    id: 'pa-wedged', label: 'PA Wedged', category: 'monitoring',
    vitals: { wedgeInflated: true, paOverWedged: false },
  },
  'pa-over-wedged': {
    id: 'pa-over-wedged', label: 'PA Over-Wedged', category: 'monitoring',
    vitals: { paOverWedged: true, wedgeInflated: true },
  },
  'pa-deflated': {
    id: 'pa-deflated', label: 'PA Deflated', category: 'monitoring',
    vitals: { wedgeInflated: false, paOverWedged: false, wedgeBreathCount: 0 },
  },
  'spo2-off': {
    id: 'spo2-off', label: 'SpO₂ Probe Off', category: 'monitoring',
    vitals: { signalQuality: 'poor' },
  },
  'spo2-restored': {
    id: 'spo2-restored', label: 'SpO₂ Probe Restored', category: 'monitoring',
    vitals: { signalQuality: 'good' },
  },
  'ecg-off': {
    id: 'ecg-off', label: 'ECG Leads Off', category: 'monitoring',
    vitals: { ecgLeadsOff: true },
  },
  'ecg-restored': {
    id: 'ecg-restored', label: 'ECG Leads Restored', category: 'monitoring',
    vitals: { ecgLeadsOff: false },
  },
}

export const EVENT_ORDER: Record<EventCategory, EventId[]> = {
  hemodynamic: [
    'hypotension', 'hypertension', 'hemorrhage', 'vasodilatory-shock',
    'cardiogenic-shock', 'septic-shock', 'severe-pe',
  ],
  rhythm: [
    'sinus-tach', 'sinus-brady', 'afib', 'atrial-flutter', 'svt',
    'v-tach', 'v-fib', 'asystole', 'complete-heart-block',
  ],
  monitoring: [
    'art-dampened', 'art-restored', 'pa-wedged', 'pa-over-wedged', 'pa-deflated',
    'spo2-off', 'spo2-restored', 'ecg-off', 'ecg-restored',
  ],
}

// NOTE: 'rhythm' is intentionally omitted here so the Rhythm quick-events
// section is hidden from the UI. The rhythm EVENT_TABLE entries, EVENT_ORDER
// list, and ECG generator branches all remain in place — re-add 'rhythm' to
// this array to restore the section once the ECG morphology per rhythm is
// fully implemented. The manual Vitals→ECG rhythm dropdown is unaffected.
export const CATEGORY_ORDER: EventCategory[] = ['hemodynamic', 'monitoring']

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  hemodynamic: 'Hemodynamic',
  rhythm: 'Rhythm',
  monitoring: 'Monitoring',
}

/**
 * Events whose button should render "active" (highlighted) when the
 * corresponding state is currently on. Lets the instructor see at a glance
 * which monitoring conditions are engaged.
 */
export const ACTIVE_STATE_MAP: Partial<Record<EventId, (v: Vitals) => boolean>> = {
  'art-dampened': (v) => v.abpDampened,
  'pa-wedged': (v) => v.wedgeInflated && !v.paOverWedged,
  'pa-over-wedged': (v) => v.paOverWedged,
  'spo2-off': (v) => v.signalQuality === 'poor',
  'ecg-off': (v) => v.ecgLeadsOff,
}

export function getEvent(id: EventId): EventDefinition {
  return EVENT_TABLE[id]
}
