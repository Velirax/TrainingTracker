# Next session plan — 2026-07-30

Two workstreams: ship the visual redesign, and add automatic calorie-burn calculation.

Redesign concept (approved direction) is published here: https://claude.ai/code/artifact/be231be1-3cf4-4a48-9984-91e21035eeb1
("cinder-track ledger" — warm ink/paper palette with a track-red-orange accent, condensed display type + monospace tabular numbers for stats/dates, icon rail nav instead of top nav bar, weekly-ledger calendar, ID-card profile.)

---

## 1. Redesign implementation

### Tokens
- Replace the OKLCH slate/teal token system in `training-tracker-client/src/index.css` (from `83b8460`) with the new palette. Keep the same 4-layer structure (primitives → semantic tokens) so components don't need to change their `var(--...)` references where names match — only the values and a few renamed tokens.
- New semantic tokens to carry over from the prototype: `--bg`, `--surface`, `--surface-raised`, `--rail`, `--text`, `--text-muted`, `--text-faint`, `--border`, `--border-strong`, `--accent` (+ `-ink`/`-soft`/`-soft-text`), `--success`/`-soft`, `--warning`/`-soft`, `--danger`/`-soft`, plus per-sport colors (`--sport-run`, `--sport-swim`, `--sport-cycle`, `--sport-strength`, `--sport-football` — will need one more token per real sport folder, see below).
- Light values, dark values (`prefers-color-scheme` + `[data-theme]` overrides same pattern as today) are all in the prototype file — copy hex values directly.
- Swap the font stack to the prototype's: condensed display face for headings/nav, system sans for body, `ui-monospace` for anything numeric (`font-variant-numeric: tabular-nums`).

### Layout
- `App.tsx`: replace the top `app-navigation` bar with a left icon rail (see prototype `.rail` / `.rail-nav` / `.rail-btn`). Keep the same three tabs (Home/Sports/Profile) and the existing theme-toggle + user-chip logic — just re-skin and reposition into the rail's `.rail-foot`.
- Center the main content column (`main { margin: 0 auto; max-width: 1180px; }`) — it currently isn't centered on wide viewports.
- **Do not add a "new sport folder" affordance.** Sport folders are a fixed, non-editable set — confirmed there's currently no add-folder UI or endpoint in the app either, so nothing to remove there; just don't introduce one in the redesign.

### Pages
- `DashboardPage.tsx` / `MonthCalendar.tsx` / `TrainingCalendar.tsx`: decide whether to keep FullCalendar's month grid or move to the prototype's weekly-ledger layout (rows = weeks, compact color-coded session tags, done/planned/missed distinguished by fill + strikethrough, not color alone). This is the biggest structural change — worth confirming before investing time, since FullCalendar may not easily support the ledger row style.
- Add a stat strip above the calendar (training load, sessions completed, streak, avg session length, **calories burned** — ties into workstream 2).
- `SportFoldersPage.tsx` / `SportFolderDetail.tsx`: folder cards get a colored top-edge tab per sport and a small stat row (sessions / distance-or-hours / calories).
- `ProfilePage.tsx`: restyle as an ID-card (avatar block + stat row), plus a new **Connected apps** panel with a Samsung Health row (status pill + Connect button) — ties into workstream 2, UI-only for now.
- `AuthPage.tsx`: not covered in the prototype yet — restyle to match once the token swap lands (centered card, same as today, new palette/type).

---

## 2. Calorie burn calculation

Current state: `Calories` already exists as a **manual, free-text tracking field** per exercise/session (see `TrainingTracker.Api/Models/ExerciseTrackingFields.cs`, `BuiltInExerciseSeeder.cs`, `SportFolderDetail.tsx`). The ask is to add a **computed** estimate, not replace manual entry — manual value should win if the user filled it in.

### Decisions needed first (flag to user before building)
- **Formula**: MET-based (`kcal = MET × weight_kg × duration_hr`) is the standard, well-documented approach and doesn't require heart-rate data — recommend starting here. Needs a MET-value table per sport/intensity (widely published, e.g. Compendium of Physical Activities).
- **Inputs required**: body weight (add a field to user profile/preferences — prototype already sketches this in the Preferences panel), session duration (already tracked), and a MET value per sport (+ optional intensity multiplier if we want Easy/Tempo/Hard variants).
- **Where computed**: prefer server-side (API) so it's consistent across clients and reusable once Samsung Health sync lands — a service method that takes `(sport, durationMinutes, userWeightKg, intensity?)` and returns kcal.

### Suggested implementation steps
1. API: add `WeightKg` to the user profile model/migration (`TrainingTracker.Api/Models`, new migration alongside the existing `AddUserPreferences` one).
2. API: add a MET lookup (static table keyed by sport + optional intensity) and a `CalorieCalculationService` (or similar) that computes kcal for a session; call it when a session is completed if the user didn't enter a manual value.
3. API: expose computed calories on session/summary endpoints (session detail, weekly/monthly aggregates) so the dashboard stat tiles and folder cards can show them.
4. Client: surface computed vs. manual calories in `SessionDetailsDialog`/`CompleteSessionDialog` (e.g., "Estimated: 340 kcal" with an editable override), and wire the new dashboard/folder calorie stats to the API values.
5. Client: add the `Weight (for calorie calc)` field to `ProfilePage.tsx` preferences.

### Samsung Health integration (separate, larger effort — noted for later, not part of this session's build)
- Needs Health Connect / Samsung Health SDK OAuth flow + a sync job to pull activity/calorie data.
- Once connected, Samsung-provided calories should take precedence over the MET estimate for synced sessions.
- This session's redesign only adds the UI placeholder (Connected apps panel, not-connected state) — no real auth flow yet.
