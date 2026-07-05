# feat: instructor control panel V2

Production-grade instructor station for the Philips MX750 patient-monitor
simulator. Replaces the existing flat 2-up control panel grid with a
structured, scenario-first instructor UX that mirrors what the trainee
is currently seeing on the monitor screen.

## Goal

Give instructors running PA-catheter training the controls they need,
without flipping back and forth between the monitor and the panel:

- **At-a-glance status.** A "Trainee View" badge at the top of the
  instructor panel shows live HR, ABP, PA, current wedge state, any
  active disconnects, and alarm-silence status — exactly what the
  trainee sees on the patient display.
- **Pre-built scenarios with descriptions.** Four named clinical
  scenarios (Normal / Cardiogenic Shock / Severe PE / Septic Shock)
  each render with a one-line clinical description so an instructor
  can pick the right one mid-session.
- **Explicit wedge workflow.** The previous hold-to-release inflate
  is replaced with two clear buttons: **Begin Wedge** (instructor only)
  and **Deflate** (instructor only). The trainee physically inflates
  and deflates the real PA balloon while watching the simulator screen
  for the morphology change.
- **PAWP persists across reset.** Saved PAWP value survives Reset to
  Baseline by default. An explicit **Clear PAWP** button (with confirm)
  is provided for the rare case where a measurement must be retracted.
- **Live alarm preview on the panel.** The same `evaluateAlarms`
  function drives both `AlarmMonitor` (sound) and the instructor panel
  preview — they cannot disagree.
- **Keyboard shortcuts.** `1`–`4` load scenarios; `R` resets to
  baseline; `Space` begins/deflates the wedge; `?` toggles the
  in-panel shortcut help.
- **SmartKeys Instructor entry.** The instructor can also reach the
  panel from the More menu on the trainee monitor — a dedicated cell
  with a red top border + INST. chip, between Monitor Standby and
  Wedge, so a trainee can tell at a glance that it's non-clinical.

## Affected files

| File | Change |
|---|---|
| `src/types/vitals.ts` | Add `ScenarioId`, `DisconnectChannel`, `InstructorView` union types; add `Vitals.savedPawp`. |
| `src/utils/scenarios.ts` *(new)* | `SCENARIO_TABLE` with id, label, description, vitals, optional disconnect state per scenario. |
| `src/utils/alarmThresholds.ts` *(new)* | Pure `evaluateAlarms(vitals, limits, disconnect)` and `isCritical(severity)` helpers, shared by `AlarmMonitor` and the control panel. |
| `src/stores/vitalStore.ts` | Export `BASELINE_VITALS`; replace `inflateWedge`/`loadScenario` with `beginWedge`/`applyScenario`; move `savedPawp` here from `uiStore`; `resetToBaseline` now preserves PAWP by default (`{ clearPawp: true }` to clear). |
| `src/stores/uiStore.ts` | Remove `savedPAWP` (moved to vital store); add `instructorView` toggle for future V3. |
| `src/components/AlarmMonitor.tsx` | Refactored to use shared `evaluateAlarms` helper. |
| `src/components/NumericsColumn.tsx` | Read `savedPawp` from vital store; also remove unused `useUIStore` import. |
| `src/components/WedgeWindow.tsx` | Use `useVitalStore.savePawp` instead of removed `useUIStore.savePAWP`. |
| `src/components/MonitorScreen.tsx` | New `SavedPawpStrip` renders saved PAWP as a yellow strip below the waveform column (per Q14). |
| `src/components/ControlPanel.tsx` | Full V2 rewrite — see below. |
| `src/components/SmartKeysPopup.tsx` | Add `Instructor` cell between `Monitor Standby` and `Wedge` with red top border + INST. chip. |
| `src/utils/__tests__/scenarios.test.ts` *(new)* | Scenario table shape, ordering, clinical signatures, physiological range checks. |
| `src/utils/__tests__/alarmThresholds.test.ts` *(new)* | Threshold fires / non-fires per band, disconnect always alarms, `isCritical` classification, store actions. |
| `vitest.config.ts` *(new)* | Node-environment test config. |
| `package.json` | Add `vitest` devDependency and `npm test` script. |
| `CHANGELOG.md` *(new)* | v2 line including this feature. |

### ControlPanel sections

```
INSTRUCTOR CONTROL PANEL            [?] [Monitor View] [Reset to Baseline]
────────────────────────────────────────────────────────────────────────────
[ Trainee View · HR 78 · ABP 120/80 · PA 25/10 · Wedge normal · PAWP — ]

SETUP
  [ Scenarios ▾ ]              Normal · Load
                              Cardiogenic Shock · "…pump failure pattern" · Load
                              Severe PE       · "…high PA, hypoxemia"       · Load
                              Septic Shock     · "…tachycardia, low CVP…"    · Load

VITALS
  [ ECG ▾ ]      HR (bpm)   78 [- 78 +]
                 Rhythm     Normal Sinus ▾
  [ ABP ▾ ]      Systolic   120   Diastolic 80
  [ PA  ▾ ]      Systolic   25    Diastolic 10
  [ CVP ▾ ]      Mean       8
  [ SpO2 ▾ ]     %          98    Signal Quality Good
  [ Resp ▾ ]     Rate       14    EtCO2 35

PROCEDURE
  [ Wedge (PA occlusion) ]    [ Begin Wedge ] [ Deflate ]
                              Status: Normal PA
                              Saved PAWP: 15 mmHg     [Clear PAWP]
  [ Disconnect (transducer fault) ▾ ]
                 ART  [DISCONNECTED]  [OFF]   (hint: cable fault / transducer zeroing)
                 PA   [DISCONNECTED]  [OFF]
                 CVP  [DISCONNECTED]  [OFF]

ALARMS
  [ Alarm Limits — N active ▾ ]
                 HR High / Low, ABP Sys High / Low, PAdia High,
                 SpO2 Low, RR High / Low.
                 (warning + critical banners render above when live)
```

### SmartKeys Instructor cell

```
SmartKeys ● ●
┌──────────┬──────────┐ ┌──────────┐
│   …      │   …      │ │   …      │
│──────────┼──────────│ │──────────│
│ Monitor  │ Instructor│ │  Wedge   │   ← new Instructor cell, red top border + INST. chip
│ Standby  │    ⚙     │ │   ⊐      │
│──────────┼──────────│ │──────────│
│   …      │   …      │ │   …      │
└──────────┴──────────┘ └──────────┘
```

### Keyboard shortcuts

| Key | Action |
|---|---|
| `1` `2` `3` `4` | Load scenario Normal / Cardiogenic Shock / Severe PE / Septic Shock |
| `R` | Reset to Baseline |
| `Space` | Begin or deflate wedge |
| `?` | Toggle shortcut help |

Shortcuts are suppressed when focus is in an input/select/textarea so
instructors can still type into numeric fields without firing shortcuts.

## Behavior

- Scenarios are loaded via `applyScenario(id)` which reads from
  `SCENARIO_TABLE`. The 'normal' scenario explicitly resets to baseline
  while preserving `savedPawp`; all other scenarios spread their vitals
  over the current state.
- `resetToBaseline()` returns to `BASELINE_VITALS` for all vitals and
  clears all disconnect states. `savedPawp` is preserved unless
  `{ clearPawp: true }` is passed.
- The control panel renders live `LiveStateBadge` so the instructor
  sees what the trainee is seeing. This is driven by the same
  `evaluateAlarms` function the live monitor uses.
- Wedge workflow on the instructor panel: **Begin Wedge** sets
  `wedgeInflated = true` (the trainee's wedge window opens a
  pre-inflation view); the breath counter on the wedge window ticks
  every `60 / respRate` seconds; **Deflate** sets `wedgeInflated =
  false` and `wedgeBreathCount = 0`. Trainee then sees
  "Wedge ended — press Store Trace to measure" on their screen.
- Saved PAWP is recorded by the trainee's `Store Trace → Save Wedge`
  flow. It appears as a yellow strip below the respiratory waveform on
  the patient display (matching the PAp color, per Q14).
- The Instructor cell in the SmartKeys grid is visually distinguished:
  red top border + `INST.` chip in the corner. The trainee can still
  press it (no auth gate), but the visual mark is a clear non-clinical
  signal.

## Test plan

1. `npm run build` — clean. Type errors caught that `vite dev` misses.
2. `npm test` — 20 tests pass (scenarios table shape + clinical
   signatures + physiological range; alarm thresholds per band;
   isCritical classification; vital store applyScenario /
   resetToBaseline / beginWedge / deflateWedge actions).
3. `npm run dev` (port 5175 if 5173 busy) renders with no console
   errors.
4. Click each scenario in turn — vitals on the monitor screen update
   to match, alarm preview matches what `AlarmMonitor` would fire.
5. Click each disconnect toggle — alarm fires (red banner on monitor,
   audible critical tone); toggle off — alarm clears.
6. Click `Begin Wedge` — wedge panel status mirrors wedge-window
   status; breath dots tick at `60 / respRate` s cadence; click
   `Deflate` — breath count resets, wedge returns to "Normal PA" on
   both views.
7. Trainee saves a wedge measurement — yellow PAWP strip appears
   below the waveforms.
8. Click `Reset to Baseline` — vitals return to baseline, PAWP
   persists, all disconnects clear.
9. Keyboard: `1`–`4` load scenarios, `R` resets, `Space` toggles
   wedge, `?` toggles help. Verify focus-in-input suppresses
   shortcuts.
10. Open the `More` menu on the trainee monitor — confirm a new
    `Instructor` cell appears between `Monitor Standby` and `Wedge`,
    with a red top border and a small `INST.` chip in the corner.
    Click it — SmartKeys closes and the screen transitions to the
    Control Panel.
11. Click `Clear PAWP` once → "Confirm clear" → click again →
    `savedPawp` is cleared, strip disappears.

## Out of scope (deferred to V3)

- Pacer on/off (parameter exists; no UI yet).
- NIBP cycle / start / interval configuration.
- "Mode" toggle between Live / Self-Paced (the instructor UI is
  always-visible in V2; V3 may add a hidden mode for self-paced use).
- Audit log of instructor actions for after-action review.
- Auth/lock for the Instructor cell (currently any click can open it;
  the visual treatment is the only signal that it's non-clinical).
