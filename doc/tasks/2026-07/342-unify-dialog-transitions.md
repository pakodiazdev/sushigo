# 🔨 Task #342: Unify Dialog Component and Enter/Exit Transitions Across the System

## 📖 Story

**English:**
As a Developer, I need one shared dialog transition hook/component used by every centered dialog in the app, so that I stop duplicating the same animation state machine and every dialog gets a consistent fade/scale enter/exit.

**Español:**
Como Developer, necesito un único hook/componente de transición de diálogo compartido usado por todos los diálogos centrados de la app, para dejar de duplicar la misma máquina de estados de animación y que todos los diálogos tengan un fade/scale de entrada/salida consistente.

---

## 🧠 Context

Discovered while working on #327 (Attendance "Ausentes" stat card). A first version of a shared hook (`components/ui/use-dialog-transition.ts`) was introduced scoped to `ConfirmDialog` and `RegisterLeaveDialog` in the PR for #327/#336. This task completes the migration for the rest of the app.

**Current state (verified against the codebase, not just the issue text):**
- `components/ui/use-dialog-transition.ts` (`useDialogTransition`) already exists and is already used by `ConfirmDialog` and `RegisterLeaveDialog` — this *is* the promoted hook the issue asked for, just under a different name than originally proposed.
- `components/employees/use-dialog-animation.ts` + `use-dialog-shell.ts` + `dialog-frame.tsx` (the old, pre-promotion implementation) is still duplicated and still used by 5 files: `RegisterVacationRequestDialog.tsx`, `ManualOvertimeMovementDialog.tsx`, `extra-day-section.tsx` (`ExtraDayHistoryDialog`), `schedule-dialog.tsx` (`ScheduleDialog`), `leave-summary-section.tsx` (`FullHistoryDialog`).
- 6 dialogs have zero enter/exit animation: `OverrideScopeDialog`, `OverrideListDialog`, `PermissionManagerDialog`, `ExtraDayNegotiationDialog`, `OvertimeDecisionDialog`, `BranchSelectionDialog`.
- `SlidePanel` (~27 consumers) is a separate, intentional animation family — out of scope, left as-is but documented.

---

## ✅ Technical Tasks

- [x] 🔨 Promote `use-dialog-shell.ts` + `dialog-frame.tsx` from `components/employees/` into `components/ui/`, rewiring `useDialogShell` to call the already-promoted `useDialogTransition`
- [x] 🧹 Delete `components/employees/use-dialog-animation.ts`, `use-dialog-shell.ts`, `dialog-frame.tsx`, and `__tests__/use-dialog-animation.test.ts` (fully superseded by `components/ui/use-dialog-transition.ts` + its test)
- [x] 🔨 Migrate `RegisterVacationRequestDialog.tsx` and `ManualOvertimeMovementDialog.tsx` onto the promoted `components/ui/dialog-frame.tsx` + `use-dialog-shell.ts`
- [x] 🔨 Migrate `ExtraDayHistoryDialog` (`extra-day-section.tsx`), `ScheduleDialog` (`schedule-dialog.tsx`), and `FullHistoryDialog` (`leave-summary-section.tsx`) onto `useDialogTransition` directly (same inline pattern as `ConfirmDialog`)
- [x] 🧪 Update `extra-day-section.test.tsx`'s mock path from `../use-dialog-animation` to `@/components/ui/use-dialog-transition`
- [x] ✨ Add `useDialogTransition` to `PermissionManagerDialog` and `OvertimeDecisionDialog` (both already receive a persistent `isOpen` from parent state — direct wiring, no parent changes needed)
- [x] ✨ Add animated exit to `OverrideScopeDialog`, `OverrideListDialog`, and `ExtraDayNegotiationDialog` — each currently unmounted immediately by its parent (`{condition && <Dialog/>}`, no persistent `isOpen`). Approach (confirmed with user): give each an `isOpen` prop derived from the existing truthy condition, and cache the last non-null content via an internal `useRef` so it keeps rendering through the exit animation — no changes to `use-create-day-override.ts`, `use-schedule-content.ts`, or the attendance page's extra-day state
- [x] ✨ `BranchSelectionDialog` — add `createPortal` and swap its bespoke markup/backdrop for the shared `animate-dialog-*` classes and `border-border`/`bg-background` tokens
- [x] 📚 Document `SlidePanel` as an intentionally separate animation family (short comment, no code change)
- [x] 🧪 Vitest coverage for the 6 newly-animated dialogs
- [x] 🧪 Re-run existing Cypress specs that already exercise these dialogs to confirm no visual regression (`direct-permission-manager.cy.ts`, `attendance-overtime-decision.cy.ts`, `attendance-extra-day-express.cy.ts`, schedule/employees specs) — no new specs needed, flows are already covered

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** `4h 41m`

### 📅 Sessions
```json
[
  { "date": "2026-07-28", "start": "19:46", "end": "21:16" },
  { "date": "2026-07-28", "start": "21:16", "end": "21:22" },
  { "date": "2026-07-29", "start": "10:35", "end": "11:05" },
  { "date": "2026-07-29", "start": "11:50", "end": "12:35" },
  { "date": "2026-07-29", "start": "13:20", "end": "13:50" },
  { "date": "2026-07-29", "start": "16:50", "end": "17:30" },
  { "date": "2026-07-29", "start": "17:45", "end": "17:55" },
  { "date": "2026-07-29", "start": "18:00", "end": "18:30" }
]
```

---

## 📊 Retrospective
- **Actual total:** 4h 41m (90 min + 6 min + 30 min + 45 min + 30 min + 40 min + 10 min + 30 min)
- **vs optimistic:** +41m
- **vs pessimistic:** −3h 19m

**Justification:**

The core implementation (promoting the shared hook, migrating 5 duplicated-animation dialogs, animating the 6 previously-unanimated ones, and reconciling `BranchSelectionDialog`) landed within the optimistic estimate in the first session — the codebase investigation up front (confirming `useDialogTransition` already existed from #327/#336, and mapping exactly which dialogs still needed migrating) paid off by avoiding rework during implementation.

The overrun past the optimistic estimate came entirely from post-implementation review cycles that weren't part of the original scope estimate: addressing 3 Copilot review comments (`/pr-comments`), fixing a SonarCloud cognitive-complexity violation introduced by the `OverrideScopeDialog` changes (`/sonar-review`), and two follow-up bug reports from manual/code review — a stale-content flash in `OvertimeDecisionDialog` during its exit animation, and an Escape-key double-close bug where `OverrideScopeDialog`/`OverrideListDialog` nested inside `ScheduleDialog` both closed on one keypress. Both bugs were direct consequences of the "keep dialogs mounted with cached content for the exit animation" pattern this task introduced, applied to two dialogs the original technical-task list didn't call out individually. Each cycle was self-contained (root-caused, fixed, tested, and pushed within under an hour), so total time stayed well under the pessimistic estimate despite four extra review rounds.

---

## 🔗 References

- GitHub issue: [#342](https://github.com/pakodiazdev/sushigo/issues/342)
- Follows up on #327 / PR #336 (introduced `components/ui/use-dialog-transition.ts`)
