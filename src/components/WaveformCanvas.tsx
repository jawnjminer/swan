import { useEffect, useRef } from 'react'
import { useVitalStore } from '../stores/vitalStore'
import {
  generateECG,
  generateABP,
  generatePA,
  generateCVP,
  generatePleth,
  generateResp,
} from '../utils/waveformGenerator'

type WaveformType = 'ecg' | 'abp' | 'pap' | 'cvp' | 'pleth' | 'resp'

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return hex
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${a})`
}

interface WaveformCanvasProps {
  type: WaveformType
  color: string
  height: number
  yMin: number
  yMax: number
  wedgeScale?: number
}

export default function WaveformCanvas({ type, color, height, yMin, yMax, wedgeScale = 1 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())
  const disconnectRef = useRef({ art: false, pa: false, cvp: false })

  const vitals = useVitalStore(s => s.vitals)
  const disconnect = useVitalStore(s => s.disconnect)
  disconnectRef.current = disconnect

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

    startTimeRef.current = Date.now()

    // The strip always shows 10 seconds of waveform end-to-end. One full
    // sweep across the width takes exactly STRIP_SECONDS, regardless of how
    // wide the canvas is rendered.
    const STRIP_SECONDS = 10
    const PIXELS_PER_SEC = rect.width / STRIP_SECONDS
    const BOOT_DURATION = 5

    function draw() {
      const w = rect.width
      const h = rect.height
      const t = (Date.now() - startTimeRef.current) / 1000
      const inBoot = t < BOOT_DURATION

      ctx!.clearRect(0, 0, w, h)

      // Grid — tinted the same color as the waveform (matches the real
      // Philips monitor where each pressure channel's gridlines share the
      // channel color), drawn faint over the black background.
      ctx!.strokeStyle = withAlpha(color, 0.22)
      ctx!.lineWidth = 1
      for (let x = 0; x < w; x += 20) {
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
      }
      for (let y = 0; y < h; y += 20) {
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
      }

      const samples = Math.floor(w)
      const yRange = yMax - yMin
      ctx!.lineWidth = 2

      // ----- BOOT / WARMUP PHASE -----
      // Faint baseline trace at full width; a grey bar sweeps L→R, fading
      // the trace from "fresh" (40% alpha) to "faded" (15% alpha) as it
      // passes. Mimics the "no patient yet" sweep of a real monitor.
      if (inBoot) {
        const bootElapsed = t
        const sweepTime = BOOT_DURATION
        const barX = (bootElapsed / sweepTime) * w

        // Flat baseline y-position per channel (no generator call — we
        // want a true flat line at the resting value, not a noisy preview).
        let baselineY: number
        switch (type) {
          case 'ecg':   baselineY = h - ((0 - yMin) / yRange) * h; break
          case 'abp':   baselineY = h - ((vitals.abpDia - yMin) / yRange) * h; break
          case 'pap':   baselineY = h - ((vitals.papDia * wedgeScale - yMin) / (yRange * wedgeScale)) * h; break
          case 'cvp':   baselineY = h - ((vitals.cvpMean - yMin) / yRange) * h; break
          case 'pleth': baselineY = h - ((0.2 * (yRange * 0.7) + yMin + yRange * 0.1 - yMin) / yRange) * h; break
          case 'resp':  baselineY = h - ((0.3 * (yRange * 0.8) + yMin + yRange * 0.1 - yMin) / yRange) * h; break
        }

        // Faded region: left of bar
        ctx!.beginPath()
        ctx!.moveTo(0, baselineY)
        ctx!.lineTo(barX, baselineY)
        ctx!.strokeStyle = withAlpha(color, 0.15)
        ctx!.stroke()

        // Fresh region: right of bar
        ctx!.beginPath()
        ctx!.moveTo(barX, baselineY)
        ctx!.lineTo(w, baselineY)
        ctx!.strokeStyle = withAlpha(color, 0.4)
        ctx!.stroke()

        // Erase bar (black, as on the real monitor)
        ctx!.fillStyle = '#000000'
        ctx!.fillRect(barX - 1, 0, 2, h)

        animationRef.current = requestAnimationFrame(draw)
        return
      }

      // ----- STEADY-STATE PHASE -----
      // The trace is always present across the whole strip (no
      // growing/blanking). A grey bar sweeps L→R at sweep speed; when
      // it reaches the right edge, it wraps to the left and continues.
      // The bar marks the "seam" between the just-painted region and
      // the about-to-be-overwritten region. The trace at pixel i shows
      // the sample the bar was at when it last passed i — which makes
      // the trace mathematically continuous across the wrap.
      const tSteady = t - BOOT_DURATION
      const STEADY_BAR_WIDTH = 2
      const barX = (tSteady * PIXELS_PER_SEC) % (w + STEADY_BAR_WIDTH)

      // Map pixel i → the time the bar was at column i.
      //   i < barX:  in the current cycle, last painted at
      //              tSteady - (barX - i)/pxPerSec
      //   i >= barX: in the previous cycle, last painted at
      //              tSteady - (w + BAR_WIDTH - (i - barX))/pxPerSec
      const ttAt = (i: number): number => {
        if (i < barX) {
          return tSteady - (barX - i) / PIXELS_PER_SEC
        } else {
          return tSteady - (w + STEADY_BAR_WIDTH - (i - barX)) / PIXELS_PER_SEC
        }
      }

      // Draw the trace continuously across the entire strip.
      ctx!.beginPath()
      let pathStarted = false
      for (let i = 0; i < samples; i++) {
        const tt = ttAt(i)
        if (tt < 0) continue

        let value = 0
        let strokeColor = color

        switch (type) {
          case 'ecg': {
            value = generateECG(tt, vitals.heartRate, vitals.rhythm, vitals.ecgLeadsOff) * (yRange * 0.8) + (yMax * 0.4)
            value = ((value - yMin) / yRange) * h
            value = h - value
            break
          }
          case 'abp': {
            const d = disconnectRef.current
            if (d.art) {
              value = h - (0.05 * h)
              strokeColor = '#ff6666'
            } else {
              const raw = generateABP(tt, vitals.abpSys, vitals.abpDia, vitals.heartRate, vitals.abpDampened)
              value = ((raw - yMin) / yRange) * h
              value = h - value
              strokeColor = color
            }
            break
          }
          case 'pap': {
            const d2 = disconnectRef.current
            if (d2.pa) {
              value = h - (0.05 * h)
              strokeColor = '#ffcc66'
            } else {
              const raw = generatePA(tt, vitals.papSys, vitals.papDia, vitals.heartRate, vitals.wedgeInflated, vitals.paOverWedged)
              const scaled = raw * wedgeScale
              value = ((scaled - yMin) / (yRange * wedgeScale)) * h
              value = h - value
              strokeColor = color
            }
            break
          }
          case 'cvp': {
            const d3 = disconnectRef.current
            if (d3.cvp) {
              value = h - (0.05 * h)
              strokeColor = '#6699ff'
            } else {
              const raw = generateCVP(tt, vitals.cvpMean, vitals.heartRate)
              value = ((raw - yMin) / yRange) * h
              value = h - value
              strokeColor = color
            }
            break
          }
          case 'pleth': {
            const raw = generatePleth(tt, vitals.heartRate, vitals.spo2, vitals.signalQuality)
            value = raw * (yRange * 0.7) + (yMin + yRange * 0.1)
            value = ((value - yMin) / yRange) * h
            value = h - value
            break
          }
          case 'resp': {
            const raw = generateResp(tt, vitals.respRate, vitals.etco2)
            value = raw * (yRange * 0.8) + (yMin + yRange * 0.1)
            value = ((value - yMin) / yRange) * h
            value = h - value
            break
          }
        }

        ctx!.strokeStyle = strokeColor
        if (!pathStarted) { ctx!.moveTo(i, value); pathStarted = true }
        else ctx!.lineTo(i, value)
      }
      if (pathStarted) ctx!.stroke()

      // The erase bar: a thin black column marking the seam.
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(barX - 1, 0, STEADY_BAR_WIDTH, h)
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [type, color, height, yMin, yMax, wedgeScale, vitals.heartRate, vitals.rhythm, vitals.abpSys, vitals.abpDia, vitals.papSys, vitals.papDia, vitals.cvpMean, vitals.spo2, vitals.signalQuality, vitals.respRate, vitals.etco2, vitals.wedgeInflated, vitals.abpDampened, vitals.ecgLeadsOff, vitals.paOverWedged, disconnect, wedgeScale])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded"
      style={{ height: `${height}px`, background: '#000000' }}
    />
  )
}
