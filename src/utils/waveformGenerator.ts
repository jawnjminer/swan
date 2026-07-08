// Waveform generation utilities for MX750 simulator

// Time in seconds, returns normalized amplitude 0-1
export function generateECG(t: number, hr: number, rhythm: string, ecgLeadsOff = false): number {
  // Leads-off: flat baseline with low-amplitude electrical noise.
  if (ecgLeadsOff) return 0.1 + Math.random() * 0.04

  // Atrial flutter — 300 bpm sawtooth F-waves with 2:1-style conduction.
  // The ventricular QRS fires at `hr`; the F-waves run independently at 300.
  if (rhythm === 'atrial-flutter') {
    const atrialBeat = 60 / 300
    const aPhase = (t % atrialBeat) / atrialBeat
    // Sawtooth: slow ramp up, fast drop.
    const fWave = aPhase < 0.7 ? (aPhase / 0.7) * 0.22 : (1 - aPhase) / 0.3 * 0.22
    const ventBeat = 60 / hr
    const vPhase = (t % ventBeat) / ventBeat
    if (vPhase >= 0.22 && vPhase < 0.28) {
      const x = (vPhase - 0.22) / 0.06
      return (x < 0.5 ? x * 2 : (1 - x) * 2) + fWave * 0.3
    }
    return fWave
  }

  // Complete heart block — dissociated P-waves (~75 bpm) and a slow, wide
  // ventricular escape rhythm at `hr` (~35 bpm). No fixed PR relationship.
  if (rhythm === 'complete-heart-block') {
    const pBeat = 60 / 75
    const pPhase = (t % pBeat) / pBeat
    const pWave = (pPhase >= 0.05 && pPhase < 0.15)
      ? 0.12 * Math.sin(Math.PI * (pPhase - 0.05) / 0.10)
      : 0
    const qrsBeat = 60 / hr
    const qrsPhase = (t % qrsBeat) / qrsBeat
    if (qrsPhase >= 0.20 && qrsPhase < 0.35) {
      const x = (qrsPhase - 0.20) / 0.15  // wide QRS
      return pWave + (x < 0.5 ? x * 2 : (1 - x) * 2) * 0.9
    }
    return pWave
  }

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

export function generateABP(t: number, sys: number, dia: number, hr: number, dampened = false): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration

  // Dampened arterial line — narrow pulse pressure, rounded sinusoid, no
  // dicrotic notch. Underlying sys/dia unchanged; only the trace flattens.
  if (dampened) {
    const amp = (sys - dia) * 0.20
    const dampOffset = dia + (sys - dia) * 0.55
    return dampOffset + amp * Math.sin(Math.PI * phase)
  }

  const amplitude = sys - dia
  const offset = dia

  // Anacrotic upstroke — sharp, near-vertical rise to the systolic peak.
  if (phase < 0.10) {
    const x = phase / 0.10
    // Ease-out so the very top rounds into the peak rather than a corner.
    return offset + amplitude * Math.sin((Math.PI / 2) * x)
  }

  // Rounded systolic peak, beginning the gentle decline toward the notch.
  if (phase < 0.22) {
    const x = (phase - 0.10) / 0.12
    // Smooth fall from 1.0 -> ~0.55 (the pre-notch shoulder).
    return offset + amplitude * (1.0 - 0.45 * (0.5 - 0.5 * Math.cos(Math.PI * x)))
  }

  // Dicrotic notch — a brief dip, then the small dicrotic wave rebound.
  if (phase < 0.30) {
    const x = (phase - 0.22) / 0.08
    // Dip to ~0.45 at the notch, rebound to a small ~0.58 dicrotic peak.
    const notch = 0.55 - 0.12 * Math.sin(Math.PI * x)
    return offset + amplitude * notch
  }

  // Diastolic runoff — smooth, rounded exponential decay back to diastole.
  if (phase < 1.0) {
    const x = (phase - 0.30) / 0.70
    return offset + amplitude * 0.5 * Math.exp(-2.6 * x)
  }

  return offset
}

export function generatePA(t: number, sys: number, dia: number, hr: number, wedged: boolean, overWedged = false): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration

  // Over-wedged — balloon too distal, occludes a branch. High, flat trace
  // approximating LVEDP with only slight respiratory variation, no phasic
  // pulse. This is the safety-teaching morphology (recognize before rupture).
  if (overWedged) {
    const mean = dia + (sys - dia) * 0.85
    return mean + 0.5 * Math.sin((t % 4) * Math.PI / 4)  // slow respiratory drift
  }

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

  // Normal PA — lower, more rounded than ABP, with a soft systolic peak
  // and a clear dicrotic notch on the descent (pulmonary valve closure).
  const amplitude = sys - dia
  const offset = dia

  // Gentle systolic upstroke (slower / more rounded than arterial).
  if (phase < 0.14) {
    const x = phase / 0.14
    return offset + amplitude * Math.sin((Math.PI / 2) * x)
  }

  // Broad, rounded systolic peak.
  if (phase < 0.30) {
    const x = (phase - 0.14) / 0.16
    return offset + amplitude * (1.0 - 0.35 * (0.5 - 0.5 * Math.cos(Math.PI * x)))
  }

  // Dicrotic notch and small rebound.
  if (phase < 0.40) {
    const x = (phase - 0.30) / 0.10
    return offset + amplitude * (0.55 - 0.12 * Math.sin(Math.PI * x))
  }

  // Diastolic runoff.
  if (phase < 1.0) {
    const x = (phase - 0.40) / 0.60
    return offset + amplitude * 0.5 * Math.exp(-2.4 * x)
  }
  return offset
}

export function generateCVP(t: number, mean: number, hr: number): number {
  const beatDuration = 60 / hr
  const phase = (t % beatDuration) / beatDuration
  const amp = 3

  // a wave — atrial contraction (tallest positive deflection).
  if (phase < 0.14) {
    return mean + amp * 0.85 * Math.sin(Math.PI * phase / 0.14)
  }
  // x descent — atrial relaxation, dips below mean.
  if (phase < 0.20) {
    const x = (phase - 0.14) / 0.06
    return mean - amp * 0.25 * Math.sin(Math.PI * x)
  }
  // c wave — tricuspid bulge during early ventricular systole (small bump).
  if (phase < 0.30) {
    const x = (phase - 0.20) / 0.10
    return mean + amp * 0.45 * Math.sin(Math.PI * x)
  }
  // x' descent — continued systolic atrial relaxation (lowest point).
  if (phase < 0.48) {
    const x = (phase - 0.30) / 0.18
    return mean - amp * 0.45 * Math.sin(Math.PI * x)
  }
  // v wave — atrial filling against a closed tricuspid valve.
  if (phase < 0.74) {
    const x = (phase - 0.48) / 0.26
    return mean + amp * 0.7 * Math.sin(Math.PI * x)
  }
  // y descent — tricuspid opens, atrium empties, settles back to baseline.
  if (phase < 1.0) {
    const x = (phase - 0.74) / 0.26
    return mean - amp * 0.2 * Math.sin(Math.PI * x)
  }
  return mean
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
