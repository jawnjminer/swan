# feat: quick events, gradual transitions, and cross-device sync

Extends the Instructor Console with one-click clinical events, gradual
(tweened) parameter transitions, five new waveform behaviors, and an
optional Supabase real-time layer that lets the console drive a bedside
monitor on a separate device.

## Goal

Let a single instructor drive a live simulation quickly: fire a clinical
event with one click, optionally ramp the change over a chosen duration,
and (optionally) do it from a separate device while the learner watches
the bedside monitor.

## Architecture

Single-user, single-session. The app stays a static Vite/React SPA on
Vercel. Cross-device sync is **optional** and layered on via Supabase
Realtime:

- **Instructor-authoritative broadcast.** The Instructor Console
  (`ControlPanel`) calls `enableBroadcasting()` on mount and becomes the
  single writer. Every change to shared simulation state (vitals,
  disconnect, alarm limits) is broadcast on a Supabase channel, throttled
  to ~10 Hz, plus a debounced snapshot write to a `session_state` row.
- **Bedside is a pure subscriber.** `MonitorScreen` fetches the snapshot
  for instant hydration on load, then applies live broadcasts via
  `setVitalsFromRemote`. It never writes, so there is no echo loop.
- **Single global session.** No pairing/PIN. Any browser that opens the
  app joins the same shared state.
- **Waveforms are local.** Only numeric/enum parameters cross the wire;
  each device regenerates its own waveforms, so bandwidth is tiny and
  latency is well under the 250 ms target.
- **Degrades gracefully.** When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  are absent, the whole sync layer no-ops and the app runs exactly as a
  single-device simulator.

## Gradual transitions (tween engine)

- Global duration selector: `Instant | 10s | 30s | 60s | 2min`, pinned at
  the top of the Quick Events section, applies to the next event.
- **Field rule:** numeric fields interpolate over the duration; string
  (rhythm) and boolean fields snap immediately. Clinically correct —
  arrhythmias present abruptly; pressures drift.
- **Interrupt-and-restart:** firing a new event mid-transition cancels the
  in-flight tween and re-bases from the current interpolated values.
- The RAF loop lives at module scope; it writes to the Zustand store on a
  ~100 ms cadence (not every frame) to avoid re-render storms. Waveforms
  render on a canvas, so the visual stays smooth regardless.
- A transition banner shows `⟳ Transitioning to <event> — Ns remaining`
  with a Cancel button.

## Quick events

**Hemodynamic (7):** Hypotension, Hypertension, Hemorrhage, Vasodilatory
Shock, Cardiogenic Shock, Septic Shock, Severe PE.

**Monitoring (9):** Art Line Dampened/Restored, PA Wedged, PA Over-Wedged,
PA Deflated, SpO₂ Probe Off/Restored, ECG Leads Off/Restored. The five
"engaged" states highlight orange on their buttons when active.

**Rhythm — hidden (deferred).** A 9-event Rhythm group exists in the data
(`EVENT_TABLE` / `EVENT_ORDER.rhythm`) but is not surfaced: it is omitted
from `CATEGORY_ORDER`. It was hidden because afib/svt/v-tach currently
render normal-sinus ECG morphology at a different rate rather than the
correct waveform shape. Re-add `'rhythm'` to `CATEGORY_ORDER` to restore
the section once per-rhythm morphology is implemented. The manual
Vitals→ECG rhythm dropdown is unaffected and still works.

## Waveform rendering

The bedside sweep runs continuously and is never restarted by a state
change. `WaveformCanvas` reads live vitals/disconnect from refs and its
render effect depends on canvas geometry only. When the instructor fires
an event, the new morphology and values appear at the sweep bar and to its
immediate left — the trace to the right (older history) is overwritten as
the bar comes back around, exactly like a real monitor. It does **not**
blank and redraw the whole strip.

## Five new waveform behaviors

| Param | Waveform effect |
|---|---|
| `rhythm: 'atrial-flutter'` | 300 bpm sawtooth F-waves + independent ventricular QRS |
| `rhythm: 'complete-heart-block'` | dissociated P-waves + slow wide escape QRS |
| `abpDampened` | narrow-pulse-pressure rounded sinusoid, no dicrotic notch |
| `paOverWedged` | high flat PA trace with only respiratory drift (safety-recognition morphology) |
| `ecgLeadsOff` | flat baseline with electrical noise |

## Affected files

| File | Change |
|---|---|
| `src/types/vitals.ts` | Rhythm union +2; `abpDampened`/`ecgLeadsOff`/`paOverWedged`; `EventId`/`EventCategory`/`TweenState` |
| `src/utils/events.ts` *(new)* | `EVENT_TABLE`, `EVENT_ORDER`, `ACTIVE_STATE_MAP` |
| `src/utils/supabase.ts` *(new)* | client + `broadcastState`/`subscribeToState`/`fetchSnapshot`; `syncEnabled` gate |
| `src/utils/waveformGenerator.ts` | 5 new morphology branches |
| `src/components/WaveformCanvas.tsx` | wires the 3 new flags into the generators |
| `src/stores/vitalStore.ts` | tween engine (`fireEvent`/`cancelTween`), broadcast subscription, `enableBroadcasting`/`isBroadcaster`, `setVitalsFromRemote` |
| `src/stores/uiStore.ts` | `tweenDurationMs` (local, unsynced) |
| `src/components/QuickEventsSection.tsx` *(new)* | duration strip, banner, event grids |
| `src/components/ControlPanel.tsx` | Quick Events replaces Scenarios; `enableBroadcasting` on mount |
| `src/components/MonitorScreen.tsx` | snapshot hydration + live subscription (bedside only) |
| `src/vite-env.d.ts` *(new)* | optional Supabase env var typings |
| `src/utils/__tests__/events.test.ts` *(new)* | event-table integrity |
| `src/utils/__tests__/vitalStore.events.test.ts` *(new)* | fireEvent/tween |
| `vitest.config.ts` + `src/test-setup.ts` | RAF polyfill for tests |

## Supabase setup (to enable cross-device sync)

1. Create a Supabase project (free tier).
2. Run in the SQL editor:
   ```sql
   create table if not exists session_state (
     id text primary key default 'singleton',
     vitals jsonb not null,
     disconnect jsonb not null,
     alarm_limits jsonb not null,
     updated_at timestamptz default now()
   );
   alter table session_state enable row level security;
   create policy "public read"  on session_state for select using (true);
   create policy "public write" on session_state for all    using (true);
   ```
3. Copy Project URL + anon key into `.env.local` (see `.env.local.example`)
   and into the Vercel project's Environment Variables.

Without these, the simulator runs single-device with no behavior change.

## Test plan

1. `npm run build` — clean.
2. `npm test` — 36 tests pass.
3. `npm run dev` — Quick Events fire; duration ramps interpolate; enum
   events snap; banner counts down and cancels; monitoring toggles
   highlight; new rhythms/dampening/over-wedge render.
4. With Supabase configured: open `/control` on one device and the
   monitor on another; fire an event; confirm the bedside updates in
   real time and a fresh bedside tab hydrates from the snapshot.

## Out of scope (deferred)

Scenario timeline, local presets + instructor notes, expanded physiology
(PVC frequency, pacemaker capture, ST/QT control, CVP a/v-wave prominence,
respiratory depth/apnea), the full waveform artifact layer (catheter whip,
flush artifact, baseline wander, electrical interference, lead reversal),
and PA catheter migration.
