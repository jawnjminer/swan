import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import type { Rhythm, SignalQuality } from '../types/vitals'

const RHYTHMS: { value: Rhythm; label: string }[] = [
  { value: 'normal-sinus', label: 'Normal Sinus' },
  { value: 'afib', label: 'A-Fib' },
  { value: 'svt', label: 'SVT' },
  { value: 'v-tach', label: 'V-Tach' },
  { value: 'v-fib', label: 'V-Fib' },
  { value: 'asystole', label: 'Asystole' },
]

const SCENARIOS = [
  { label: 'Normal', vitals: {} },
  {
    label: 'Cardiogenic Shock',
    vitals: { heartRate: 110, abpSys: 90, abpDia: 60, papSys: 45, papDia: 25, cvpMean: 15, spo2: 91, respRate: 22 }
  },
  {
    label: 'Severe PE',
    vitals: { heartRate: 130, abpSys: 85, abpDia: 50, papSys: 50, papDia: 20, cvpMean: 12, spo2: 88, respRate: 28 }
  },
  {
    label: 'Septic Shock',
    vitals: { heartRate: 125, abpSys: 80, abpDia: 45, papSys: 30, papDia: 12, cvpMean: 5, spo2: 93, respRate: 25 }
  },
] as const

export default function ControlPanel() {
  const store = useVitalStore()
  const { setScreen, savedPAWP } = useUIStore()

  function handleInflateWedge() {
    if (store.vitals.wedgeInflated) return
    store.inflateWedge()
  }

  function handleDeflateWedge() {
    if (!store.vitals.wedgeInflated) return
    store.deflateWedge()
  }

  function loadScenario(idx: number) {
    const scenario = SCENARIOS[idx]
    if (idx === 0) {
      store.resetToBaseline()
    } else {
      store.loadScenario(scenario.vitals)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-mx-bg text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-mx-border">
        <span className="text-sm font-mono font-bold text-mx-text-dim">INSTRUCTOR CONTROL PANEL</span>
        <div className="flex gap-2">
          <button
            onClick={() => setScreen('monitor')}
            className="px-4 py-1.5 rounded bg-mx-panel border border-mx-border text-sm text-white hover:bg-mx-border"
          >
            Monitor View
          </button>
          <button
            onClick={() => store.resetToBaseline()}
            className="px-4 py-1.5 rounded bg-blue-700 text-sm text-white hover:bg-blue-600"
          >
            Reset to Baseline
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Scenarios */}
          <Section title="Scenarios">
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => loadScenario(i)}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-mx-panel border border-mx-border text-white hover:bg-mx-border"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Section>

          {/* ECG */}
          <Section title="ECG">
            <div className="space-y-2">
              <NumInput label="HR (bpm)" value={store.vitals.heartRate} min={30} max={200}
                onChange={(v) => store.setHR(v)} />
              <SelectInput label="Rhythm" value={store.vitals.rhythm}
                options={RHYTHMS.map(r => ({ value: r.value, label: r.label }))}
                onChange={(v) => store.setRhythm(v as Rhythm)} />
            </div>
          </Section>

          {/* ABP */}
          <Section title="Arterial BP">
            <div className="space-y-2">
              <NumInput label="Systolic" value={store.vitals.abpSys} min={50} max={250}
                onChange={(v) => store.setABP(v, store.vitals.abpDia)} />
              <NumInput label="Diastolic" value={store.vitals.abpDia} min={20} max={150}
                onChange={(v) => store.setABP(store.vitals.abpSys, v)} />
              <ToggleInput label="ART Disconnect" value={store.disconnect.art}
                onChange={(v) => store.setDisconnect('art', v)} />
            </div>
          </Section>

          {/* PA */}
          <Section title="Pulmonary Artery">
            <div className="space-y-2">
              <NumInput label="Systolic" value={store.vitals.papSys} min={10} max={60}
                onChange={(v) => store.setPA(v, store.vitals.papDia)} />
              <NumInput label="Diastolic" value={store.vitals.papDia} min={2} max={30}
                onChange={(v) => store.setPA(store.vitals.papSys, v)} />
              <ToggleInput label="PA Disconnect" value={store.disconnect.pa}
                onChange={(v) => store.setDisconnect('pa', v)} />
            </div>
          </Section>

          {/* CVP */}
          <Section title="CVP">
            <div className="space-y-2">
              <NumInput label="Mean (mmHg)" value={store.vitals.cvpMean} min={0} max={25}
                onChange={store.setCVP} />
              <ToggleInput label="CVP Disconnect" value={store.disconnect.cvp}
                onChange={(v) => store.setDisconnect('cvp', v)} />
            </div>
          </Section>

          {/* SpO2 */}
          <Section title="SpO2">
            <div className="space-y-2">
              <NumInput label="SpO2 (%)" value={store.vitals.spo2} min={50} max={100}
                onChange={store.setSpO2} />
              <SelectInput label="Signal Quality" value={store.vitals.signalQuality}
                options={[
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                ]}
                onChange={(v) => store.setSignalQuality(v as SignalQuality)} />
            </div>
          </Section>

          {/* Respiratory */}
          <Section title="Respiratory">
            <div className="space-y-2">
              <NumInput label="Rate (/min)" value={store.vitals.respRate} min={6} max={40}
                onChange={store.setRespRate} />
              <NumInput label="EtCO2 (mmHg)" value={store.vitals.etco2} min={15} max={70}
                onChange={store.setEtCO2} />
            </div>
          </Section>

          {/* Wedge Simulation */}
          <Section title="Wedge Simulation">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onMouseDown={handleInflateWedge}
                  onMouseUp={handleDeflateWedge}
                  onMouseLeave={() => store.vitals.wedgeInflated && store.deflateWedge()}
                  className={`flex-1 py-2 rounded font-bold text-sm ${store.vitals.wedgeInflated
                      ? 'bg-orange-600 text-white'
                      : 'bg-mx-panel border border-mx-border text-white hover:bg-mx-border'
                    }`}
                >
                  {store.vitals.wedgeInflated ? 'DEFLA TING...' : 'Hold to Inflate'}
                </button>
              </div>
              <div className="text-xs text-mx-text-dim">
                Status: <span className={store.vitals.wedgeInflated ? 'text-orange-400' : 'text-mx-text-dim'}>
                  {store.vitals.wedgeInflated
                    ? `WEDGED (Breath ${store.vitals.wedgeBreathCount}/${store.vitals.wedgeBreathsRequired})`
                    : 'Normal PA'}
                </span>
              </div>
              {savedPAWP !== null && (
                <div className="text-xs text-mx-pap">
                  Saved PAWP: {savedPAWP} mmHg
                </div>
              )}
            </div>
          </Section>

          {/* Alarm Limits */}
          <Section title="Alarm Limits">
            <div className="space-y-2">
              <NumInput label="HR High" value={store.alarmLimits.hrHigh} min={60} max={200}
                onChange={(v) => store.setAlarmLimit('hrHigh', v)} />
              <NumInput label="HR Low" value={store.alarmLimits.hrLow} min={20} max={80}
                onChange={(v) => store.setAlarmLimit('hrLow', v)} />
              <NumInput label="ABP Sys High" value={store.alarmLimits.abpSysHigh} min={100} max={200}
                onChange={(v) => store.setAlarmLimit('abpSysHigh', v)} />
              <NumInput label="ABP Sys Low" value={store.alarmLimits.abpSysLow} min={60} max={120}
                onChange={(v) => store.setAlarmLimit('abpSysLow', v)} />
              <NumInput label="PAdia High" value={store.alarmLimits.papDiaHigh} min={15} max={40}
                onChange={(v) => store.setAlarmLimit('papDiaHigh', v)} />
              <NumInput label="SpO2 Low" value={store.alarmLimits.spo2Low} min={80} max={98}
                onChange={(v) => store.setAlarmLimit('spo2Low', v)} />
              <NumInput label="RR High" value={store.alarmLimits.respRateHigh} min={20} max={45}
                onChange={(v) => store.setAlarmLimit('respRateHigh', v)} />
              <NumInput label="RR Low" value={store.alarmLimits.respRateLow} min={4} max={10}
                onChange={(v) => store.setAlarmLimit('respRateLow', v)} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-mx-panel border border-mx-border rounded-lg p-3">
      <h3 className="text-xs font-mono font-bold text-mx-text-dim mb-3 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function NumInput({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-mx-text-dim w-32">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 rounded bg-mx-border text-xs font-bold flex items-center justify-center"
        >-</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 text-center text-sm font-mono bg-black border border-mx-border rounded text-white py-0.5"
        />
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded bg-mx-border text-xs font-bold flex items-center justify-center"
        >+</button>
      </div>
    </div>
  )
}

function SelectInput({ label, value, options, onChange }: {
  label: string; value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-mx-text-dim w-32">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-mono bg-black border border-mx-border rounded text-white px-2 py-1"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ToggleInput({ label, value, onChange }: {
  label: string; value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-mx-text-dim w-32">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`px-3 py-1 rounded text-xs font-mono font-bold ${value
            ? 'bg-red-700 text-white'
            : 'bg-mx-border text-mx-text-dim'
          }`}
      >
        {value ? 'DISCONNECTED' : 'OFF'}
      </button>
    </div>
  )
}
