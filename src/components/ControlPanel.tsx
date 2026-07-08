import { useEffect, useMemo, useState } from 'react'
import { useVitalStore, enableBroadcasting } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import type { Rhythm, SignalQuality } from '../types/vitals'
import { evaluateAlarms, isCritical } from '../utils/alarmThresholds'
import QuickEventsSection from './QuickEventsSection'

const RHYTHMS: { value: Rhythm; label: string }[] = [
  { value: 'normal-sinus', label: 'Normal Sinus' },
  { value: 'afib', label: 'A-Fib' },
  { value: 'atrial-flutter', label: 'A-Flutter' },
  { value: 'svt', label: 'SVT' },
  { value: 'v-tach', label: 'V-Tach' },
  { value: 'v-fib', label: 'V-Fib' },
  { value: 'asystole', label: 'Asystole' },
  { value: 'complete-heart-block', label: 'Complete HB' },
]

type AccordionKey = 'ecg' | 'abp' | 'pa' | 'cvp' | 'spo2' | 'resp' | 'wedge' | 'disconnect' | 'alarms'

const PANEL_GROUPS: { title: string; keys: AccordionKey[] }[] = [
  { title: 'Vitals', keys: ['ecg', 'abp', 'pa', 'cvp', 'spo2', 'resp'] },
  { title: 'Procedure', keys: ['wedge', 'disconnect'] },
  { title: 'Alarms', keys: ['alarms'] },
]

const DEFAULT_OPEN: Record<AccordionKey, boolean> = {
  ecg: false, abp: false, pa: false, cvp: false,
  spo2: false, resp: false, wedge: true, disconnect: false, alarms: false,
}

export default function ControlPanel() {
  const store = useVitalStore()
  const vitals = store.vitals
  const disconnect = store.disconnect
  const alarmLimits = store.alarmLimits
  const setScreen = useUIStore(s => s.setScreen)
  const [open, setOpen] = useState<Record<AccordionKey, boolean>>(DEFAULT_OPEN)
  const [helpOpen, setHelpOpen] = useState(false)

  function toggle(k: AccordionKey) {
    setOpen(o => ({ ...o, [k]: !o[k] }))
  }

  // This client is the instructor console → it owns the authoritative state
  // and broadcasts changes to any connected bedside monitor.
  useEffect(() => {
    enableBroadcasting()
  }, [])

  const activeAlarms = useMemo(
    () => evaluateAlarms(vitals, alarmLimits, disconnect),
    [vitals, alarmLimits, disconnect],
  )
  const warnings = activeAlarms.filter(a => !isCritical(a.severity))
  const criticals = activeAlarms.filter(a => isCritical(a.severity))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'r' || e.key === 'R') store.resetToBaseline()
      else if (e.key === ' ') {
        e.preventDefault()
        if (vitals.wedgeInflated) store.deflateWedge()
        else store.beginWedge()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, vitals.wedgeInflated])

  return (
    <div className="flex flex-col h-screen bg-mx-bg text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-mx-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-mx-text-dim tracking-widest">
            INSTRUCTOR CONTROL PANEL
          </span>
          <button
            onClick={() => setHelpOpen(o => !o)}
            className="w-6 h-6 rounded-full border border-mx-border text-mx-text-dim hover:bg-mx-border text-xs"
            title="Keyboard shortcuts"
          >?</button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScreen('monitor')}
            className="px-4 py-1.5 rounded bg-mx-panel border border-mx-border text-sm hover:bg-mx-border"
          >
            Monitor View
          </button>
          <button
            onClick={() => store.resetToBaseline()}
            title="R"
            className="px-4 py-1.5 rounded bg-blue-700 text-sm hover:bg-blue-600"
          >
            Reset to Baseline
          </button>
        </div>
      </div>

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        <LiveStateBadge />

        {/* Quick Events — topmost, highest-priority reach during a live sim */}
        <section>
          <h2 className="text-[10px] font-mono font-bold text-mx-text-dim mb-2 uppercase tracking-widest">
            Quick Events
          </h2>
          <div className="bg-mx-panel border border-mx-border rounded-lg p-3">
            <QuickEventsSection />
          </div>
        </section>

        {PANEL_GROUPS.map(group => (
          <section key={group.title}>
            <h2 className="text-[10px] font-mono font-bold text-mx-text-dim mb-2 uppercase tracking-widest">
              {group.title}
            </h2>
            <div className="space-y-2">
              {group.keys.map(key => {
                if (key === 'ecg')
                  return <Accordion key={key} title="ECG" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="HR (bpm)" value={vitals.heartRate} min={30} max={200} onChange={store.setHR} />
                    <SelectInput label="Rhythm" value={vitals.rhythm}
                      options={RHYTHMS.map(r => ({ value: r.value, label: r.label }))}
                      onChange={(v) => store.setRhythm(v as Rhythm)} />
                  </Accordion>
                if (key === 'abp')
                  return <Accordion key={key} title="Arterial BP" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="Systolic" value={vitals.abpSys} min={50} max={250}
                      onChange={(v) => store.setABP(v, vitals.abpDia)} />
                    <NumInput label="Diastolic" value={vitals.abpDia} min={20} max={150}
                      onChange={(v) => store.setABP(vitals.abpSys, v)} />
                  </Accordion>
                if (key === 'pa')
                  return <Accordion key={key} title="Pulmonary Artery" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="Systolic" value={vitals.papSys} min={10} max={60}
                      onChange={(v) => store.setPA(v, vitals.papDia)} />
                    <NumInput label="Diastolic" value={vitals.papDia} min={2} max={30}
                      onChange={(v) => store.setPA(vitals.papSys, v)} />
                  </Accordion>
                if (key === 'cvp')
                  return <Accordion key={key} title="CVP" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="Mean (mmHg)" value={vitals.cvpMean} min={0} max={25} onChange={store.setCVP} />
                  </Accordion>
                if (key === 'spo2')
                  return <Accordion key={key} title="SpO₂" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="SpO₂ (%)" value={vitals.spo2} min={50} max={100} onChange={store.setSpO2} />
                    <SelectInput label="Signal Quality" value={vitals.signalQuality}
                      options={[
                        { value: 'good', label: 'Good' },
                        { value: 'fair', label: 'Fair' },
                        { value: 'poor', label: 'Poor' },
                      ]}
                      onChange={(v) => store.setSignalQuality(v as SignalQuality)} />
                  </Accordion>
                if (key === 'resp')
                  return <Accordion key={key} title="Respiratory" open={open[key]} onToggle={() => toggle(key)}>
                    <NumInput label="Rate (/min)" value={vitals.respRate} min={6} max={40} onChange={store.setRespRate} />
                    <NumInput label="EtCO₂ (mmHg)" value={vitals.etco2} min={15} max={70} onChange={store.setEtCO2} />
                  </Accordion>
                if (key === 'wedge') return null
                if (key === 'disconnect')
                  return <Accordion key={key} title="Disconnect (transducer fault)" open={open[key]} onToggle={() => toggle(key)}>
                    <ToggleInput label="ART disconnected" value={disconnect.art}
                      onChange={(v) => store.setDisconnect('art', v)}
                      hint="Cable fault or transducer zeroing on the arterial line." />
                    <ToggleInput label="PA disconnected" value={disconnect.pa}
                      onChange={(v) => store.setDisconnect('pa', v)}
                      hint="Cable fault or transducer zeroing on the PA line." />
                    <ToggleInput label="CVP disconnected" value={disconnect.cvp}
                      onChange={(v) => store.setDisconnect('cvp', v)}
                      hint="Cable fault or transducer zeroing on the CVP line." />
                  </Accordion>
                if (key === 'alarms')
                  return <Accordion key={key} title={`Alarm Limits${activeAlarms.length > 0 ? ` — ${activeAlarms.length} active` : ''}`}
                    open={open[key]} onToggle={() => toggle(key)}>
                    {warnings.length > 0 && (
                      <div className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded mb-2">
                        ⚠ Warnings: {warnings.map(w => w.message).join(' · ')}
                      </div>
                    )}
                    {criticals.length > 0 && (
                      <div className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded mb-2">
                        ✕ Criticals: {criticals.map(c => c.message).join(' · ')}
                      </div>
                    )}
                    <NumInput label="HR High" value={alarmLimits.hrHigh} min={60} max={200}
                      onChange={(v) => store.setAlarmLimit('hrHigh', v)} />
                    <NumInput label="HR Low" value={alarmLimits.hrLow} min={20} max={80}
                      onChange={(v) => store.setAlarmLimit('hrLow', v)} />
                    <NumInput label="ABP Sys High" value={alarmLimits.abpSysHigh} min={100} max={200}
                      onChange={(v) => store.setAlarmLimit('abpSysHigh', v)} />
                    <NumInput label="ABP Sys Low" value={alarmLimits.abpSysLow} min={60} max={120}
                      onChange={(v) => store.setAlarmLimit('abpSysLow', v)} />
                    <NumInput label="PAdia High" value={alarmLimits.papDiaHigh} min={15} max={40}
                      onChange={(v) => store.setAlarmLimit('papDiaHigh', v)} />
                    <NumInput label="SpO₂ Low" value={alarmLimits.spo2Low} min={80} max={98}
                      onChange={(v) => store.setAlarmLimit('spo2Low', v)} />
                    <NumInput label="RR High" value={alarmLimits.respRateHigh} min={20} max={45}
                      onChange={(v) => store.setAlarmLimit('respRateHigh', v)} />
                    <NumInput label="RR Low" value={alarmLimits.respRateLow} min={4} max={10}
                      onChange={(v) => store.setAlarmLimit('respRateLow', v)} />
                  </Accordion>
                return null
              })}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-[10px] font-mono font-bold text-mx-text-dim mb-2 uppercase tracking-widest">Procedure</h2>
          <WedgePanel />
        </section>
      </div>
    </div>
  )
}

function LiveStateBadge() {
  const vitals = useVitalStore(s => s.vitals)
  const disconnect = useVitalStore(s => s.disconnect)
  const savedPawp = useVitalStore(s => s.vitals.savedPawp)
  const isSilenced = useUIStore(s => s.isSilenced)
  const silenced = isSilenced()

  const chips: { label: string; value: string; color: string }[] = []
  chips.push({ label: 'HR', value: `${vitals.heartRate}`, color: '#22ff44' })
  chips.push({ label: 'ABP', value: `${vitals.abpSys}/${vitals.abpDia}`, color: '#ff4444' })
  chips.push({ label: 'PA', value: `${vitals.papSys}/${vitals.papDia}`, color: '#ffdd33' })
  chips.push({
    label: 'Wedge',
    value: vitals.wedgeInflated
      ? `INFLATED (${vitals.wedgeBreathCount}/${vitals.wedgeBreathsRequired})`
      : vitals.wedgeBreathCount > 0 ? 'deflated' : 'normal',
    color: vitals.wedgeInflated ? '#ff9933' : '#888',
  })
  if (savedPawp !== null) chips.push({ label: 'PAWP', value: `${savedPawp}`, color: '#ffdd33' })

  const disc: string[] = []
  if (disconnect.art) disc.push('ART')
  if (disconnect.pa) disc.push('PA')
  if (disconnect.cvp) disc.push('CVP')

  return (
    <div className="rounded border border-mx-border bg-mx-panel px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-[10px] font-mono font-bold uppercase text-mx-text-dim tracking-widest">Trainee View</span>
      {chips.map(c => (
        <div key={c.label} className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-mono text-mx-text-dim">{c.label}</span>
          <span className="text-sm font-mono font-bold" style={{ color: c.color }}>{c.value}</span>
        </div>
      ))}
      {disc.length > 0 && (
        <span className="text-xs font-mono font-bold text-red-400">✕ {disc.join(' · ')} disconnected</span>
      )}
      {silenced && <span className="text-[10px] font-mono text-yellow-400">⏸ alarms silenced</span>}
    </div>
  )
}

function WedgePanel() {
  const vitals = useVitalStore(s => s.vitals)
  const begin = useVitalStore(s => s.beginWedge)
  const deflate = useVitalStore(s => s.deflateWedge)
  const savedPawp = useVitalStore(s => s.vitals.savedPawp)
  const clearSavedPawp = useVitalStore(s => s.clearSavedPawp)
  const [confirmClear, setConfirmClear] = useState(false)

  const inflated = vitals.wedgeInflated
  const breaths = vitals.wedgeBreathCount
  const required = vitals.wedgeBreathsRequired

  let statusLabel = 'Normal PA'
  let statusColor = 'text-mx-text-dim'
  if (inflated) {
    statusLabel = `WEDGED — hold for breath ${Math.min(breaths + 1, required)} of ${required}`
    statusColor = 'text-orange-400'
  } else if (breaths > 0) {
    statusLabel = 'Wedge ended — trainee may now Store Trace to measure'
    statusColor = 'text-yellow-400'
  }

  return (
    <Panel title="Wedge (PA occlusion)" open={true} onToggle={() => {}} noToggle>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={begin}
            disabled={inflated}
            className={`flex-1 py-2 rounded font-bold text-sm border ${
              inflated
                ? 'bg-mx-border text-mx-text-dim border-mx-border cursor-not-allowed'
                : 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-600'
            }`}
          >
            Begin Wedge
          </button>
          <button
            onClick={deflate}
            disabled={!inflated}
            className={`flex-1 py-2 rounded font-bold text-sm border ${
              !inflated
                ? 'bg-mx-border text-mx-text-dim border-mx-border cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-500'
            }`}
          >
            Deflate
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-mx-text-dim w-16">Status</span>
          <span className={`text-sm font-mono font-medium ${statusColor}`}>{statusLabel}</span>
        </div>
        {inflated && (
          <BreathDots count={breaths} total={required} />
        )}

        <div className="border-t border-mx-border pt-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-mx-text-dim">
              Saved PAWP:{' '}
              <span className="font-mono font-bold text-yellow-300">
                {savedPawp !== null ? `${savedPawp} mmHg` : '—'}
              </span>
            </div>
            {savedPawp !== null && (
              <button
                onClick={() => {
                  if (confirmClear) clearSavedPawp()
                  else setConfirmClear(true)
                }}
                className={`text-xs px-2 py-0.5 rounded ${
                  confirmClear
                    ? 'bg-red-700 hover:bg-red-600 text-white'
                    : 'bg-mx-border text-mx-text-dim hover:bg-mx-border/70'
                }`}
              >
                {confirmClear ? 'Confirm clear' : 'Clear PAWP'}
              </button>
            )}
          </div>
          <p className="text-[10px] text-mx-text-dim mt-1 leading-snug">
            Trainee physically inflates/deflates the real PA balloon and watches the simulator screen for the morphology change. PAWP persists across Reset to Baseline.
          </p>
        </div>
      </div>
    </Panel>
  )
}

function BreathDots({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border border-yellow-400 ${i < count ? 'bg-yellow-400' : ''}`} />
      ))}
    </div>
  )
}

function Accordion({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return <Panel title={title} open={open} onToggle={onToggle}>{children}</Panel>
}

function Panel({ title, open, onToggle, children, noToggle }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
  noToggle?: boolean
}) {
  return (
    <div className="bg-mx-panel border border-mx-border rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        disabled={noToggle}
        className={`w-full flex items-center justify-between px-3 py-2 ${noToggle ? 'cursor-default' : 'hover:bg-mx-border/40'}`}
      >
        <span className="text-xs font-mono font-bold text-mx-text-dim uppercase tracking-widest">{title}</span>
        {!noToggle && (
          <span className={`text-mx-text-dim text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
            ▼
          </span>
        )}
      </button>
      {open && <div className="border-t border-mx-border p-3 space-y-2">{children}</div>}
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
          className="w-6 h-6 rounded bg-mx-border text-xs font-bold flex items-center justify-center hover:bg-mx-border/70"
        >-</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          className="w-16 text-center text-sm font-mono bg-black border border-mx-border rounded text-white py-0.5"
        />
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded bg-mx-border text-xs font-bold flex items-center justify-center hover:bg-mx-border/70"
        >+
        </button>
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

function ToggleInput({ label, value, onChange, hint }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-mx-text-dim">{label}</span>
        {hint && <p className="text-[10px] text-mx-text-dim/70 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`px-3 py-1 rounded text-xs font-mono font-bold ${
          value ? 'bg-red-700 text-white' : 'bg-mx-border text-mx-text-dim hover:bg-mx-border/70'
        }`}
      >
        {value ? 'DISCONNECTED' : 'OFF'}
      </button>
    </div>
  )
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['R', 'Reset to Baseline'],
    ['Space', 'Begin or deflate wedge'],
    ['?', 'Toggle this help'],
  ]
  return (
    <div className="border-b border-mx-border bg-mx-panel/60 px-4 py-2 text-xs font-mono">
      <div className="flex items-center justify-between mb-1">
        <span className="text-mx-text-dim uppercase tracking-widest">Keyboard shortcuts</span>
        <button onClick={onClose} className="text-mx-text-dim hover:text-white">✕</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 max-w-2xl mx-auto">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-black border border-mx-border text-cyan-300 min-w-[3rem] text-center">{k}</kbd>
            <span className="text-mx-text-dim">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
