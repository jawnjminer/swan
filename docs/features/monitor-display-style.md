# feat: monitor display style

Real Philips MX750-style patient display appearance.

## Goal

Match the reference photo at `resources/monitor.jpeg`:

- Black background across the patient display.
- Each pressure waveform's grid tinted the same color as the waveform.
- Black erase bar (not grey).
- 10-second sweep: the strip always shows 10 s of waveform end-to-end,
  which effectively elongates the patient display to roughly 2× wider
  than tall.
- Retune ABP / PAP / CVP morphologies to match the reference shapes.

## Affected files

| File | Change |
|---|---|
| `src/components/WaveformCanvas.tsx` | Grid tinted to channel color; sweep time = 10 s; erase bar = black; canvas background = black. |
| `src/components/MonitorScreen.tsx` | Outer wrapper constrains patient display to `aspect-ratio: 2 / 1`, centered in the viewport. |
| `src/utils/waveformGenerator.ts` | `generateABP`, `generatePA` (non-wedged branch), `generateCVP` retuned for realistic shapes. |

## Behavior

- Strip width is `rect.width`. Pixel time density = `rect.width / 10` px per
  second. One full sweep across the strip takes exactly 10 s regardless of
  strip width. At HR 78 (~0.77 s/beat) you see ~13 beats per strip, matching
  the photo.
- Aspect constraint uses `min(100vw, 200vh) × min(50vw, 100vh)` so the display
  always fits the viewport while staying at 2:1.
- Grid is drawn at `withAlpha(color, 0.22)` so each channel's grid shares
  its waveform color (e.g., red grid behind ABP).
- Erase bar is `#000000` so it disappears against the black canvas,
  matching the real monitor.
- ABP morphology: sin-eased anacrotic upstroke → rounded systolic peak →
  dicrotic notch → smooth exponential diastolic runoff.
- PAP morphology (non-wedged): sin-eased upstroke, broader rounded peak,
  small dicrotic notch, gentler runoff.
- CVP morphology: distinct a-wave (atrial contraction), x-descent, c-wave
  (tricuspid bulge), x'-descent, v-wave (atrial filling), y-descent
  (tricuspid opens).

## Test plan

1. `npm run build` — clean.
2. `npm run dev` — render with no console errors.
3. Visual check at 1400×800 viewport: aspect ratio reports 2.00, background
   is black, grids are color-tinted per channel, sweep wraps in ~10 s,
   pressure waveforms match the reference shapes.
4. Compare `/tmp/monitor_steady.png` against `resources/monitor.jpeg` for
   side-by-side visual review.
