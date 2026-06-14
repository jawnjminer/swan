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

    const SWEEP_SPEED = 25
    const PIXELS_PER_SEC = SWEEP_SPEED * (rect.width / 100)

    function draw() {
      const w = rect.width
      const h = rect.height
      const t = (Date.now() - startTimeRef.current) / 1000

      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = '#1e1e22'
      ctx!.lineWidth = 1
      for (let x = 0; x < w; x += 20) {
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
      }
      for (let y = 0; y < h; y += 20) {
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
      }

      // Draw waveform
      ctx!.strokeStyle = color
      ctx!.lineWidth = 2
      ctx!.beginPath()

      const samples = Math.floor(w)
      const yRange = yMax - yMin

      for (let i = 0; i < samples; i++) {
        const x = i
        const age = (samples - i) / PIXELS_PER_SEC
        const tt = t - age

        let value = 0
        let strokeColor = color

        if (tt < 0) {
          if (i === 0) ctx!.moveTo(x, h - ((0 - yMin) / yRange) * h)
          else ctx!.lineTo(x, h - ((0 - yMin) / yRange) * h)
          continue
        }

        switch (type) {
          case 'ecg': {
            value = generateECG(tt, vitals.heartRate, vitals.rhythm) * (yRange * 0.8) + (yMax * 0.4)
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
              const raw = generateABP(tt, vitals.abpSys, vitals.abpDia, vitals.heartRate)
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
              const raw = generatePA(tt, vitals.papSys, vitals.papDia, vitals.heartRate, vitals.wedgeInflated)
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
        if (i === 0) ctx!.moveTo(x, value)
        else ctx!.lineTo(x, value)
      }

      ctx!.stroke()
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [type, color, height, yMin, yMax, wedgeScale, vitals.heartRate, vitals.rhythm, vitals.abpSys, vitals.abpDia, vitals.papSys, vitals.papDia, vitals.cvpMean, vitals.spo2, vitals.signalQuality, vitals.respRate, vitals.etco2, vitals.wedgeInflated, disconnect, wedgeScale])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded"
      style={{ height: `${height}px`, background: '#0a0a0a' }}
    />
  )
}
