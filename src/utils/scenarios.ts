import type { ScenarioId, Vitals, DisconnectState } from '../types/vitals'

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  description: string
  vitals: Partial<Vitals>
  disconnect?: Partial<DisconnectState>
}

export const SCENARIO_TABLE: Record<ScenarioId, ScenarioDefinition> = {
  'normal': {
    id: 'normal',
    label: 'Normal',
    description: 'Stable, healthy adult at rest. Baseline reference for all training.',
    vitals: {},
  },
  'cardiogenic-shock': {
    id: 'cardiogenic-shock',
    label: 'Cardiogenic Shock',
    description: 'Elevated PA pressures (45/25) with hypotension and tachycardia — pump failure pattern.',
    vitals: {
      heartRate: 110, abpSys: 90, abpDia: 60, papSys: 45, papDia: 25,
      cvpMean: 15, spo2: 91, respRate: 22,
    },
  },
  'severe-pe': {
    id: 'severe-pe',
    label: 'Severe PE',
    description: 'Massive pulmonary embolism: high PA pressure with low diastolic gradient, hypoxemia.',
    vitals: {
      heartRate: 130, abpSys: 85, abpDia: 50, papSys: 50, papDia: 20,
      cvpMean: 12, spo2: 88, respRate: 28,
    },
  },
  'septic-shock': {
    id: 'septic-shock',
    label: 'Septic Shock',
    description: 'Distributive shock: tachycardia, hypotension, low SVR, low CVP, mild hypoxemia.',
    vitals: {
      heartRate: 125, abpSys: 80, abpDia: 45, papSys: 30, papDia: 12,
      cvpMean: 5, spo2: 93, respRate: 25,
    },
  },
}

export const SCENARIO_ORDER: ScenarioId[] = [
  'normal', 'cardiogenic-shock', 'severe-pe', 'septic-shock',
]

export function getScenario(id: ScenarioId): ScenarioDefinition {
  return SCENARIO_TABLE[id]
}
