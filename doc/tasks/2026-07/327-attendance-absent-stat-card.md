# ✨ Task #327: Add an "Ausentes" Stat Card and Move Absent Employees Out of the Main Grid on Attendance Today

## 📖 Story

**English:**
As a Manager, I need a dedicated "Ausentes" stat card that removes employees with a scheduled or marked absence from the main working grid, so that the Attendance/Today screen only shows the employees I still need to act on.

**Español:**
Como Manager, necesito una tarjeta de estadística "Ausentes" dedicada que remueva de la cuadrícula principal a los empleados con una ausencia programada o marcada, para que la pantalla de Asistencia/Hoy solo muestre a los empleados sobre los que aún debo actuar.

Employees who belong in this new bucket:
- Employees with a **scheduled absence** (approved leave/permiso covering today, or `day_status = VACATION`)
- Employees manually marked absent via "Marcar falta" (`day_status = ABSENCE`)

---

## 🧠 Current state (code audit, confirmed against `origin/main`)

- The attendance index page (`code/webapp/src/pages/attendance/index.tsx`) shows 4 stat cards — Total empleados, Pendientes, En trabajo, Completados (`AttendanceSummaryBar.tsx:62-88`) — and renders every employee row in one grid regardless of status.
- Stat cards are computed purely client-side by `computeSummary(rows)` (`code/webapp/src/pages/attendance/-use-today-attendance-page.ts:20-33`), which buckets every row via `getAttendancePhase()` into `pending` / `checkedIn` / `done` — the `on-leave`, `day-off`, and `absence` phases are currently folded into the "Completados" bucket, not broken out.
- `getAttendancePhase()` (`code/webapp/src/types/attendance.ts:132-142`) does **not** handle `day_status === 'VACATION'` at all — a vacationing employee with no check-in falls through to `'pending'` and shows up as actionable in the grid today, the opposite of what we want.
- The API already returns everything needed — **no backend change required**. Each row already includes `attendance.day_status` plus an independent `today_leave` object (`TodayAttendanceController::__invoke`, `code/api/app/Http/Controllers/Api/V1/Attendances/TodayAttendanceController.php:96-140`; frontend type `TodayLeave`, `attendance.ts:42-50`). Today `today_leave` is only used to render an informational chip inside the card (`EmployeeAttendanceCard.tsx:184-230`) — the row still stays in the main grid.
- `index.tsx` maps and renders **every** row from `rows` unconditionally — there is no filtering by phase before rendering the grid.

### Key design decision (confirmed via code audit)

`row.today_leave` covers **both** full-day (`OPEN_ENDED`) and partial (`SCHEDULED`) approved leaves. Only `OPEN_ENDED` should count as "absent":
- Backend (`LeaveGuards::shouldCreateAttendanceRecords`, `code/api/app/Actions/Leaves/Concerns/LeaveGuards.php:86-97`) only creates an `Attendance` record with `day_status = LEAVE` for full-day leaves — `SCHEDULED` (partial) leaves never touch `Attendance`, because "the employee is still expected to check in/out normally that day".
- `EmployeeAttendanceCard.tsx:271` already derives `isFullDayLeave = leave?.time_mode === 'OPEN_ENDED'` to hide check-in/mark-falta buttons only for full-day leaves.
- The existing E2E spec `attendance-today-leave-context.cy.ts` asserts that an employee with a `SCHEDULED` partial leave (EMP-008, Vargas Sofia) still shows `Registrar entrada` / `Marcar falta` buttons — i.e. must remain actionable in the grid. Treating any non-null `today_leave` as absent would break this test.

So: **absent (stat count)** = `day_status ∈ {ABSENCE, VACATION, LEAVE}` OR `today_leave?.time_mode === 'OPEN_ENDED'`. Partial `SCHEDULED` leaves keep the employee in the grid, unchanged from today.

`day_status = DAY_OFF` (scheduled rest day) is **not** part of "absent" — it stays folded into "Completados", unchanged from today.

### Second design decision (surfaced to and confirmed by the user)

**ABSENCE-marked employees stay in the main grid**, even though they count toward the "Ausentes" stat. `EmployeeAttendanceCard.tsx:401-414` renders a `phase === 'absence'`-only "Justificar falta" button (`data-testid="btn-justify-absence"`) that converts a marked falta into a justified leave — this action requires the card to be visible. `attendance-day-status.cy.ts` already covers this flow end-to-end (mark falta → card stays visible with the button → justify it). Removing ABSENCE rows from the grid (as the wireframe below literally shows) would make this action unreachable and break that spec.

### Third design decision (surfaced to and confirmed by the user)

Verified against a clean `main` checkout (git stash) that removing **any** `on-leave`-phase row (i.e. `day_status = LEAVE`, whether from a full-day `OPEN_ENDED` leave or from justifying a falta) from the grid is a genuine regression, not a pre-existing flake:
- `attendance-today-leave-context.cy.ts` — EMP-007's full-day `OPEN_ENDED` leave card disappears entirely (2 tests broke; passed on baseline)
- `attendance-register-leave.cy.ts` — after justifying an absence into a leave, the card disappears (1 test broke; passed on baseline)

Both rely on the card staying visible to show the informational leave chip (`EmployeeAttendanceCard.tsx` `LeaveChip`) / "Ausencia" badge. (One other failure, `attendance-day-status.cy.ts`'s "Justificar Falta" test, was confirmed **pre-existing** on baseline `main` — unrelated to this change, a latent test-order dependency bug, not touched by this PR.)

So `LEAVE` (day_status) stays in the grid too, same as `ABSENCE` — **only `VACATION` is hidden from the grid**. Predicates as of the first session:
- `isAbsentRow(row)` — used only for the **stat card count** — `phase ∈ {'on-leave', 'absence'}` OR `today_leave.time_mode === 'OPEN_ENDED'` (unchanged — VACATION/LEAVE/ABSENCE/full-day-leave all count as "Ausente")
- `isHiddenFromGrid(row)` — used to **filter the main grid** — `attendance?.day_status === 'VACATION'` only. `ABSENCE` and `LEAVE` (and full-day `OPEN_ENDED` leaves, which always carry `day_status = LEAVE` per `LeaveGuards`) stay visible in the grid, unchanged from today.

### Fourth design decision — second session (user feedback after reviewing PR #336)

The user reviewed the shipped behavior and asked for two changes:
1. **`DAY_OFF` (scheduled rest day) should also count as "Ausente" AND be hidden from the grid** — same treatment as `VACATION`. Confirmed no existing test depends on a `DAY_OFF` card staying visible in the main `/attendance` grid (`DAY_OFF` is auto-managed by `CloseDayAction`, never manually toggled from this screen — the only "Descanso"/`is_day_off` references in Cypress specs are either the unrelated `/attendance/reports/today` page, or the `schedule.is_day_off` flag used by the extra-day-express flow, a different field entirely).
2. **Every stat card becomes a clickable tab that filters the main grid** — Total/Pendientes/En trabajo/Completados/Ausentes. Confirmed: all 5 cards are clickable, toggle off on second click.

Implementation:
- `isAbsentRow` and `isHiddenFromGrid` both extended to include `phase === 'day-off'` / `day_status === 'DAY_OFF'`.
- New `attendanceBucket(row)` helper (`-use-today-attendance-page.ts`) centralizes the phase→bucket mapping, reused by both `computeSummary` and the new `filterRowsForGrid(rows, filter)`.
- New `AttendanceFilter` type (`'total' | 'pending' | 'checkedIn' | 'done' | 'absent'`) lives in `AttendanceSummaryBar.tsx` alongside `AttendanceSummary`. `null` = no tab selected = today's default view (hide only VACATION/DAY_OFF). Selecting `'total'` or `'absent'` overrides the default to reveal the normally-hidden rows; the others are subsets of the default view.
- `SummaryStat` changed from a `<div>` to a `<button>` (`aria-pressed`, `data-testid="stat-{total|pending|checked-in|done|absent}"`, active-state ring styling). Clicking the active tab again clears the filter (toggle).
- Deferred the "En comida" (at-lunch) split into its own issue: **#337**, since the `checkedIn` bucket still lumps `checked-in`/`at-lunch`/`returned` together — out of scope for this session.

**Debugging note:** the first Cypress attempt at asserting the "Ausentes" count via `cy.contains("Ausentes").parent().find("p").first()` intermittently read the "Total empleados" value instead ('10' instead of '3'), even with generous timeouts — root-caused to selector ambiguity, not a logic bug (Vitest coverage of the same bucket/filter logic was green throughout). Fixed by adding explicit `data-testid` attributes to each stat card and switching the Cypress spec to `data-testid`-based selectors — more robust than text/DOM-traversal queries going forward.

### Fifth design decision — third session (smart default tab + URL persistence)

The user asked for two more things: (1) the default tab on page load should be "Pendientes" if anyone is pending, else "En trabajo"; (2) the active tab should persist in the URL (`?tab=`) so a page refresh doesn't lose it.

**This turned out to have a much bigger blast radius than expected.** Landing on a *specific single-bucket* tab by default (rather than the old broad "everything except VACATION/DAY_OFF" default) means employees outside that one bucket are no longer visible on page load. Running the **entire** `attendance-*.cy.ts` suite (not just this feature's own spec) surfaced **37 failing tests across 13 spec files** — flows like check-in, lunch start/return, overtime decisions, close-day, and register-leave routinely need to see employees from *multiple* buckets in the same test (e.g. check in a pending employee while another is already checked in). Asked the user whether the default tab should only be a visual highlight (grid stays unfiltered) or actually filter — confirmed: **actually filter**.

Fixed by:
- Verifying against a clean baseline (git stash) that only `attendance-day-status.cy.ts` (pre-existing "Justificar Falta" flake, see above) and `attendance-weekly-summary-dialog.cy.ts` (pre-existing calendar-navigation failures, unrelated to this issue) fail without any of this session's changes — everything else genuinely regressed.
- Adding `cy.get("[data-testid='stat-total']").click({ force: true })` after page load (and after any mid-test re-visit to `/attendance`) in all 11 genuinely-affected specs, restoring full-grid visibility for flows that aren't about the tabs feature itself.
- Two real bugs found and fixed along the way (not test-only artifacts):
  1. **Race condition**: a manual tab click issued *before* the initial data fetch resolved was silently overwritten once the smart-default effect fired afterward. Fixed by having `toggleFilter` also flip the `hasAppliedDefaultFilter` ref, so any manual interaction — even one that arrives mid-load — permanently disables the automatic default.
  2. A `cy.reload()`-based URL-persistence test needed `cy.clock(...)` re-applied after the reload, since a full page reload creates a fresh JS context and drops the mocked `Date`.

Final default-view semantics: `filterRowsForGrid(rows, filter)` — `null` (not yet resolved) → hide VACATION/DAY_OFF; `'total'`/`'absent'` → override to reveal everyone/only-absent; `'pending'`/`'checkedIn'`/`'done'` → that bucket only. `resolveDefaultFilter(summary)` picks `'pending'` if `summary.pending > 0`, else `'checkedIn'`. The `/attendance/` route's `validateSearch` declares an optional `tab` search param; `AttendancePage` mirrors `selectedFilter` into it via `navigate({ search, replace: true })`.

### Sixth design decision — fourth session (justify-now prompt + card exit animation)

The user asked for two more UX refinements to the "Marcar falta" flow:
1. Right after confirming falta, ask "¿Deseas justificar la falta ahora?" — Yes opens the justify (`RegisterLeaveDialog`) directly; No just leaves it marked (unchanged from before, justify later via the existing "Justificar falta" button).
2. When that flow concludes (either answer), the card should play a fade-out/slide-out animation instead of disappearing abruptly — since the employee's bucket usually changes to `'absent'`, which the active tab (e.g. "Pendientes") no longer matches.

Implementation:
- `EmployeeAttendanceCard.tsx` gained a second `ConfirmDialog` (title "¿Deseas justificar la falta ahora?", `variant="info"`) shown right after the falta-confirm dialog closes. Reused the existing `RegisterLeaveDialog`/`showJustifyDialog` state for the "Sí" path.
- New `.animate-card-exit` keyframes in `index.css` (fade + slight slide, 0.35s) applied via a new `isExiting` prop.

**Bug found via live browser testing** (not caught by Vitest/Cypress, since neither exercises the real refetch-driven bucket change against the whole flow): the card — and the justify-now dialog rendered *inside* it — could get unmounted by the data refetch the instant the falta mutation succeeded, *before* the user ever saw the justify-now prompt, because the row stopped matching the active tab's bucket immediately. Fixed with a two-phase model in `-use-today-attendance-page.ts`:
  - `pinEmployeeCard(id)` — called the moment "Confirmar falta" is clicked (wrapped around `onMarkDayStatus` in `index.tsx`) — keeps the row rendered, fully interactive, no animation, regardless of bucket, for as long as its dialog flow is in progress.
  - `onFaltaFlowComplete(id)` — called when the justify-now dialog is dismissed *or* `RegisterLeaveDialog` closes (either outcome) — transitions the row from `'pinned'` to `'exiting'`, which plays `.animate-card-exit` and removes it from `visibleRows` after 350ms.
  - `cardOverrides: Map<string, 'pinned' | 'exiting'>` replaces the earlier plain `Set` from session 3 to represent this two-phase state.

Verified end-to-end in a live browser (not just Vitest/Cypress) against the dev-lab `sushigo-e` server (port `5175` — note this differs from the default Vite port `5173`, which belongs to a different workspace).

**Follow-up fix (same session, caught by the user in the live demo):** the initial `visibleRows` implementation appended pinned/exiting rows *after* the filtered list, so a card marked falta visibly jumped to the end of the grid instead of staying put. Fixed by refactoring `filterRowsForGrid` around a new per-row `matchesGridFilter` predicate, and building `visibleRows` as a single pass over `data` in its original order (`row => cardOverrides.has(id) || matchesGridFilter(row, filter)`) instead of filter-then-append. Verified with a new Vitest case (row pinned in the *middle* of the list, not at the edges) and re-confirmed live in the browser.

### Eighth design decision — sixth session (`/finish-pr` readiness fixes)

Running `/finish-pr` surfaced a CI failure and, across two Devin/DeepWiki automated-review passes, four real bugs in the code shipped by sessions 3–4 — none previously caught by Vitest/Cypress since they all depend on timing or a specific end-of-day data shape:

1. **`webapp-lint` CI failure**: `useNavigate({ from: '/attendance' })` in `index.tsx` broke TanStack Router's route-typing inference once the generated route tree was regenerated fresh (as CI always does, but a stale local `routeTree.gen.ts` had been masking it). Fixed with the recommended `Route.useNavigate()` pattern, which resolves its own route without a manually-typed `from` string.
2. **Exit-animation skipped when it shouldn't be** (first pass): `startExitAnimation` needed to distinguish "row still belongs in the active tab" (no animation needed) from "row is actually leaving" (animate out) — the initial fix decided this by reading `data`, checking `matchesGridFilter(row, selectedFilter)`.
3. **Same fix raced `useMarkDayStatus`'s refetch** (second pass, reported after the first fix shipped): `data` can still reflect the pre-mutation row when the manager dismisses the justify-now prompt quickly, since `useMarkDayStatus` only invalidates/refetches `onSuccess`. Replaced the `data`-based check with a purely `selectedFilter`-based one (`matchesFilterAfterFalta`), since the mark-falta flow is *guaranteed* to end with `day_status` as `ABSENCE` or `LEAVE` regardless of the manager's choice — traced through `RegisterDirectLeaveAction.php` to confirm a partial (`SCHEDULED`) justify-leave never touches the existing `ABSENCE` `Attendance` row, and any other leave type overwrites it to `LEAVE`. This removes the race entirely instead of narrowing the window.
4. **`EmployeeAttendanceCard` violated the repo's mandatory Custom Hook Convention**: 5 `useState` + a `useEffect` + a `useRef` were inline in the component. Extracted into `use-employee-attendance-card.ts`, owning the falta → justify-now → justify-dialog state machine and the pending↔absence button crossfade; the component is now pure JSX + the hook's returned handlers.
5. **`resolveDefaultFilter` could land on an empty tab**: it only distinguished "anyone pending" from "nobody pending," falling back to `'checkedIn'` unconditionally — so once every employee had checked out (or nobody was ever checked in, e.g. an all-absent/all-vacation day), the grid loaded with the "En trabajo" tab active and zero matching rows. Changed to cascade `pending → checkedIn → done → absent → null`, landing on the first bucket that actually has anyone in it (falling back to the unfiltered default view only when there are no employees at all).

All five fixes verified via `/finish-pr`'s readiness gate: typecheck/lint clean, the full Vitest suite green, and a second Devin/DeepWiki pass confirming 0 Bugs (down from 2, then a further 2 found on the follow-up pass) and the one "Investigate" flag resolved.

### Seventh design decision — same session (button crossfade polish)

The user asked for one more polish: the "Registrar entrada"/"Marcar falta" buttons should fade out and the "Justificar falta" button should fade in when a falta is marked, instead of swapping abruptly — most visible when the card *doesn't* leave the grid at all (e.g. viewing the "Total"/"Ausentes" tab, where the whole-card exit animation never triggers since the row still matches the filter).

Implementation, scoped narrowly to `EmployeeAttendanceCard.tsx` (local component state only, no hook/parent changes needed):
- New `.animate-fade-out` keyframes in `index.css`, mirroring the existing `.animate-fade-in`.
- `displayedActionsPhase` + `actionsFadingOut` local state: on a `pending` ↔ `absence` phase transition specifically (not other phase changes), keep rendering the *old* action block for 200ms with `.animate-fade-out` + `pointer-events-none` (prevents double-clicking a stale button mid-fade), then swap to the new block with `.animate-fade-in`.
- Deliberately scoped to only the pending/absence swap the user asked about — other phase-conditional blocks (checked-in, at-lunch, etc.) were left untouched to avoid touching their existing, already-tested interaction flows.

---

## 🎨 Wireframe

**Stat cards — naively appending a 5th card breaks the current `grid-cols-2 sm:grid-cols-4` layout:**
```
Now (4 cards, sm:grid-cols-4):          Naive +1 card (orphan row):
┌──────┬──────┬──────┬──────┐          ┌──────┬──────┬──────┬──────┐
│Total │Pendi.│Enrab.│Compl.│          │Total │Pendi.│Enrab.│Compl.│
└──────┴──────┴──────┴──────┘          ├──────┴──────┴──────┴──────┤
                                        │Ausentes  ← spans oddly    │
                                        └────────────────────────────┘
```
Recommended: change the grid to fit 5 evenly (`grid-cols-3 sm:grid-cols-5`):
```
┌──────┬──────┬──────┬──────┬────────┐
│Total │Pendi.│Enrab.│Compl.│Ausentes│
└──────┴──────┴──────┴──────┴────────┘
```

**Main grid — only VACATION employees move out into the stat card; ABSENCE and LEAVE stay actionable/visible in the grid:**
```
Before:                                 After:
┌──────┬──────┬──────┬──────┐          ┌──────┬──────┬──────┐
│Ana   │Beto  │Carla │Dani  │          │Ana   │Beto  │Carla │
│pend. │work  │ABSENT│done  │          │pend. │work  │ABSENT│
├──────┼──────┼──────┼──────┤          ├──────┴──────┴──────┘
│Eva   │      │      │      │          │Dani
│VACAT.│      │      │      │          │done
└──────┴──────┴──────┴──────┘          └──────
                                        (Only Eva/VACATION leaves the grid —
                                         counted under "Ausentes" instead.
                                         Carla/ABSENT stays with "Justificar
                                         falta"; any LEAVE-status card also
                                         stays, with its leave chip/badge)
```

---

## ✅ Technical Tasks (frontend-only — no backend change needed)

- [x] 🔧 Extend `getAttendancePhase` to map `day_status === 'VACATION'` to the existing `'on-leave'` phase (same treatment as `LEAVE`)
- [x] 🔧 Add an `isAbsentRow(row)` predicate (stat count): true when phase is `'on-leave'`/`'absence'`/`'day-off'`, or `row.today_leave?.time_mode === 'OPEN_ENDED'`
- [x] 🔧 Add an `isHiddenFromGrid(row)` predicate (grid filter): true when `attendance?.day_status` is `VACATION` or `DAY_OFF` — `ABSENCE` and `LEAVE` stay visible by default (existing "Justificar falta" action + leave chip/badge functionality)
- [x] 🔧 Add an `absent` count to `AttendanceSummary` and `computeSummary()`, no longer folding `on-leave`/`absence`/`VACATION`/`day-off` rows into `done`
- [x] 📱 Add a 5th `SummaryStat` card "Ausentes" to `AttendanceSummaryBar.tsx`, changing the grid to `grid-cols-3 sm:grid-cols-5` and updating `OvertimeWarning`'s `col-span` to match
- [x] 📱 In `index.tsx`, filter the main grid via `isHiddenFromGrid`/`filterRowsForGrid` so VACATION/DAY_OFF rows leave the grid by default; ABSENCE and LEAVE rows stay visible/actionable
- [x] 📱 Make every stat card a clickable tab (`AttendanceFilter`) that filters the main grid; toggles off on second click
- [x] 🧪 Extend Vitest coverage for `getAttendancePhase`, `isAbsentRow`, `isHiddenFromGrid`, `attendanceBucket`, `filterRowsForGrid`, `computeSummary`, and tab click/active-state behavior
- [x] 🧪 Cypress happy-path spec covering the "Ausentes" card, DAY_OFF, grid filtering, and tab-click behavior
- [x] 🧪 Verified against baseline `main` (git stash) that no other existing attendance E2E spec regresses
- [x] 📂 Deferred "En comida" (at-lunch) tab split to issue #337
- [x] 🔧 Fold `DAY_OFF` into `isAbsentRow`/`isHiddenFromGrid` (counts as Ausente, hidden from grid by default, same as VACATION)
- [x] 🔧 Add `resolveDefaultFilter(summary)`: smart default tab is "Pendientes" if anyone is pending, else "En trabajo"
- [x] 🔧 Fix a race condition where a manual tab click before the initial load resolved was overwritten by the smart-default effect (`toggleFilter` now also flips `hasAppliedDefaultFilter`)
- [x] 📱 Persist the active tab in the URL (`?tab=`) via the `/attendance/` route's `validateSearch` + `navigate({ search, replace: true })`; restored on page load/reload
- [x] 🧪 Fixed 11 existing attendance E2E specs that regressed from the smart-default tab narrowing the grid to a single bucket (verified the remaining 2 failures are pre-existing/unrelated via a clean baseline run)
- [x] 📱 Add a "¿Deseas justificar la falta ahora?" prompt right after confirming "Marcar falta" — Sí opens `RegisterLeaveDialog` directly, No leaves it for later
- [x] 📱 Add `.animate-card-exit` (fade + slide, 0.35s) played on the card once the falta flow concludes
- [x] 🔧 Fix a real bug (found via live browser testing): the card and its justify-now dialog could get unmounted by the data refetch before the user ever saw the prompt — fixed with a two-phase `pinEmployeeCard`/`onFaltaFlowComplete` (`cardOverrides: Map<string, 'pinned'|'exiting'>`) model
- [x] 🧪 Extend Vitest coverage for the justify-now dialog, `isExiting` styling, and the pin→exit state machine
- [x] 🧪 Extend `attendance-day-status.cy.ts`: decline the new prompt in the existing helper, add a new "justify right away" test
- [x] 🔍 Verified live in a browser against the `sushigo-e` dev-lab server (port 5175)
- [x] 🐛 Fix pinned/exiting cards jumping to the end of the grid — rebuild `visibleRows` as a single ordered pass over `data` instead of filter-then-append
- [x] 📱 Crossfade the pending action buttons out and "Justificar falta" in (`.animate-fade-out`/`.animate-fade-in`) instead of an abrupt swap
- [x] 🔍 Surveyed every dialog/modal component in `code/webapp/src` (background agent) to scope a system-wide dialog-transition centralization request
- [x] 🔧 Created GitHub issue #342 tracking full system-wide dialog centralization (3 duplicated animation copies + 6 unanimated dialogs); logged as Sprint 001 Follow-up Work, candidate for next sprint
- [x] ✨ Extracted `useDialogTransition` shared hook (`components/ui/use-dialog-transition.ts`) and migrated `ConfirmDialog`/`RegisterLeaveDialog` onto it, removing their duplicated `visible`/`animating` state machines
- [x] 🧪 Added Vitest coverage for `useDialogTransition` (7 tests: visibility, enter/exit classes, scroll lock, Escape handling, exit-complete callback)
- [x] 🧪 Verified the full 46-spec/151-test Cypress suite; confirmed the 6 failures (the known `attendance-day-status.cy.ts` flake + 5 others) are pre-existing and unrelated by reproducing them identically against a clean baseline with this session's changes stashed out

---

## 🎯 Acceptance Criteria

- [x] A 5th "Ausentes" stat card is shown alongside Total/Pendientes/En trabajo/Completados, evenly laid out (no orphan cell)
- [x] Employees with `day_status = ABSENCE`, `VACATION`, `LEAVE`, `DAY_OFF`, or an `OPEN_ENDED` `today_leave` are counted under "Ausentes"
- [x] `VACATION` and `DAY_OFF` employees are excluded from the main grid by default — `ABSENCE` (Justificar falta) and `LEAVE` (leave chip/badge) stay visible, unchanged from today
- [x] Employees with a `SCHEDULED` (partial) `today_leave` remain in the grid, actionable, unchanged from today
- [x] Every stat card is a clickable tab: clicking filters the grid to that bucket; "Total" reveals everyone including VACATION/DAY_OFF; clicking the active tab again returns to the default view
- [x] On page load, the default active tab is "Pendientes" if anyone is pending, else "En trabajo" — a manual click always wins over this default, even if issued before the initial load resolves
- [x] The active tab persists in the URL and survives a page reload
- [x] Confirming "Marcar falta" immediately asks whether to justify it now; choosing yes opens the justify dialog directly, no leaves it marked for later
- [x] The marked card stays fully visible and interactive throughout that prompt/dialog flow, then plays a fade/slide exit animation once it concludes (if it's about to leave the active tab)
- [x] No backend changes (beyond a new `Testing/` seeder + `test:reset` scenario for the Cypress spec)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** `16h24m`

### 📅 Sessions
```json
[
  { "date": "2026-07-26", "start": "19:15", "end": "20:51" },
  { "date": "2026-07-26", "start": "21:20", "end": "01:32" },
  { "date": "2026-07-27", "start": "01:32", "end": "03:01" },
  { "date": "2026-07-27", "start": "03:01", "end": "06:03" },
  { "date": "2026-07-27", "start": "12:50", "end": "14:40" },
  { "date": "2026-07-27", "start": "15:20", "end": "19:35" }
]
```

## 📊 Retrospective
- **Actual total:** 16h 24m (1h 36m + 4h 12m + 1h 29m + 3h 2m + 1h 50m + 4h 15m)
- **vs optimistic:** +14h 24m over
- **vs pessimistic:** +12h 24m over

**Justification:**

Session 1 landed under the optimistic estimate. Sessions 2–5 were driven entirely by user feedback after reviewing the shipped PR, and each added genuinely new scope beyond the original issue: folding `DAY_OFF` into "Ausentes" and making every stat card a clickable tab (session 2), a smart default tab plus URL persistence (session 3), a justify-now prompt/card exit animation/position-preservation fix/button crossfade polish (session 4), and centralizing the dialog enter/exit transition behind a shared hook (session 5). Session 2's debugging detour: the first Cypress assertion for the "Ausentes" count intermittently read the wrong card's value via a fragile `cy.contains().parent().find('p')` chain — root-caused to selector ambiguity (not a logic bug, confirmed via Vitest) and fixed with `data-testid` attributes on each stat card. Session 3's detour was much larger: landing on a specific single-bucket tab by default (rather than the old broad view) turned out to break 37 tests across 13 *other* attendance E2E specs that need to see employees from multiple buckets at once — caught by proactively running the full attendance suite (not just this feature's own spec) before considering the work done, and confirmed via a clean-baseline comparison that only 2 pre-existing, unrelated failures remained. Session 4 stacked several rounds of live-demo feedback: a real race where the justify-now dialog and its card could get unmounted by the data refetch before the user ever saw the prompt (fixed with a two-phase pinned/exiting state machine); a card visibly jumping to the end of the grid instead of staying in place (fixed by rebuilding `visibleRows` as a single ordered pass); and a request to crossfade the action buttons instead of swapping them abruptly. A stray request about an unrelated "Cierre de Nómina" gate (belonging to issue #329 / PR #335 in a different workspace) was correctly declined and not implemented here. Session 5's ask ("centralize enter/exit transitions across every dialog in the system") turned out to have much wider scope than this issue once a full component survey ran: 3 duplicated animation implementations plus 6 dialogs with no animation at all, spread across ~15 files. Per explicit user direction, the full system-wide migration was split into its own issue (#342, logged as Sprint 001 Follow-up Work for the next sprint) rather than expanding this PR's scope; only the shared hook plus its application to Attendance's two dialogs landed here. The full 46-spec/151-test Cypress suite was run (not just the attendance subset) and 6 failures were found; each was reproduced identically against a clean baseline with this session's changes stashed out, confirming none were regressions — one is the previously-documented `attendance-day-status.cy.ts` test-order flake, the other five are unrelated pre-existing flakes (toast/devtools-overlay timing, date/week-number assertions). All 3479 Vitest tests and linters verified green throughout; every visual change was also confirmed live in a browser, not just in automated tests. Session 6 was the `/finish-pr` readiness pass: a `webapp-lint` CI failure (stale local route types masking a real `useNavigate` typing break) and, across two Devin/DeepWiki review passes, four real bugs in sessions 3–4's code — an exit-animation-skip bug, a race between that fix and the mark-falta mutation's refetch, `EmployeeAttendanceCard` violating the mandatory Custom Hook Convention, and `resolveDefaultFilter` landing on an empty tab at end-of-day. None were caught by Vitest/Cypress since all four are timing- or data-shape-dependent; all five were fixed, tested, and re-verified against a clean Devin/DeepWiki pass (0 Bugs) before merge.

---

## 🔗 References

- GitHub issue: [#327](https://github.com/pakodiazdev/sushigo/issues/327)
