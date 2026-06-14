// Web Audio API alarm tone generator — IEC 60601-1-8 compliant patterns

let audioCtx: AudioContext | null = null
let currentWarningOsc: OscillatorNode | null = null
let currentCriticalOsc: OscillatorNode | null = null
let warningInterval: ReturnType<typeof setInterval> | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

function stopCurrentTones() {
  if (warningInterval) {
    clearInterval(warningInterval)
    warningInterval = null
  }
  if (currentWarningOsc) {
    try { currentWarningOsc.stop() } catch {}
    currentWarningOsc = null
  }
  if (currentCriticalOsc) {
    try { currentCriticalOsc.stop() } catch {}
    currentCriticalOsc = null
  }
}

export function playWarningTone() {
  stopCurrentTones()
  const ctx = getAudioContext()

  // IEC medium priority: alternating 660Hz / 880Hz
  let phase = 0
  warningInterval = setInterval(() => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = phase === 0 ? 660 : 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
    phase = 1 - phase
  }, 500)
}

export function playCriticalTone() {
  stopCurrentTones()
  const ctx = getAudioContext()

  // IEC high priority: continuous 880Hz tone
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  osc.start()
  currentCriticalOsc = osc
}

export function stopAlarmTone() {
  stopCurrentTones()
}

export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}
