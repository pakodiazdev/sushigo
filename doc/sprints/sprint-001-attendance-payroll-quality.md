---
sprint: "001"
title: Attendance, Payroll & Quality
status: In Progress

created: 2026-07-25
started: 2026-07-26
completed:
last_updated: 2026-07-30

base_branch: main
base_commit: 079a316
scope_issues: 27

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-000-introduction.md
next:
---

# Sprint 001 — Attendance, Payroll & Quality

> Close a real attendance-editing gap, tighten payroll-close integrity, and clear the highest-value frontend quality/security debt — all 26 currently open Issues, ordered by value and scheduled so multiple agents can work in parallel without touching the same file.

## 1. Executive Summary

This sprint absorbs every Issue open on `pakodiazdev/sushigo` at the time of planning (26 total): 4 hand-authored feature/bug Issues from this week (#325, #327, #328, #329), 2 older hand-authored Issues (#276, #324), 1 large deferred Issue (#85, mobile bootstrap), and 19 SonarCloud code-quality Issues (#305–#323).

The work was ordered by **value first, parallelism second**: Security and Reliability bugs go first, then user-requested attendance/payroll product features, then real-risk quality issues (accidental form submits, list-reorder rendering bugs, accessibility gaps), then pure maintainability cleanup, with the large deferred mobile bootstrap kept explicitly last despite having zero file conflicts with anything else.

A file-level conflict analysis (parsed directly from each SonarCloud Issue's "Affected locations," plus a code audit for the 7 hand-authored Issues) produced **6 execution rounds** — every Issue inside the same round shares zero files with every other Issue in that round, so a round's Issues can all be worked simultaneously, one agent per Issue, with no merge-conflict risk between them.

Expected outcome: a real attendance-correction capability shipped, payroll-close periods can no longer be closed early or as a partial week, the two highest-connected quality debt nodes (#305, #306) cleared, and the sprint's own estimate-vs-tracked comparison populated so future sprints can calibrate estimates against real data.

**Progress as of 2026-07-30:** 21 of 27 scoped Issues completed (77.8%) — #323 (security), #322 (a11y/reliability), #325 (attendance dialog overlay, PR #334 ready to merge), #309 (list-reorder rendering bug, PR #339 ready to merge), #327 (Ausentes stat card, PR #336 ready to merge), #329 (payroll close week gate, PR #335 ready to merge), #314 (unused React typed props removed, PR #343 ready to merge), #315 (deeply nested role-toggle handler flattened, PR #344 ready to merge), #359 (unify issue/task tracking, PR #361 ready to merge), #317 (rethrow-only catch removed, PR #372 ready to merge), #319 (redundant union type removed, PR #369 ready to merge) — all eleven in Round 1 — plus #306 (explicit button type attribute, PR #346 ready to merge), #328 (allow correcting an already-recorded attendance event, PR #347 ready to merge), #312 (stable Context Provider value identities, PR #348 ready to merge), and #307 (Number static methods, PR #362, merged), all four in Round 2, plus #310 (DevDebugger drag-handle keyboard equivalent, PR #366 ready to merge), #313 (ignored exceptions now logged, PR #364 ready to merge), and #320 (per-page label associated with its select, PR #371 ready to merge), all three in Round 3, plus #311 (cognitive complexity reduced in 3 components, PR #349 ready to merge), in Round 6, plus #324 (dev-only Components catalog page, PR #352 ready to merge), in Round 4, plus #308 (nested ternaries flattened, PR #363 ready to merge), in Round 5.

## 2. Context

The previous planning document (an unversioned `sushigo-dev-lab/plan/roadmap.md`, tracking the same backlog before it existed as a formal sprint) established the value ranking and round structure below through direct repository analysis, not topic guessing. That document lived in the dev-lab orchestration repo, outside version control (`plan/.gitignore` excluded everything under it), so no history of past planning was preserved. This sprint moves that planning permanently into `sushigo`, under the process introduced in `sprint-000-introduction.md`, so it accumulates real history from this point forward.

Relevant discoveries folded into scope during planning:

- Issue #326 (an earlier attempt at the attendance-editing feature) was closed as superseded once a code audit against `origin/main` showed #83 already shipped the role/date authorization layer (`AttendancePolicy`, `useAttendancePermissions`) — #328 in this sprint is the corrected, narrower scope: allow *correcting* an already-recorded value, which no existing endpoint permits today.
- #325 and #328 both modify `AttendanceTimeDialog.tsx` — sequenced across Round 1 → Round 2 specifically because of this.
- #305 and #306 are the two most-connected nodes in the conflict graph (48 and 18 affected files respectively); nearly every SonarCloud Issue scheduled in Round 3 or later is downstream of one of them clearing a shared file.

Base state: `main` @ `079a316`, 26 open Issues, zero Issues yet linked to a GitHub Project or labeled with a sprint/iteration.

## 3. Sprint Goal

**Sprint Goal:** Improve attendance and payroll reliability while reducing high-risk frontend quality debt without creating file conflicts between agents.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-07-25 |
| Started | 2026-07-26 |
| Completed | — |
| Target completion (deadline) | 2026-08-09 |
| Calendar duration (planned) | 14 days |
| Active workdays | — |
| Progress (Issues completed) | 21 / 27 (77.8%) — #323, #322, #325, #309, #327, #329, #314, #315, #306, #328, #312, #311, #324, #359, #308, #307, #310, #313, #317, #320, #319 |

### How the deadline was set

The target date is **not** the raw sum of every Issue's Pessimistic estimate (that grand total is 85.5h and assumes fully serial execution — see §10). It is the project's existing GitHub Project iteration cadence: the "Iteration" field on **SushiGo Admin** (#7) already has three completed iterations (`Iteration`, `Iteration 2`, `Iteration 3`, all 2025-11 → 2025-12) at a **14-day duration**. Sprint 1 reuses that cadence rather than inventing a new one.

Sanity check against effort: assuming enough parallel agents that a round's duration is bounded by its *slowest single Issue* rather than the sum of all Issues in it, the critical path across all 6 rounds (excluding #85, explicitly deprioritized filler that must not gate the sprint) is:

```text
Round 1 (#329, 6h max)  →  Round 2 (#328, 7h)  →  Round 3 (2h)  →  Round 4 (#305, 8h)  →  Round 5 (#308, 5h)  →  Round 6 (#311, 2h)
Pessimistic critical path ≈ 30h  ·  Optimistic critical path ≈ 17h
```

30h of pessimistic critical-path effort over a 14-day window is ≈2.1h/day of active agent-supervised work — comfortably inside the window, so 2026-08-09 is a realistic, non-aggressive deadline rather than a stretch target.

## 5. Scope

### 5.1 Included

All 26 currently open Issues on `pakodiazdev/sushigo`:

- **Attendance & payroll product work:** #325, #327, #328, #329
- **Backend feature:** #276
- **Developer tooling:** #324
- **SonarCloud code quality (Maintainability/Reliability/Security):** #305, #306, #307, #308, #309, #310, #311, #312, #313, #314, #315, #316, #317, #318, #319, #320, #321, #322, #323
- **Deferred, included only because it has zero file conflicts with the rest:** #85

### 5.2 Excluded

Nothing was intentionally left out of this sprint — it absorbs the full open backlog at planning time. Any Issue opened after `base_commit` (`079a316`) is out of scope until explicitly added via §5.3.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-07-26 | ✅ | — | Sprint created from `sushigo-dev-lab/plan/roadmap.md` | Converting ad hoc planning into the formal sprint process (`sprint-000-introduction.md`) |
| 2026-07-29 | 🚧 | #359 | Added to sprint scope | Dual-tracking (`doc/tasks/backlog/*.md` + GitHub Issue) had already caused drift — 3 orphaned files for closed issues, 1 issue never migrated to GitHub. Makes the GitHub Issue the single source of truth while work is open, archives a verbatim snapshot only at `/finish-pr` time, and starts a technical decisions log (`doc/decisions.md`) |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-07-27 | #340 | Version `.claude/settings.json` and reduce permission prompts | Repeated Bash/gh permission prompts noticed while executing Round 1 work across parallel workspaces (`sushigo-a`, `sushigo-c`) | Read-only allowlist added and versioned in `sushigo-c`; `.claude/settings.json` un-ignored so future workspaces can adopt the same config from git instead of re-deriving it |
| 2026-07-29 | #355 | Auto-run `/rebase-main` from `/finish-pr` when the branch is BEHIND main | Manual `/rebase-main` + re-invoke round-trip noticed while closing out sprint PRs that had gone `BEHIND` main during review | PR #356 — Phase 1b and Phase 7.6c now auto-rebase on `BEHIND` instead of stopping, falling back to the existing conflict-abort-and-report behavior if the rebase doesn't apply cleanly |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | #323 (Security), #322 (Reliability bug) | Real security/correctness bugs, not style — always go first regardless of file conflicts |
| **High** | #325, #329, #328, #327 | User-requested product work: a real UX bug (#325) and three attendance/payroll features that close operational gaps (mistaken time corrections, payroll period integrity, cleaner working screen) |
| **Medium** | #276, #306, #309, #310, #320, #321, #324, #359 | Real functional/accessibility risk (WhatsApp silently not sending, accidental form submits, list-reorder rendering bugs, a11y gaps) or clear productivity value (#324 dev catalog, #359 fixes dual-tracking drift already causing orphaned task files), but lower urgency than the above |
| **Low** | #305, #307, #308, #311–#319 (remaining Maintainability code smells) | Pure code-quality cleanup, no user-facing behavior change |
| **Deferred** | #85 | Large (8–14h), separate Flutter repo, strategically deferred already — kept last on purpose despite having zero file conflicts with anything |

### Ordering principle

> **Value first, parallelism second.**

Lower-value maintainability cleanups are interleaved into the same rounds as high-value work whenever they don't conflict on a file, so spare agent capacity is never idle. An Issue only lands later than its value would suggest when it genuinely collides (same file) with something higher-value already scheduled earlier.

## 7. Route A — Execution Rounds

### Round 1 — Critical + High value, plus zero-conflict filler (14 Issues)

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #323 | [Security] PRNGs should not be used in security contexts | Critical | 0.5h | 1h | 0.6h | PR #332 | Fixed — `Math.random()` → `crypto.randomUUID()`, plus guarded `generateToastId()` fallback for insecure contexts (Copilot review). Commits squashed to 1. Reviewed, merge pending |
| ✅ | #322 | [Reliability] Mouse events should have corresponding keyboard events | Critical | 1h | 2h | 0.2h | PR #333 | Real a11y/interaction bug. Fixed, SonarCloud + Copilot review passed, merged |
| ✅ | #325 | Overlay del diálogo "Registrar entrada" no cubre toda la pantalla | High | 0.5h | 1.5h | 0.27h | PR #334 | Fixed — added `container="viewport"` to `ConfirmDialog` in `AttendanceTimeDialog`; portal-to-`document.body` test added, 2 Copilot review comments addressed. **Land before starting #328** — both touch `AttendanceTimeDialog.tsx`. PR ready, merge pending |
| ✅ | #329 | Auto-calculate current week for payroll close + Sunday 19:00 gate | High | 3h | 6h | 5.0h | PR #335 | Fixed — read-only current-week display, Sunday-19:00 close gate (frontend + backend), full-week validation, reusable `LabeledBadge` component, frontend sourced from the real Application Clock, periods-list redirect + roll-forward to next period. Fixed two real bugs found post-review: an out-of-order-close gap (`/pay-periods/next-unclosed` replaces a "latest period + 1" lookup) and a contradictory overdue banner while browsing the current week. SonarCloud quality gate clean (0 smells). 0 bugs in Devin review, 13/13 checks green. PR ready, merge pending |
| ✅ | #327 | Add "Ausentes" stat card, move absent employees out of main grid | High | 2h | 4h | 16.4h | PR #336 | Fixed — 5th "Ausentes" stat card + clickable filter tabs, smart default tab w/ URL persistence, justify-now flow with exit animations, shared `useDialogTransition` hook (full migration → #342). `/finish-pr`'s Devin/DeepWiki readiness gate caught and fixed 5 issues: a CI route-typing break, an exit-animation race, a Custom Hook Convention violation, and an empty-tab-at-end-of-day bug — 0 Bugs on final pass. PR ready, merge pending |
| ⏳ | #276 | Integrate a real WhatsApp provider in WhatsAppService | Medium | 2h | 4h | — | — | Backend-only, zero overlap with anything |
| ✅ | #309 | [Maintainability] JSX list components should not use array indexes as key | Medium | 1h | 2h | 0.7h | PR #339 | Fixed 5 array-index keys (data-grid ellipsis, cash line items, product-wizard conversions/balances, dashboard stats); 2 Copilot review bugs fixed (non-functional state updaters causing possible desync under rapid clicks); Vitest coverage added for previously-untested remove-item flows (81.8% on touched files); ESLint + TypeScript clean; PR ready, merge pending |
| ⏳ | #321 | [Maintainability] Heading elements should have accessible content | Medium | 0.5h | 1h | — | — | a11y |
| ✅ | #314 | [Maintainability] Unused React typed props should be removed | Low (filler) | 1h | 2h | 0.03h | PR #343 | Fixed — removed unused `onClose` from `VariantDetailsProps` and `showText` from `LogoProps` (both dead, confirmed no call site read them). Vitest 7/7, ESLint + TypeScript clean, Devin/DeepWiki 0 bugs/0 flags, 12/12 checks. PR ready, merge pending |
| ✅ | #315 | [Maintainability] Functions should not be nested too deeply | Low (filler) | 0.5h | 1h | 0.25h | PR #344 | Fixed — extracted `addRole`/`removeRole` module-level functions to flatten the `ToggleSwitch onChange` handler (S2004); further split to avoid a boolean selector parameter after `/sonar-review` flagged the initial single-function fix as S2301. New Vitest test for role toggle, full suite (3531 tests) green, SonarCloud gate OK, 12/12 checks. PR ready, merge pending |
| ⏳ | #316 | [Maintainability] Jump statements should not be redundant | Low (filler) | 0.5h | 1h | — | — | Conflict-free, fills spare capacity |
| ✅ | #317 | [Maintainability] "catch" clauses should do more than rethrow | Low (filler) | 0.5h | 1h | 0.03h | PR #372 | Fixed — removed the rethrow-only `catch` in `auth.store.ts`'s `refreshUser` (no behavior change), clearing `typescript:S2737`. 30 existing tests passing, ESLint/TypeScript clean. PR ready, merge pending |
| ✅ | #319 | [Maintainability] Type constituents of unions/intersections redundant | Low (filler) | 0.5h | 1h | 0.03h | PR #369 | Fixed — simplified `form?: 'new' | string` to `form?: string` in `EmployeesSearch`, clearing `typescript:S6571`. No behavior change (every consumer already treated `form` as a plain string), 33/33 existing tests passing unmodified, ESLint + TypeScript clean. PR ready, merge pending |
| ✅ | #359 | Unify issue/task tracking: GitHub Issue as single source, archive-on-close, technical decisions log | Medium | 2h | 4h | 3.0h | PR #361 | Fixed — retired `doc/tasks/backlog/`, started `doc/decisions.md` + TD-01, rewrote `/start-issue`/`/finish-pr` for the issue-first lifecycle, added #359 itself to Sprint 001 scope. 1 Copilot review thread resolved. PR ready, merge pending |
| ⏳ | #85 | Mobile App — Project Bootstrap (Flutter) | Deferred | 8h | 14h | — | — | Zero conflicts, but **must not** be prioritized over the 13 Issues above — background work for a spare agent only |
|  |  | **Round 1 total** |  | **23.5h** | **45.5h** | **—** |  |  |

**If only 5 workspaces are available:** run #323, #322, #325, #329, #327 first — the entire Critical+High tier unblocked today. Cycle #276, #309, #321, then filler, in as workspaces free up.

### Round 2 — 5 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #328 | Allow correcting an already-recorded attendance event | High | 4h | 7h | 6.1h | PR #347 | Fixed — pencil affordance on each recorded event, new `attendances.update` permission gating corrections on top of #83's `AttendancePolicy::edit`, check-out correction syncs (never duplicates) the overtime bank movement. `/sonar-review` + Devin/DeepWiki review found and fixed 3 real bugs post-implementation: decided-overtime guard checked the wrong model field, `CloseDayAction`'s batch path lost its idempotency safeguard, and correcting lunch-start left lunch tardiness stale. 13/13 checks, SonarCloud clean, all review threads resolved. PR ready, merge pending |
| ✅ | #306 | [Maintainability] `<button>` elements should have an explicit "type" attribute | Medium | 3h | 5h | 1.9h | PR #346 | Fixed — `type="button"` added to 52 native `<button>` elements across 18 files; `data-grid.tsx`'s 17 occurrences refactored into shared helper functions, clearing a SonarCloud new-code duplication flag the scripted fix tripped. SonarCloud gate OK (100% new coverage after 2 targeted tests closed a real coverage gap — untested pagination edge-buttons and the schedule dialog's default tab), Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 0 review threads. Commits squashed to 1. PR ready, merge pending |
| ✅ | #307 | [Maintainability] Number static methods preferred over global equivalents | Low (filler) | 2h | 3h | 0.05h | PR #362 | Fixed — replaced global `parseFloat`/`isNaN` with `Number.parseFloat`/`Number.isNaN` across 5 files (17 occurrences), clearing `typescript:S7773`; 2 tests added afterward to close a new-code coverage gap. No behavior change, all 69 existing tests passed unmodified. Merged (workspace `sushigo-a`) |
| ✅ | #312 | [Maintainability] React Context Provider values should have stable identities | Low (filler) | 1h | 2h | 0.27h | PR #348 | Fixed — wrapped `SidebarContext`/`ThemeContext`/`ToastContext` Provider values in `useMemo` and their inline handlers in `useCallback`, resolving all 3 `typescript:S6481` occurrences. Value-identity stability tests added to all three providers. Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 1 review thread (missing task Retrospective) resolved. PR ready, merge pending |
| ⏳ | #318 | [Maintainability] Track uses of "TODO" tags | Low (filler) | 0.5h | 1h | — | — | Conflict-free with this round |
|  |  | **Round 2 total** |  | **10.5h** | **18h** | **—** |  |  |

### Round 3 — 3 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #310 | [Maintainability] Non-interactive DOM elements should not have an interactive handler | Medium | 1h | 2h | 3.7h | PR #366 | Fixed — added `handleDragKeyDown` keyboard equivalent for the two `DevDebugger.tsx` drag handles (arrow keys nudge position, Enter/Space reset to default), with `role="button"`/`tabIndex`/`aria-label` sized to match the full mouse-draggable area while excluding the sibling action buttons. 3 of the 4 flagged locations were already fixed by prior commits (#306, #311). Devin/DeepWiki found and fixed 2 real bugs post-implementation (mouse-drag area shrunk to the title text, keyboard focus region mismatched the mouse-draggable region) — final pass 0 bugs. `/sonar-review` cleared 2 new code smells (Cognitive Complexity via `DebuggerHeader` extraction, `role="button"` div → native `<button>`). 78 tests passing, ESLint/TypeScript clean, SonarCloud gate OK. PR ready, merge pending |
| ✅ | #320 | [Maintainability] Label elements should have a text label and an associated control | Medium | 0.5h | 1h | 0.27h | PR #371 | Fixed — associated the "Por pagina:" `<label>` in `data-grid.tsx` with its `<select>` via `useId()`/`htmlFor`/`id`, clearing `typescript:S6853`; regression test added via `getByLabelText`. 27/27 tests passing, ESLint/TypeScript clean, 0 review threads. PR ready, merge pending |
| ✅ | #313 | [Maintainability] Exceptions should not be ignored | Low (filler) | 1h | 2h | 0.23h | PR #364 | Fixed — added `console.error` logging to the 2 empty catch blocks (`create-adjustment-dialog.tsx`, `auth.store.ts`), matching the existing logging pattern already used elsewhere in `auth.store.ts`; clears both `typescript:S2486` occurrences. No behavior change, 45/45 existing tests passing, ESLint/TypeScript clean. PR ready, merge pending |
|  |  | **Round 3 total** |  | **2.5h** | **5h** | **—** |  |  |

### Round 4 — 2 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #324 | Add a dev-only Components catalog page | Medium | 3h | 6h | 2.2h | PR #352 | Fixed — new `/dev/components` route with a registry-driven catalog covering every `src/components/ui/` component, gated by a new `requireDev()` route guard and a dev-only sidebar entry. PR review fixed a discriminated-union `CatalogEntry` type, a wrong Toast `importPath`, and a SonarCloud read-only-props smell. 0 bugs, 7 review threads resolved. PR ready, merge pending |
| ⏳ | #305 | [Maintainability] React props should be read-only | Low | 5h | 8h | — | — | 48 files, the single most-connected Issue in the graph |
|  |  | **Round 4 total** |  | **8h** | **14h** | **—** |  |  |

### Round 5 — 1 Issue

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #308 | [Maintainability] Ternary operators should not be nested | Low | 3h | 5h | 0.37h | PR #363 | Fixed — flattened 12 of the 14 flagged nested ternaries across 9 files (2, both in `confirm-dialog.tsx`, had already been resolved by the prior `useDialogTransition`/`animCls` refactor); no behavior change, full Vitest suite (3568 tests) green. PR ready, merge pending |
|  |  | **Round 5 total** |  | **3h** | **5h** | **—** |  |  |

### Round 6 — 1 Issue

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #311 | [Maintainability] Cognitive Complexity of functions should not be too high | Low | 1h | 2h | 0.2h | PR #349 | PR ready, merge pending |
|  |  | **Round 6 total** |  | **1h** | **2h** | **—** |  |  |

### Round rules

- Issues in the same round must not modify the same files unless explicitly coordinated.
- Round order represents the recommended default execution order, not a hard dependency, except where §8 identifies a real one.
- When agent capacity is limited, highest-value Issues start first; filler starts only once higher-value work is already assigned or blocked.

## 8. Route B — Sequential Dependencies

```text
#325 (Round 1, ~1h, ✅ done — PR #334 ready to merge)  →  #328 (Round 2, ~4-7h)
   Both touch AttendanceTimeDialog.tsx — land #325's one-line fix first
   so #328 isn't rebasing around it mid-flight.

#306 (Round 2)  →  unblocks #310, #320 (Round 3)  →  unblocks #324, #305 (Round 4)  →  unblocks #308 (Round 5)  →  unblocks #311 (Round 6)
   This chain is why the SonarCloud tail stretches to 6 rounds: #305/#306 are the two
   highest-connected nodes in the conflict graph, and nearly everything downstream of
   them touches a file one of them also touches.
```

No product-level dependency chains exist in this sprint (unlike the previous roadmap's now-closed Payroll/Overtime/Vacation chains) — every ordering constraint above is file-conflict driven, not business-logic driven.

## 9. Conflict Risk Map

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|
| `src/components/ui/data-grid.tsx` | #305, #306, #308, #309, #320 | 4, 2, 5, 1, 3 | High-conflict node — never schedule two of these together |
| `src/components/dashboard/Dashboard.tsx` | #305, #308, #309, #318 | 4, 5, 1, 2 | — |
| `src/components/cash/create-adjustment-dialog.tsx` | #305, #307, #309, #313 | 4, 2, 1, 3 | — |
| `src/components/inventory/product-wizard.tsx` | #305, #308, #309, #311 | 4, 5, 1, 6 | — |
| `src/components/dev/DevDebugger.tsx` | #305, #306, #310, #311 | 4, 2, 3, 6 | — |
| `src/components/layout/Sidebar.tsx` | #306, #310, #322, #324 | 2, 3, 1, 4 | Touched by 4 Issues — verify before mixing rounds |
| `src/components/ui/confirm-dialog.tsx` | #308, #310, #322 | 5, 3, 1 | — |
| `src/components/auth/BranchSwitcher.tsx` | #306, #310, #322 | 2, 3, 1 | — |
| `src/components/ui/toast-provider.tsx` | #305, #312, #323 | 4, 2, 1 | — |
| `src/components/inventory/stock-out-form.tsx` | #305, #308, #311 | 4, 5, 6 | — |
| `src/components/employees/employee-edit-create-form.tsx` | #305, #308, #315 | 4, 5, 1 | — |
| `src/components/attendance/AttendanceTimeDialog.tsx` | #325, #328 | 1, 2 | See §8 |
| `src/stores/auth.store.ts` | #313, #317 | 3, 1 | — |
| `src/hooks/use-employees-search.ts` | #308, #319 | 5, 1 | — |

(Remaining 2-way overlaps — `toast.tsx`, `dropdown-menu.tsx`, `search-input.tsx`, `logo.tsx`, `slide-panel.tsx`, `SidebarContext.tsx`, `ThemeContext.tsx`, `wage-history-card.tsx`, `register-wage-form.tsx`, `open-session-dialog.tsx`, `variant-details.tsx`, `employee-detail-view.tsx`, `stock-dashboard.tsx` — all between #305 and one other Issue already placed in a different round above.)

### Conflict methodology

- SonarCloud Issues (#305–#323): files parsed directly from each Issue's "Affected locations" section.
- Hand-authored Issues (#276, #324, #325, #327, #328, #329, #85): files confirmed via direct code audit against `origin/main` during scoping.
- Two Issues conflict when they modify the same file. Rounds are a graph-coloring of that conflict graph: no two Issues in the same round share a file.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 15 | 23.5h | 45.5h | — | — | — |
| Round 2 | 5 | 10.5h | 18h | — | — | — |
| Round 3 | 3 | 2.5h | 5h | — | — | — |
| Round 4 | 2 | 8h | 14h | — | — | — |
| Round 5 | 1 | 3h | 5h | — | — | — |
| Round 6 | 1 | 1h | 2h | — | — | — |
| **Grand total** | **27** | **48.5h** | **89.5h** | **—** | **—** | **—** |

Update the comparison as each round finishes — do not wait until sprint closure, because a slow round may be hidden by faster work elsewhere.

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | ~6h (this sprint's own setup: research, issue creation/correction, conflict analysis, sprint-doc conversion) | — | — |
| Implementation | 46.5h–85.5h (see §10) | — | — |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **—** | **—** | **—** |

## 12. Notes on Estimate Confidence

- #325, #327, #328, #329, #276, #324, #85 Opt./Pess. values come from their own GitHub Issue bodies (`## ⏱️ Time` → Estimates).
- All SonarCloud Issue Opt./Pess. values are **rough T-shirt sizing from affected-file count**, not from the Issue body — those Issues carry no Time section today. Treat them as planning-only; update with real Estimates on each Issue once someone actually scopes it, and update the corresponding row above to match before that round starts.
- The sprint deadline (§4) is derived from the GitHub Project's existing 14-day iteration cadence, cross-checked against — not derived from — the raw estimate totals. See §4 for the calculation.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #323 | `Math.random()` → `crypto.randomUUID()` in `toast-provider.tsx`, guarded `generateToastId()` fallback (Date.now() + counter, no `Math.random()`) for insecure contexts/older browsers per Copilot review | PR #332 | — | 0.6h | ESLint + TypeScript pass, 0 errors; no Vitest/Cypress needed (internal id-gen, no behavior change); commits squashed to 1; reviewed, merge pending |
| ✅ | #322 | Backdrop `<div onClick>` → native `<button>` in confirm-dialog.tsx, BranchSwitcher.tsx, Sidebar.tsx (reused `dialog-frame.tsx` idiom) | PR #333 | 621868b | 0.2h | SonarCloud + Copilot review passed; existing Vitest suites (60 tests) pass unmodified; merged |
| ✅ | #325 | Added `container="viewport"` to `ConfirmDialog` in `AttendanceTimeDialog`, fixing the overlay for all 4 attendance dialogs (check-in, lunch-start, lunch-return, check-out); added a portal-assertion test | PR #334 | — | 0.27h | Vitest 17/17 passing, ESLint + TypeScript clean, 2 Copilot review comments addressed and resolved; manual in-browser verification of the 4 flows still pending (no browser automation available); PR ready, merge pending |
| ✅ | #329 | Auto-calculated current-week display + Sunday-19:00 close gate (frontend + backend, full-week validation), reusable `LabeledBadge` component, frontend sourced from the real Application Clock, periods-list redirect + roll-forward to next period after a close, new `/pay-periods/next-unclosed` endpoint fixing an out-of-order-close gap-hiding bug, and a fix for a contradictory overdue banner while browsing the current week | PR #335 | — | 5.0h | PHPUnit 737 passing (incl. 6 for the new endpoint), Vitest full suite passing (incl. 2 new tests for the banner fix), Cypress 11/11 (payroll-close-preview + payroll-close-confirm, incl. the skipped-week regression and the banner-vs-button contradiction check) against dev-lab E2E stack; Pint/ESLint/TypeScript clean; 3 Copilot review threads resolved (1 code fix, 2 justified); SonarCloud quality gate clean (2 new-code smells fixed via `/sonar-review`); Devin/DeepWiki: 0 bugs, 13/13 checks; commits squashed to 1; PR ready, merge pending |
| ✅ | #327 | Added a 5th "Ausentes" stat card, made every stat card a clickable filter tab with a smart default tab + URL persistence, a justify-now prompt with pin/exit-animation flow for "Marcar falta", and extracted a shared `useDialogTransition` hook (full system-wide migration deferred to #342) | PR #336 | — | 16.4h | Vitest 3479+/3479+ passing, PHPUnit 1384 passing, Cypress 46 specs/151 tests (6 pre-existing/unrelated failures verified against a clean baseline); ESLint + TypeScript clean; `/finish-pr`'s Devin/DeepWiki readiness gate found and fixed 5 issues across two passes (a `webapp-lint` CI route-typing break, an exit-animation-skip bug, a race between that fix and the mark-falta mutation's refetch, a Custom Hook Convention violation, and `resolveDefaultFilter` landing on an empty tab at end-of-day) — final pass: 0 Bugs, 0 unresolved flags; PR ready, merge pending |
| ✅ | #328 | Added a pencil affordance to each already-recorded attendance event (check-in, lunch-start, lunch-return, check-out) reusing the existing time dialog; a new `attendances.update` permission (covered by the existing `attendances.%` wildcard) gates corrections on top of #83's date-based `AttendancePolicy::edit`; check-out correction recalculates overtime and syncs (never duplicates) the auto `OvertimeBankMovement`, rejecting with 422 once that overtime was already decided | PR #347 | — | 6.1h | PHPUnit 744/744 passing (incl. new regression tests for the decided-overtime guard, the batch day-close idempotency fix, and the lunch-tardiness recalculation), Vitest 3540/3540, Cypress 4 new + 19 existing attendance specs green against the dev-lab E2E stack; Pint/ESLint/TypeScript clean; SonarCloud quality gate clean across 2 review passes (4 code smells fixed: multi-return method, oversized seeder method, 2x cognitive-complexity); 3 Copilot review threads resolved; Devin/DeepWiki found and fixed 3 real bugs post-implementation (decided-overtime guard read the wrong model field, `CloseDayAction`'s batch path lost its correction-permission-equivalent idempotency guard, lunch-start correction left lunch tardiness stale); commits squashed to 1; PR ready, merge pending |
| ⏳ | #276 | Not started | — | — | — | — |
| ✅ | #324 | New `/dev/components` catalog route documenting every `src/components/ui/` component with a live usage example, description, and import path, gated by a `requireDev()` route guard and a dev-only sidebar entry; registry-driven so a new component is a one-entry diff | PR #352 | — | 2.2h | Vitest 3551/3551 passing (48 new for the guard, sidebar entry, and registry), Cypress 3/3 (sidebar visibility, navigation, interactive `ToggleSwitch` example); ESLint + TypeScript clean; 7 Copilot review threads resolved (discriminated-union `CatalogEntry` type, wrong Toast `importPath`, `vi.unstubAllEnvs()` cleanup) plus a SonarCloud read-only-props fix; commits squashed to 1; PR ready, merge pending |
| ✅ | #309 | Fixed 5 array-index keys (data-grid ellipsis, cash line items, product-wizard conversions/balances, dashboard stats) with stable identifiers (`crypto.randomUUID()`-backed parallel key arrays where the item objects post directly to the API, `pages[i-1]`/`stat.title` where a natural stable value existed) | PR #339 | — | 0.7h | ESLint + TypeScript clean, Vitest 47/47 passing; 2 Copilot review comments fixed (non-functional `setState` updaters in `handleAddLine`/`handleRemoveLine` and stale-closure `uom_id` read in `addOpeningBalance` — both could desync state under rapid clicks); added coverage for previously-untested remove-item flows, raising touched-file line coverage 75.4% → 81.8%; PR ready, merge pending |
| ✅ | #314 | Removed unused `onClose` from `VariantDetailsProps` (`variant-details.tsx`, dead — the owning `SlidePanel` already handles closing) and `showText` from `LogoProps` (`logo.tsx`, no call site anywhere passed it); dropped the now-invalid call-site prop and unused test mock | PR #343 | — | 0.03h | Vitest 7/7 passing, ESLint + TypeScript clean; Devin/DeepWiki: 0 bugs, 0 flags, 12/12 checks; 0 review threads; commit already a single commit; PR ready, merge pending |
| ✅ | #315 | Flattened the deeply nested `ToggleSwitch onChange` role-toggle handler in `employee-edit-create-form.tsx` into module-level `addRole`/`removeRole` functions, fixing SonarCloud S2004; further split to avoid a boolean selector parameter after `/sonar-review` flagged the initial fix as S2301 | PR #344 | — | 0.25h | Vitest 3/3 passing on the new role-toggle test, full suite (3531 tests) green, ESLint + TypeScript clean; SonarCloud quality gate OK (0 new code smells); 0 review threads; Devin/DeepWiki 0 bugs, 3 Informational-only flags; 12/12 checks; commit squashed to 1; PR ready, merge pending |
| ✅ | #306 | `type="button"` added to 52 native `<button>` elements across 18 files (rule `typescript:S9011`); `data-grid.tsx`'s 17 occurrences (4 near-duplicate responsive pagination blocks) refactored into shared helper functions (`renderEdgeButton`, `renderLeadingEdges`, `renderTrailingEdges`, `renderPaginationNav`) rather than a flat scripted insert, since the flat fix tripped the PR's own SonarCloud duplication gate | PR #346 | — | 1.9h | ESLint + TypeScript clean; SonarCloud gate OK — 0 new bugs/vulnerabilities/smells, 0.0% new duplication (was 11.5%), 100% new coverage (was 73.7% after a mis-diagnosed first attempt; the real cause, found by inspecting the raw CI lcov artifact, was two arrow-function `onClick` handlers genuinely never invoked by any test — the pagination edge-nav buttons and the schedule dialog's default tab — closed with 2 targeted test assertions); Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 0 review threads; commits squashed to 1; PR ready, merge pending |
| ✅ | #311 | Reduced cognitive complexity (`typescript:S3776`) in 3 flagged functions via structural extraction: `handleNext` split into `advanceFromStep1/2/3` (product-wizard.tsx), `StockInfoPanel`/`ProfitAnalysisPanel` extracted from nested-ternary JSX (stock-out-form.tsx), `MinimizedDebugger`/`RolesPermissionsSection`/`DevLoginSection` extracted from the render body (DevDebugger.tsx) | PR #349 | — | 0.2h | Vitest 3550/3550 passing (7 new tests added via `/sonar-review` after the extraction dropped new-code coverage to 50.8%, closing it to 94.7% — also found and fixed a latent test-mock bug causing an infinite-render worker OOM); ESLint + TypeScript clean; SonarCloud gate OK (0 new bugs/vulnerabilities/smells, 0% duplication); Devin/DeepWiki 0 bugs, 2 Informational-only flags, 12/12 checks; 0 review threads; commit squashed to 1; PR ready, merge pending |
| ✅ | #312 | Wrapped `SidebarContext`/`ThemeContext`/`ToastContext` Provider `value` in `useMemo` (and their inline toggle handlers in `useCallback`), resolving all 3 `typescript:S6481` occurrences | PR #348 | — | 0.27h | Vitest 33/33 new/updated (value-identity stability tests added to all three providers), full suite 242 files/3546 passing; ESLint + TypeScript clean; Devin/DeepWiki 0 bugs/0 flags, 12/12 checks; 1 Copilot review thread (missing mandatory task Retrospective section) fixed and resolved; commits squashed to 1; PR ready, merge pending |
| ✅ | #308 | Flattened 12 of the 14 SonarCloud-flagged nested ternaries (`typescript:S3358`) across 9 files — `employee-detail-view.tsx`, `employee-edit-create-form.tsx`, `use-employee-form.ts` (x2), `use-employees-search.ts`, `data-grid.tsx`, `slide-panel.tsx` (x2), `Dashboard.tsx`, `product-wizard.tsx`, `stock-out-form.tsx` (x2) — using whichever flat form fit the call site: a precomputed variable/component, an if/else-computed render variable, a state-keyed lookup table, or a small named helper function; the other 2 flagged locations (both in `confirm-dialog.tsx`) had already been resolved by the prior `useDialogTransition`/`animCls` refactor | PR #363 | — | 0.37h | ESLint + TypeScript clean; Vitest full suite 242 files/3568 tests passing (3 pre-existing skips), no behavior change so no new tests needed; 0 review threads; commit already a single commit; PR ready, merge pending |
| ✅ | #307 | Replaced global `parseFloat` with `Number.parseFloat` (5 files) and global `isNaN` with `Number.isNaN` (`cash-balance-service.ts`), clearing all 17 occurrences of `typescript:S7773`; 2 tests added afterward (register-wage-form onChange handlers, open-session-dialog negative-balance validation) to close a new-code coverage gap | PR #362 | 3f1e9dd | 0.05h | ESLint + TypeScript clean; Vitest 69/69 passing, identical to pre-change baseline; no Cypress needed (no behavior change); merged directly (2 commits, not squashed — housekeeping/`/finish-pr` backfilled later via #308's PR #363) |
| ✅ | #310 | Added `handleDragKeyDown` to `use-dev-debugger.ts` (arrow keys nudge the panel position 20px, Enter/Space reset to default, reusing the mouse-drag `setState` logic) and applied `role="button"`/`tabIndex`/`aria-label="Mover panel de depuración"` to both `DevDebugger.tsx` drag handles (floating panel header, minimized bubble), sized to the full mouse-draggable area while excluding the sibling action buttons; 3 of the 4 SonarCloud-flagged S6848 locations were already fixed by prior commits (#306, #311) | PR #366 | — | 3.7h | Vitest 78/78 passing (56 `use-dev-debugger` + 22 `DevDebugger`); ESLint + TypeScript clean; 1 Copilot review thread resolved; Devin/DeepWiki found and fixed 2 real bugs across 2 review passes (shrunk mouse-drag area, mismatched keyboard-focus region) — final pass 0 bugs; `/sonar-review` cleared 2 new code smells (S3776 Cognitive Complexity via `DebuggerHeader` extraction, S6819 `role="button"` div → native `<button>`) — SonarCloud gate OK, 0 new code smells; commit squashed to 1; PR ready, merge pending |
| ✅ | #313 | Added `console.error` logging to the 2 SonarCloud-flagged empty catch blocks (`typescript:S2486`) — `create-adjustment-dialog.tsx`'s create-adjustment catch (user feedback already shown by the mutation's `onError` toast) and `auth.store.ts`'s `initializeAuth()` catch — matching the existing logging pattern already used elsewhere in `auth.store.ts` | PR #364 | — | 0.23h | Vitest 45/45 passing (unchanged before/after), ESLint + TypeScript clean; no behavior change so no new tests needed; commit already a single commit; PR ready, merge pending |
| ✅ | #317 | Removed the rethrow-only `catch` block (`typescript:S2737`) in `auth.store.ts`'s `refreshUser` — the block only did `throw err`, functionally identical to no catch at all, so it was removed outright rather than adding logging (no user-facing feedback path exists for this action yet) | PR #372 | — | 0.03h | Vitest 30/30 passing (unchanged before/after), ESLint + TypeScript clean; no behavior change so no new tests needed; commit already a single commit; PR ready, merge pending |
| ✅ | #320 | Associated the "Por pagina:" `<label>` in `data-grid.tsx` with its `<select>` via `useId()`/`htmlFor`/`id`, clearing `typescript:S6853` | PR #371 | — | 0.27h | Vitest 27/27 passing (1 new regression test via `getByLabelText`), ESLint + TypeScript clean; no behavior change beyond the a11y association; 0 review threads; commit already a single commit; PR ready, merge pending |
| ✅ | #319 | Simplified `form?: 'new' | string` to `form?: string` in the `EmployeesSearch` interface (`use-employees-search.ts`), clearing the redundant union member flagged by `typescript:S6571` — `string` already covers `'new'` and every consumer already read/wrote `form` as a plain string | PR #369 | — | 0.03h | Vitest 33/33 passing unmodified; ESLint + TypeScript clean; no behavior change so no new tests needed; 0 review threads; commit already a single commit; PR ready, merge pending |
| ⏳ | #305, #316, #318, #321 (4 remaining SonarCloud Issues) | Not started | — | — | — | — |
| ⏳ | #85 | Not started | — | — | — | — |
| 🚧 | #340 | Opportunistic work (§5.4) — `.claude/settings.json` un-ignored and versioned in `sushigo-c`; read-only permission allowlist added | — | — | — | Not scheduled into a round — see §5.4 |
| ✅ | #359 | GitHub Issue made the single source of truth for `/start-issue`/`/finish-pr` (no local `.md` created or edited during active work); `/finish-pr` now generates a verbatim archive snapshot under `doc/tasks/yyyy-mm/<issue-number>-slug.md` exactly once at finish time; started `doc/decisions.md` + `doc/decisions/td-NN-*.md` technical decisions log; resolved 5 pre-existing orphaned `doc/tasks/backlog/*.md` files (3 for already-closed issues, 1 never migrated to GitHub, 1 byte-identical duplicate) | PR #361 | — | 3.0h | Docs/tooling only, no application tests apply; ESLint/TypeScript/Pint not touched; 1 Copilot review thread resolved (`## 📊 Retrospective` timing clarified in `doc/conventions/tasks.md`); manual merge-conflict resolution against #355 (concurrent `finish-pr.md` auto-rebase feature) during `/rebase-main`; added to scope mid-sprint (§5.3). Branch `chore/359-unify-issue-tracking`, workspace `sushigo-a`. PR ready, merge pending |

This table should be expanded to one row per Issue as work starts — collapsed here at sprint creation time since nothing has begun.

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Tests passing | — | 100% | — | ⏳ |
| Coverage | — | maintain or improve | — | ⏳ |
| SonarCloud Issues (open) | 19 | 0 | — | ⏳ |
| Technical debt | — | — | — | ⏳ |
| Bugs fixed | 0 | 2 (#322, #325) | — | ⏳ |
| Security findings | 1 open (#323) | 0 new, 1 resolved | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

Not applicable — sprint just started, no results yet.

### 15.2 Planned vs. Actual

Not applicable — sprint just started, no results yet.

### 15.3 Known Limitations

Not applicable — sprint just started, no results yet.

## 16. Lessons Learned

Not applicable — sprint just started, no lessons yet. First candidate lesson to validate at closure: whether the 14-day/critical-path deadline in §4 held, and whether the SonarCloud Opt./Pess. T-shirt sizing (§12) was anywhere close to real Tracked time.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | — | Retrofit real Estimates onto #305–#323 per `doc/conventions/tasks.md` | Current values are rough sizing, not technically scoped | Sprint 001 (before each Issue's round starts) |
| ✅ | #342 | Unify dialog component and enter/exit transitions across the system | Discovered while implementing #327: 3 duplicated dialog animation implementations + 6 dialogs with no animation + a separate SlidePanel family; a scoped-to-Attendance version of the shared hook lands in #327's PR, full system migration is cross-cutting frontend work that doesn't fit Sprint 001's scope. Completed opportunistically same-sprint: promoted the shared `useDialogTransition` hook app-wide, migrated the 5 remaining duplicated-animation dialogs, animated the 6 previously-unanimated ones, and reconciled `BranchSelectionDialog`'s styling — 4h 41m tracked, PR #354 ready, merge pending | Next |
| ✅ | #337 | Add "En comida" stat tab for employees at lunch on Attendance Today | Deferred from #327/PR #336: `computeSummary()` lumped `checked-in`/`at-lunch`/`returned` into one "En trabajo" bucket with no way to see who's at lunch. Completed same-sprint as a mechanical extension of #327's bucket-split + clickable-tab pattern — 0.5h tracked, PR #350 ready, merge pending | Sprint 001 |

## 18. Sprint Closure Checklist

- [ ] All included work items have a final status marker.
- [ ] Completed items include Pull Request or commit evidence.
- [ ] Deprecated items identify their replacement.
- [ ] Cancelled items include a reason.
- [ ] Scope changes are recorded.
- [ ] Tracked time was synchronized from Issue sessions.
- [ ] Round totals and sprint totals were recalculated.
- [ ] Estimate variance was calculated.
- [ ] Consolidated effort was completed.
- [ ] Dependencies reflect actual execution.
- [ ] Conflict notes reflect actual execution.
- [ ] Tests and relevant quality metrics were recorded.
- [ ] Delivered value and known limitations were documented.
- [ ] Follow-up work was created or recorded.
- [ ] Lessons learned were captured.
- [ ] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created when applicable.
