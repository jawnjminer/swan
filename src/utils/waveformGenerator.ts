// Waveform generation utilities for MX750 simulator

// Time in seconds, returns normalized amplitude 0-1
export function generateECG(t: number, hr: number, rhythm: string): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration // 0-1 per beat

  if (rhythm === 'asystole' || rhythm === 'v-fib') return 0.1 + Math.random() * 0.05

  // P wave
  if (phase >= 0.05 && phase < 0.15) {
    return 0.15 * Math.sin(Math.PI * (phase - 0.05) / 0.10)
  }

  // PR segment (flat)
  if (phase >= 0.15 && phase < 0.20) return 0

  // Q wave (small dip)
  if (phase >= 0.20 && phase < 0.23) {
    return -0.1 * Math.sin(Math.PI * (phase - 0.20) / 0.03)
  }

  // R wave (sharp spike)
  if (phase >= 0.23 && phase < 0.26) {
    const x = (phase - 0.23) / 0.03
    return x < 0.5 ? x * 2 : (1 - x) * 2
  }

  // S wave (negative dip after R)
  if (phase >= 0.26 && phase < 0.32) {
    return -0.2 * Math.sin(Math.PI * (phase - 0.26) / 0.06)
  }

  // ST segment
  if (phase >= 0.32 && phase < 0.40) return 0

  // T wave
  if (phase >= 0.40 && phase < 0.60) {
    return 0.25 * Math.sin(Math.PI * (phase - 0.40) / 0.20)
  }

  return 0
}

export function generateABP(t: number, sys: number, dia: number, hr: number): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration

  const amplitude = sys - dia
  const offset = dia

  // Systolic rise (fast upstroke)
  if (phase < 0.12) {
    const x = phase / 0.12
    return offset + amplitude * (x < 0.5 ? x * 2 : 1) * 0.7
  }

  // Systolic peak
  if (phase < 0.18) {
    const x = (phase - 0.12) / 0.06
    return offset + amplitude * (1 - 0.3 * Math.sin(Math.PI * x))
  }

  // Dichrotic notch
  if (phase < 0.25) {
    const x = (phase - 0.18) / 0.07
    return offset + amplitude * (0.75 - 0.15 * Math.sin(Math.PI * x))
  }

  // Diastolic decay
  if (phase < 1.0) {
    const x = (phase - 0.25) / 0.75
    return offset + amplitude * 0.7 * Math.exp(-3 * x)
  }

  return offset
}

export function generatePA(t: number, sys: number, dia: number, hr: number, wedged: boolean): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration

  if (wedged) {
    // PAWP morphology — flattened, rounded, with a/c/v wave appearance
    const amp = (sys - dia) * 0.2
    const mean = dia * 0.8

    // a wave (atrial contraction — small bump before systole)
    if (phase >= 0.05 && phase < 0.15) {
      return mean + amp * 0.6 * Math.sin(Math.PI * (phase - 0.05) / 0.10)
    }
    // c wave (ventricular systole — small bump)
    if (phase >= 0.20 && phase < 0.25) {
      return mean + amp * 0.4 * Math.sin(Math.PI * (phase - 0.20) / 0.05)
    }
    // v wave (atrial filling — larger bump in late systole)
    if (phase >= 0.55 && phase < 0.75) {
      return mean + amp * Math.sin(Math.PI * (phase - 0.55) / 0.20)
    }
    return mean + amp * 0.2
  }

  // Normal PA — similar to ABP but lower amplitude
  const amplitude = (sys - dia) * 0.85
  const offset = dia

  if (phase < 0.10) {
    return offset + amplitude * (phase / 0.10) * 0.8
  }
  if (phase < 0.16) {
    const x = (phase - 0.10) / 0.06
    return offset + amplitude * (0.8 + 0.2 * Math.sin(Math.PI * x))
  }
  if (phase < 0.22) {
    const x = (phase - 0.16) / 0.06
    return offset + amplitude * (1.0 - 0.25 * Math.sin(Math.PI * x))
  }
  if (phase < 1.0) {
    const x = (phase - 0.22) / 0.78
    return offset + amplitude * 0.75 * Math.exp(-3 * x)
  }
  return offset
}

export function generateCVP(t: number, mean: number, hr: number): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration
  const amp = 3

  // a wave
  if (phase >= 0.05 && phase < 0.15) {
    return mean + amp * 0.7 * Math.sin(Math.PI * (phase - 0.05) / 0.10)
  }
  // c wave
  if (phase >= 0.20 && phase < 0.25) {
    return mean + amp * 0.4 * Math.sin(Math.PI * (phase - 0.20) / 0.05)
  }
  // v wave
  if (phase >= 0.55 && phase < 0.75) {
    return mean + amp * 0.6 * Math.sin(Math.PI * (phase - 0.55) / 0.20)
  }
  return mean + amp * 0.15
}

export function generatePleth(t: number, hr: number, _spo2: number, quality: string): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration

  const amp = quality === 'good' ? 0.8 : quality === 'fair' ? 0.5 : 0.25
  const baseline = 0.2

  if (phase < 0.2) {
    const x = phase / 0.2
    return baseline + amp * x
  }
  if (phase < 0.4) {
    const x = (phase - 0.2) / 0.2
    return baseline + amp * (1 - x * 0.3)
  }
  if (phase < 0.6) {
    return baseline + amp * 0.7
  }
  const x = (phase - 0.6) / 0.4
  return baseline + amp * 0.7 * Math.exp(-3 * x)
}

export function generateResp(t: number, rate: number, etco2: number): number {
  const cycleDuration = 60 / rate
  const phase = (t % cycleDuration) / cycleDuration

  const amp = (etco2 / 70) * 0.7

  if (phase < 0.3) {
    const x = phase / 0.3
    return 0.3 + amp * x
  }
  if (phase < 0.5) {
    return 0.3 + amp
  }
  const x = (phase - 0.5) / 0.5
  return 0.3 + amp * (1 - x)
}

export function calculateMAP(sys: number, dia: number): number {
  return Math.round(dia + (sys - dia) / 3)
}

export function calculatePAMean(sys: number, dia: number): number {
  return Math.round(dia + (sys - dia) / 3)
}
