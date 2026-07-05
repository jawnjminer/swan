# AGENTS.md — mx750-monitor-simulator

Project rules for AI coding agents (OpenCode, Claude Code, etc.) working in this repo.
Loaded automatically when an agent operates in `/home/jawn/swan/`.

## Branch model

- `main` — stable, tagged releases only. Do not commit directly.
- `v2` — active development. Feature branches start here.
- `feat/<short-name>` — new features. Branch from `v2`.
- `fix/<short-name>` — bug fixes. Branch from `v2`.
- `chore/<short-name>` — tooling, deps, config. Branch from `v2`.
- `docs/<short-name>` — docs only. Branch from `v2`.

Merge feature branches back to `v2` with `--no-ff` to preserve shape.
Promote `v2` → `main` only when ready to tag a release.

## Commit convention

Subject line MUST match: `^(feat|fix|chore|docs|merge): .+`

- `feat:` new user-visible capability
- `fix:` bug repair
- `chore:` tooling, deps, config (no behavior change)
- `docs:` docs only
- `merge:` merge commits (used automatically by `--no-ff`)

One commit per logical step. Small commits. No commits to `main` directly.

## Code seams — where new code goes

Respect the existing structure. Do not bypass it.

| Concern | Location | Notes |
|---|---|---|
| Domain types | `src/types/` | Extend `vitals.ts` for vitals; add new file for new domain. |
| State | `src/stores/` (Zustand) | New feature state lives here, never inside components. |
| Pure logic | `src/utils/` | No React imports. Testable in isolation. |
| UI components | `src/components/` | One component per file. One screen region per component. |
| Layout composition | `src/App.tsx` | Only touch when adding/removing a screen region. |
| Entry | `src/main.tsx` | Almost never touched. |
| Styles | `tailwind.config.ts` + `src/index.css` | Tailwind utilities preferred; custom CSS only when necessary. |

## Before claiming a task complete

1. `npm run build` passes — catches type errors that `vite dev` misses.
2. `npm run dev` (port 5175 if 5173 busy) renders without console errors.
3. New utils have tests in `src/utils/__tests__/` when logic is non-trivial.
4. No new files at repo root unless the file is config (`.gitignore`, `AGENTS.md`, etc.).
5. No commits include `node_modules/`, `dist/`, `.gstack/`, or `.hermes/` (gitignored).

## Feature workflow

1. Branch from `v2`: `git checkout v2 && git checkout -b feat/<name>`
2. Add `docs/features/<name>.md` with: goal, behavior, affected files, test plan.
3. Implement in order: types → store → utils → component → wire in App.tsx
4. Commit small, one logical step per commit.
5. Verify: build clean, dev runs, manual smoke.
6. Merge back to `v2`: `git merge --no-ff feat/<name>`
7. Update `CHANGELOG.md` under the `v2` section.

## What this repo is NOT

- No remote configured. Don't push without explicit instruction.
- No CI configured. Don't reference GitHub Actions.
- No test framework installed yet. Only add tests when logic warrants it (utils first).
- No routing. Single-screen app. Don't add react-router unless explicitly asked.