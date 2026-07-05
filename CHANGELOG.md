# Changelog

## v2

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
