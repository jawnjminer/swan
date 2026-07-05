import { useEffect, useRef, useState } from 'react'
import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import WaveformCanvas from './WaveformCanvas'

const COLORS = {
  ecg: '#22ff44',
  pap: '#ffdd33',
  resp: '#ffffff',
}

export default function WedgeWindow() {
  const vitals = useVitalStore(s => s.vitals)
  const deflateWedge = useVitalStore(s => s.deflateWedge)
  const incrementBreath = useVitalStore(s => s.incrementBreath)
  const screen = useUIStore(s => s.screen)
  const setScreen = useUIStore(s => s.setScreen)

  const editing = screen === 'edit-wedge'
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasInflatedRef = useRef(false)

  // breath counter while inflated
  useEffect(() => {
    if (vitals.wedgeInflated && !wasInflatedRef.current) {
      wasInflatedRef.current = true
      const timer = setTimeout(() => {
        breathIntervalRef.current = setInterval(() => incrementBreath(), (60 / vitals.respRate) * 1000)
      }, 2000)
      return () => clearTimeout(timer)
    } else if (!vitals.wedgeInflated) {
      wasInflatedRef.current = false
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current)
        breathIntervalRef.current = null
      }
    }
  }, [vitals.wedgeInflated, vitals.respRate, incrementBreath])

  useEffect(() => () => { if (breathIntervalRef.current) clearInterval(breathIntervalRef.current) }, [])

  function closeWindow() {
    deflateWedge()
    setScreen('monitor')
  }

  const statusMessage = vitals.wedgeInflated
    ? `Balloon inflated — hold for ${vitals.wedgeBreathsRequired} breaths`
    : vitals.wedgeBreathCount > 0
      ? 'Balloon deflated — press Store Trace to measure'
      : 'Ready for balloon inflation'

  return (
    <>
      {/* Status message banner (top, like the reference) */}
      <div className="absolute top-7 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-200 text-black px-4 h-7 rounded shadow-lg">
        <span className="text-xs font-medium">{statusMessage}</span>
        <button onClick={closeWindow} className="text-neutral-600 hover:text-black text-sm">✕</button>
      </div>

      {/* Modal overlay */}
      <div className="absolute inset-0 z-40 flex items-center justify-center" onClick={closeWindow}>
        <div
          className="bg-black border border-neutral-600 shadow-2xl"
          style={{ width: '60%', maxWidth: 900 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 h-8 bg-neutral-700 border-b border-neutral-600">
            <span className="text-xs text-neutral-200 font-medium mx-auto">
              {editing ? 'Wedge — Edit' : 'Wedge'}
            </span>
            <button onClick={closeWindow} className="text-neutral-300 hover:text-white text-sm">✕</button>
          </div>

          {editing ? <EditWedgeContent /> : <LiveWedgeContent />}

          {/* Wedge toolbar */}
          <WedgeToolbar editing={editing} />
        </div>
      </div>
    </>
  )
}

function LiveWedgeContent() {
  const vitals = useVitalStore(s => s.vitals)

  return (
    <div className="p-2">
      {/* ECG + HR */}
      <div className="flex border-b border-neutral-800">
        <div className="flex-1 relative">
          <span className="absolute left-1 top-0.5 text-[11px] font-semibold z-10" style={{ color: COLORS.ecg }}>II</span>
          <WaveformCanvas type="ecg" color={COLORS.ecg} height={56} yMin={-5} yMax={30} />
        </div>
        <div className="w-20 flex flex-col items-end justify-center pr-2">
          <span className="text-[10px]" style={{ color: COLORS.ecg }}>HR</span>
          <span className="text-3xl font-mono font-bold" style={{ color: COLORS.ecg }}>{vitals.heartRate}</span>
        </div>
      </div>

      {/* Resp + RR */}
      <div className="flex border-b border-neutral-800">
        <div className="flex-1 relative">
          <span className="absolute left-1 top-0.5 text-[11px] font-semibold z-10 text-white">Resp</span>
          <WaveformCanvas type="resp" color={COLORS.resp} height={50} yMin={0} yMax={100} />
        </div>
        <div className="w-20 flex flex-col items-end justify-center pr-2">
          <span className="text-[10px] text-white">RR</span>
          <span className="text-3xl font-mono font-bold text-white">{vitals.respRate}</span>
          {vitals.wedgeInflated && (
            <BreathDots count={vitals.wedgeBreathCount} total={vitals.wedgeBreathsRequired} />
          )}
        </div>
      </div>

      {/* PAP — 4x scale, large */}
      <div className="flex">
        <div className="flex-1 relative">
          <span className="absolute left-1 top-0.5 text-[11px] font-semibold z-10" style={{ color: vitals.wedgeInflated ? '#ff9933' : COLORS.pap }}>
            PAP {vitals.wedgeInflated && '(wedged)'}
          </span>
          <WaveformCanvas type="pap" color={COLORS.pap} height={150} yMin={0} yMax={40} wedgeScale={4} />
        </div>
        <div className="w-20 flex flex-col items-end justify-center pr-2">
          <span className="text-[10px]" style={{ color: COLORS.pap }}>PAP</span>
          <span className="text-2xl font-mono font-bold" style={{ color: COLORS.pap }}>
            {vitals.papSys}/{vitals.papDia}
          </span>
          <span className="text-lg font-mono" style={{ color: COLORS.pap }}>
            ({Math.round(vitals.papDia + (vitals.papSys - vitals.papDia) / 3)})
          </span>
        </div>
      </div>
    </div>
  )
}

function EditWedgeContent() {
  const vitals = useVitalStore(s => s.vitals)
  const savePawp = useVitalStore(s => s.savePawp)
  const setScreen = useUIStore(s => s.setScreen)
  const [cursorY, setCursorY] = useState(50)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // frozen PAWP trace
  const trace: { x: number; y: number }[] = []
  {
    const { papSys, papDia, heartRate } = vitals
    const beat = 60 / heartRate
    const amp = (papSys - papDia) * 0.2
    const mean = papDia * 0.8
    for (let t = 0; t < beat * 4; t += 0.008) {
      const phase = (t % beat) / beat
      let v = mean + amp * 0.2
      if (phase >= 0.05 && phase < 0.15) v = mean + amp * 0.6 * Math.sin(Math.PI * (phase - 0.05) / 0.10)
      if (phase >= 0.20 && phase < 0.25) v = mean + amp * 0.4 * Math.sin(Math.PI * (phase - 0.20) / 0.05)
      if (phase >= 0.55 && phase < 0.75) v = mean + amp * Math.sin(Math.PI * (phase - 0.55) / 0.20)
      trace.push({ x: (t / (beat * 4)) * 100, y: v })
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width, h = rect.height
    ctx.clearRect(0, 0, w, h)

    // dashed scale lines
    ctx.strokeStyle = '#3a3a00'
    ctx.setLineDash([4, 4])
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * h
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.setLineDash([])

    // trace
    ctx.strokeStyle = COLORS.pap
    ctx.lineWidth = 2
    ctx.beginPath()
    trace.forEach((pt, i) => {
      const x = (pt.x / 100) * w
      const y = h - (pt.y / 40) * h
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // cursor
    const cy = (1 - cursorY / 100) * h
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 3])
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.moveTo(0, cy - 6); ctx.lineTo(10, cy); ctx.lineTo(0, cy + 6); ctx.fill()
  }, [cursorY, trace])

  const value = Math.round(cursorY * 0.4)

  return (
    <div className="p-3">
      <div className="relative bg-black border border-neutral-800" style={{ height: 220 }}>
        <span className="absolute left-2 top-1 text-[11px] font-semibold z-10" style={{ color: COLORS.pap }}>PAWP (frozen)</span>
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-center">
          <div className="text-4xl font-mono font-bold text-white">{value}</div>
          <div className="text-xs text-neutral-400">mmHg</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setCursorY(Math.min(100, cursorY + 2))}
            className="w-12 h-12 rounded bg-neutral-700 border border-neutral-600 text-2xl text-white hover:bg-neutral-600">▲</button>
          <button onClick={() => setCursorY(Math.max(0, cursorY - 2))}
            className="w-12 h-12 rounded bg-neutral-700 border border-neutral-600 text-2xl text-white hover:bg-neutral-600">▼</button>
          <span className="text-xs text-neutral-400">Adjust cursor to the mean</span>
        </div>
        <button
          onClick={() => { savePawp(value); setScreen('monitor') }}
          className="px-6 py-2 rounded bg-green-600 text-white text-sm font-bold hover:bg-green-700"
        >
          Save Wedge
        </button>
      </div>
    </div>
  )
}

function WedgeToolbar({ editing }: { editing: boolean }) {
  const setScreen = useUIStore(s => s.setScreen)
  const vitals = useVitalStore(s => s.vitals)

  const canStore = !vitals.wedgeInflated && vitals.wedgeBreathCount > 0

  const buttons = editing
    ? ['Acknowl-\nedge', 'Pause\nAlarms', 'Save\nWedge', 'Reference\nWave 1', 'Reference\nWave 2', 'Change\nSpeed', 'Change\nScale', 'Hemo\nCalc']
    : ['Acknowl-\nedge', 'Pause\nAlarms', 'Store\nTrace', 'Reference\nWave 1', 'Reference\nWave 2', 'Change\nSpeed', 'Change\nScale', 'Hemo\nCalc']

  return (
    <div className="flex items-stretch h-12 bg-neutral-800 border-t border-neutral-600">
      {buttons.map((label, i) => {
        const isStore = label === 'Store\nTrace'
        return (
          <button
            key={i}
            onClick={isStore && canStore ? () => setScreen('edit-wedge') : undefined}
            disabled={isStore && !canStore}
            className={`flex-1 flex items-center justify-center border-r border-neutral-700 text-[10px] text-neutral-200 whitespace-pre text-center leading-tight ${
              isStore && canStore ? 'bg-yellow-600/30 hover:bg-yellow-600/50' : isStore ? 'opacity-40' : 'hover:bg-neutral-700'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function BreathDots({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex gap-1 mt-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border border-yellow-400 ${i < count ? 'bg-yellow-400' : ''}`} />
      ))}
    </div>
  )
}
