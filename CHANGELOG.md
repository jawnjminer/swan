# Changelog

## v2

### fix: continuous waveform sweep + hide Rhythm quick-events

- **Waveform continuity fix.** Instructor changes (and gradual-transition
  ticks) no longer blank/restart the bedside trace. The animation loop reads
  live vitals from refs and depends on canvas geometry only, so the sweep
  runs uninterrupted and new morphology/values appear at the sweep bar —
  matching a real bedside monitor. Previously any change tore down the loop,
  reset the sweep clock, and re-entered the 5s boot blank.
- **Rhythm quick-events section hidden.** The one-click Rhythm buttons are
  removed from the instructor panel (afib/svt/v-tach currently render normal-
  sinus morphology at a different rate rather than the correct waveform shape;
  per-rhythm ECG morphology is deferred). The manual Vitals→ECG rhythm
  dropdown remains. Re-enable by adding 'rhythm' back to CATEGORY_ORDER.


### feat: quick events, gradual transitions, cross-device sync

- **25 one-click clinical events** across Hemodynamic / Rhythm / Monitoring,
  replacing the old Scenarios section as the topmost control.
- **Global duration selector** (Instant | 10s | 30s | 60s | 2min). Numeric
  fields interpolate over the duration; rhythm/boolean fields snap. Firing a
  new event mid-transition interrupts and re-bases from current values. A
  countdown banner shows progress with a Cancel control.
- **Five new waveform behaviors**: atrial flutter, complete heart block,
  dampened arterial line, over-wedged PA trace, and ECG leads-off.
- **Optional cross-device sync via Supabase Realtime**: the Instructor
  Console broadcasts authoritative state; a bedside monitor on a separate
  device hydrates from a snapshot and tracks live changes (<250 ms). Single
  global session, no pairing. No-ops when Supabase env vars are absent, so
  the app still runs as a single-device simulator.
- Tests: 36 passing (was 20) — event-table integrity + fireEvent tween paths.
- See `docs/features/quick-events-and-transitions.md`.

### feat: instructor control panel V2

Reshapes the instructor's control panel from a flat 2-up grid into a
structured, scenario-first instructor station:

- **Named sections**: Setup / Vitals / Procedure / Alarms.
- **Trainee View badge** at the top shows live HR, ABP, PA, current
  wedge state, any disconnects, alarm-silence status.
- **Scenarios** are now labeled entries with clinical descriptions,
  loaded by id from `utils/scenarios.ts`.
- **Wedge workflow** is now explicit `Begin Wedge` / `Deflate` buttons
  on the instructor panel (was hold-to-release).
- **Saved PAWP** persists across Reset to Baseline by default; an
  explicit `Clear PAWP` button (with confirm) clears it.
- **Alarm limits section** shows live warning/critical banners, driven
  by the same shared `evaluateAlarms` helper as `AlarmMonitor`.
- **Keyboard shortcuts**: `1`–`4` load scenarios, `R` resets to
  baseline, `Space` toggles wedge, `?` shows shortcut help.
- **SmartKeys Instructor entry**: instructor can reach the panel from
  the More menu on the trainee monitor via a dedicated cell with red
  top border + INST. chip — between Monitor Standby and Wedge.

SAVED PAWP also renders as a yellow strip below the waveform column on
the monitor screen (matching the PAp color, per Q14).

### Tests

Vitest added as a dev dependency. 20 unit tests cover:
- Scenario table shape, ordering, clinical signatures, physiological
  ranges.
- Alarm-threshold evaluation per band (HR / ABP / PAP / SpO2 / Resp)
  and disconnect-always-fires behavior.
- Vital store actions: `applyScenario`, `resetToBaseline` PAWP
  persistence, `beginWedge`/`deflateWedge`.

Run with `npm test`.

### Earlier (v2)

- `feat: black erase bar, color-matched grid, 10s sweep, black canvas bg`
  (`274418e`)
- `feat: lock patient display to 2:1 aspect ratio` (`c3df376`)
- `feat: retune ABP/PAP/CVP morphologies to match reference photo`
  (`8dc7898`)
- `docs: feature spec for monitor-display-style` (`209a3b9`)
- `chore: swap monitor assets (.mov -> .mp4)` (`ee43b57`)
