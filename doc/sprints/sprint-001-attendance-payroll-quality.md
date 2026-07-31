---
sprint: "001"
title: Attendance, Payroll & Quality
status: Completed

created: 2026-07-25
started: 2026-07-26
completed: 2026-07-31
last_updated: 2026-07-31

base_branch: main
base_commit: 079a316
scope_issues: 27

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-000-introduction.md
next: sprint-002-platillos-catalog-platform-hardening.md
---

# Sprint 001 — Attendance, Payroll & Quality

> Close a real attendance-editing gap, tighten payroll-close integrity, and clear the highest-value frontend quality/security debt — all 26 currently open Issues, ordered by value and scheduled so multiple agents can work in parallel without touching the same file.

## 1. Executive Summary

This sprint absorbs every Issue open on `pakodiazdev/sushigo` at the time of planning (26 total): 4 hand-authored feature/bug Issues from this week (#325, #327, #328, #329), 2 older hand-authored Issues (#276, #324), 1 large deferred Issue (#85, mobile bootstrap), and 19 SonarCloud code-quality Issues (#305–#323).

The work was ordered by **value first, parallelism second**: Security and Reliability bugs go first, then user-requested attendance/payroll product features, then real-risk quality issues (accidental form submits, list-reorder rendering bugs, accessibility gaps), then pure maintainability cleanup, with the large deferred mobile bootstrap kept explicitly last despite having zero file conflicts with anything else.

A file-level conflict analysis (parsed directly from each SonarCloud Issue's "Affected locations," plus a code audit for the 7 hand-authored Issues) produced **6 execution rounds** — every Issue inside the same round shares zero files with every other Issue in that round, so a round's Issues can all be worked simultaneously, one agent per Issue, with no merge-conflict risk between them.

Expected outcome: a real attendance-correction capability shipped, payroll-close periods can no longer be closed early or as a partial week, the two highest-connected quality debt nodes (#305, #306) cleared, and the sprint's own estimate-vs-tracked comparison populated so future sprints can calibrate estimates against real data.

**Implementation complete as of 2026-07-30, formal closure completed 2026-07-31** (Sprint 002 was promoted the same day, #386, satisfying `doc/conventions/sprints.md` §4's completion trigger): 25 of 27 scoped Issues completed (92.6%) — every Issue except #276 and #85. Both were removed from Sprint 001's active scope on 2026-07-30 and deferred rather than completed (see §5.3) — WhatsApp real-provider integration (#276) isn't needed while the webapp's log-based OTP display covers password recovery pre-production, and the Flutter mobile bootstrap (#85) is postponed until the attendance functionality it would mirror is proven out in backend + web first. With those two removed, 100% of Sprint 001's real (non-deferred) scope shipped, 10 days ahead of the 2026-08-09 target deadline. All 19 SonarCloud Issues (#305–#323), all 4 hand-authored product Issues (#325, #327, #328, #329), the dev-tooling Issue (#324), and the mid-sprint addition (#359) merged. See §13 for full evidence and §15–§16 for delivered value and lessons learned.

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
| Completed | 2026-07-31 (implementation finished 2026-07-30; formal closure completed 2026-07-31 upon Sprint 002 promotion, #386) |
| Target completion (deadline) | 2026-08-09 |
| Calendar duration (planned) | 14 days |
| Calendar duration (actual) | 6 days (created → completed) |
| Active workdays | 5 (2026-07-26 through 2026-07-30 — PR merges recorded every day, several days across multiple parallel `sushigo-a`..`sushigo-e` workspaces) |
| Progress (Issues completed) | 25 / 27 (92.6%) as of 2026-07-30 — every scoped Issue except #276 and #85. **100% of active scope shipped as of 2026-07-30** — #276 and #85 removed from scope and deferred rather than left incomplete (§5.3); no other `sprint-1`-labeled Issue remains open besides the two deferred ones (verified via `gh issue list --label sprint-1 --state open`). Sprint formally closed 2026-07-31 upon Sprint 002's promotion (#386) |

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
| 2026-07-29 | ✅ | #359 | Added to sprint scope | Dual-tracking (`doc/tasks/backlog/*.md` + GitHub Issue) had already caused drift — 3 orphaned files for closed issues, 1 issue never migrated to GitHub. Makes the GitHub Issue the single source of truth while work is open, archives a verbatim snapshot only at `/finish-pr` time, and starts a technical decisions log (`doc/decisions.md`) |
| 2026-07-30 | ❌ | #276 | Removed from sprint scope, deferred (`deferred`, `priority: low` labels applied) | WhatsApp real-provider integration only matters for password-recovery OTPs reaching users in production. The webapp already surfaces the reset OTP via log, which is enough while there's no concrete production rollout plan — the real integration isn't needed yet, and the time is better spent on a more substantial improvement. Tracked via #374. |
| 2026-07-30 | ❌ | #85 | Removed from sprint scope, deferred (`deferred`, `priority: low` labels applied) | Flutter mobile bootstrap postponed until the attendance functionality it would mirror (Manager attendance operations) is proven out in backend + web first, so the mobile app isn't built against a still-moving target. Already the lowest-value tier in §6; removing it entirely rather than carrying it forward as unstarted Sprint 001 work. Tracked via #374. |

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
| **Medium** | #306, #309, #310, #320, #321, #324, #359 | Real functional/accessibility risk (accidental form submits, list-reorder rendering bugs, a11y gaps) or clear productivity value (#324 dev catalog, #359 fixes dual-tracking drift already causing orphaned task files), but lower urgency than the above |
| **Low** | #305, #307, #308, #311–#319 (remaining Maintainability code smells) | Pure code-quality cleanup, no user-facing behavior change |
| **Deferred** | #85, #276 | #85: Large (8–14h), separate Flutter repo, strategically deferred already — kept last on purpose despite having zero file conflicts with anything. #276: moved here 2026-07-30 and removed from scope — the log-based OTP display already covers its underlying need pre-production (see §5.3) |

### Ordering principle

> **Value first, parallelism second.**

Lower-value maintainability cleanups are interleaved into the same rounds as high-value work whenever they don't conflict on a file, so spare agent capacity is never idle. An Issue only lands later than its value would suggest when it genuinely collides (same file) with something higher-value already scheduled earlier.

## 7. Route A — Execution Rounds

### Round 1 — Critical + High value, plus zero-conflict filler (14 Issues)

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #323 | [Security] PRNGs should not be used in security contexts | Critical | 0.5h | 1h | 0.6h | PR #332 | Fixed — `Math.random()` → `crypto.randomUUID()`, plus guarded `generateToastId()` fallback for insecure contexts (Copilot review). Commits squashed to 1. Merged |
| ✅ | #322 | [Reliability] Mouse events should have corresponding keyboard events | Critical | 1h | 2h | 0.2h | PR #333 | Real a11y/interaction bug. Fixed, SonarCloud + Copilot review passed, merged |
| ✅ | #325 | Overlay del diálogo "Registrar entrada" no cubre toda la pantalla | High | 0.5h | 1.5h | 0.27h | PR #334 | Fixed — added `container="viewport"` to `ConfirmDialog` in `AttendanceTimeDialog`; portal-to-`document.body` test added, 2 Copilot review comments addressed. **Land before starting #328** — both touch `AttendanceTimeDialog.tsx`. Merged |
| ✅ | #329 | Auto-calculate current week for payroll close + Sunday 19:00 gate | High | 3h | 6h | 5.0h | PR #335 | Fixed — read-only current-week display, Sunday-19:00 close gate (frontend + backend), full-week validation, reusable `LabeledBadge` component, frontend sourced from the real Application Clock, periods-list redirect + roll-forward to next period. Fixed two real bugs found post-review: an out-of-order-close gap (`/pay-periods/next-unclosed` replaces a "latest period + 1" lookup) and a contradictory overdue banner while browsing the current week. SonarCloud quality gate clean (0 smells). 0 bugs in Devin review, 13/13 checks green. Merged |
| ✅ | #327 | Add "Ausentes" stat card, move absent employees out of main grid | High | 2h | 4h | 16.4h | PR #336 | Fixed — 5th "Ausentes" stat card + clickable filter tabs, smart default tab w/ URL persistence, justify-now flow with exit animations, shared `useDialogTransition` hook (full migration → #342). `/finish-pr`'s Devin/DeepWiki readiness gate caught and fixed 5 issues: a CI route-typing break, an exit-animation race, a Custom Hook Convention violation, and an empty-tab-at-end-of-day bug — 0 Bugs on final pass. Merged |
| ❌ | #276 | Integrate a real WhatsApp provider in WhatsAppService | Deferred | 2h | 4h | — | — | Removed from scope 2026-07-30, deferred — see §5.3. Not counted in the Round 1 total below |
| ✅ | #309 | [Maintainability] JSX list components should not use array indexes as key | Medium | 1h | 2h | 0.7h | PR #339 | Fixed 5 array-index keys (data-grid ellipsis, cash line items, product-wizard conversions/balances, dashboard stats); 2 Copilot review bugs fixed (non-functional state updaters causing possible desync under rapid clicks); Vitest coverage added for previously-untested remove-item flows (81.8% on touched files); ESLint + TypeScript clean; Merged. No `## ⏱️ Time` section on the live GitHub issue, but its archived record (`doc/tasks/2026-07/309-array-index-keys.md`) has real Sessions data (42m) — see §12 |
| ✅ | #321 | [Maintainability] Heading elements should have accessible content | Medium | 0.5h | 1h | 0.05h | PR #338 | Fixed — gave `CardTitle` heading (`card.tsx:31`) meaningful text content per Copilot review, clearing `typescript:S6850`. No `## ⏱️ Time` section on the live GitHub issue, but its archived record (`doc/tasks/2026-07/321-card-title-heading-content.md`) has real Sessions data (3m). Merged `2026-07-27` |
| ✅ | #314 | [Maintainability] Unused React typed props should be removed | Low (filler) | 1h | 2h | 0.03h | PR #343 | Fixed — removed unused `onClose` from `VariantDetailsProps` and `showText` from `LogoProps` (both dead, confirmed no call site read them). Vitest 7/7, ESLint + TypeScript clean, Devin/DeepWiki 0 bugs/0 flags, 12/12 checks. Merged |
| ✅ | #315 | [Maintainability] Functions should not be nested too deeply | Low (filler) | 0.5h | 1h | 0.25h | PR #344 | Fixed — extracted `addRole`/`removeRole` module-level functions to flatten the `ToggleSwitch onChange` handler (S2004); further split to avoid a boolean selector parameter after `/sonar-review` flagged the initial single-function fix as S2301. New Vitest test for role toggle, full suite (3531 tests) green, SonarCloud gate OK, 12/12 checks. Merged |
| ✅ | #316 | [Maintainability] Jump statements should not be redundant | Low (filler) | 0.5h | 1h | 0.05h | PR #345 | Fixed — removed the redundant `return` in `Layout.tsx`'s redirect effect (line 55), clearing `typescript:S3626`. No `## ⏱️ Time` section on the live GitHub issue, but its archived record (`doc/tasks/2026-07/316-redundant-jump-statement.md`) has real Sessions data (3m). Merged `2026-07-28` |
| ✅ | #317 | [Maintainability] "catch" clauses should do more than rethrow | Low (filler) | 0.5h | 1h | 0.03h | PR #372 | Fixed — removed the rethrow-only `catch` in `auth.store.ts`'s `refreshUser` (no behavior change), clearing `typescript:S2737`. 30 existing tests passing, ESLint/TypeScript clean. Merged |
| ✅ | #319 | [Maintainability] Type constituents of unions/intersections redundant | Low (filler) | 0.5h | 1h | 0.03h | PR #369 | Fixed — simplified `form?: 'new' | string` to `form?: string` in `EmployeesSearch`, clearing `typescript:S6571`. No behavior change (every consumer already treated `form` as a plain string), 33/33 existing tests passing unmodified, ESLint + TypeScript clean. Merged |
| ✅ | #359 | Unify issue/task tracking: GitHub Issue as single source, archive-on-close, technical decisions log | Medium | 2h | 4h | 3.0h | PR #361 | Fixed — retired `doc/tasks/backlog/`, started `doc/decisions.md` + TD-01, rewrote `/start-issue`/`/finish-pr` for the issue-first lifecycle, added #359 itself to Sprint 001 scope. 1 Copilot review thread resolved. Merged |
| ❌ | #85 | Mobile App — Project Bootstrap (Flutter) | Deferred | 8h | 14h | — | — | Removed from scope 2026-07-30, deferred — see §5.3. Not counted in the Round 1 total below |
|  |  | **Round 1 total (completed scope)** |  | **13.5h** | **27.5h** |  |  | Originally planned as **23.5h / 45.5h** across all 15 Round 1 Issues; recalculated after #276 (2h/4h) and #85 (8h/14h) were removed from scope on 2026-07-30 |

**If only 5 workspaces are available:** run #323, #322, #325, #329, #327 first — the entire Critical+High tier unblocked today. Cycle #309, #321, then filler, in as workspaces free up.

### Round 2 — 5 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #328 | Allow correcting an already-recorded attendance event | High | 4h | 7h | 6.1h | PR #347 | Fixed — pencil affordance on each recorded event, new `attendances.update` permission gating corrections on top of #83's `AttendancePolicy::edit`, check-out correction syncs (never duplicates) the overtime bank movement. `/sonar-review` + Devin/DeepWiki review found and fixed 3 real bugs post-implementation: decided-overtime guard checked the wrong model field, `CloseDayAction`'s batch path lost its idempotency safeguard, and correcting lunch-start left lunch tardiness stale. 13/13 checks, SonarCloud clean, all review threads resolved. Merged |
| ✅ | #306 | [Maintainability] `<button>` elements should have an explicit "type" attribute | Medium | 3h | 5h | 1.37h | PR #346 | Fixed — `type="button"` added to 52 native `<button>` elements across 18 files; `data-grid.tsx`'s 17 occurrences refactored into shared helper functions, clearing a SonarCloud new-code duplication flag the scripted fix tripped. SonarCloud gate OK (100% new coverage after 2 targeted tests closed a real coverage gap — untested pagination edge-buttons and the schedule dialog's default tab), Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 0 review threads. Commits squashed to 1. Merged |
| ✅ | #307 | [Maintainability] Number static methods preferred over global equivalents | Low (filler) | 2h | 3h | 0.05h | PR #362 | Fixed — replaced global `parseFloat`/`isNaN` with `Number.parseFloat`/`Number.isNaN` across 5 files (17 occurrences), clearing `typescript:S7773`; 2 tests added afterward to close a new-code coverage gap. No behavior change, all 69 existing tests passed unmodified. Merged (workspace `sushigo-a`) |
| ✅ | #312 | [Maintainability] React Context Provider values should have stable identities | Low (filler) | 1h | 2h | 0.27h | PR #348 | Fixed — wrapped `SidebarContext`/`ThemeContext`/`ToastContext` Provider values in `useMemo` and their inline handlers in `useCallback`, resolving all 3 `typescript:S6481` occurrences. Value-identity stability tests added to all three providers. Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 1 review thread (missing task Retrospective) resolved. Merged |
| ✅ | #318 | [Maintainability] Track uses of "TODO" tags | Low (filler) | 0.5h | 1h | 0.3h | PR #373 | Fixed — resolved the TODO by adding a `/cash/sessions/$sessionId` detail page (status, current balance, per-tender income/expense breakdown) reusing already-implemented backend endpoints and unused frontend hooks; wired the dashboard "Ver Detalles" button to navigate there. 3 Copilot review threads resolved (formatDate timezone bug, Cypress race condition, unstable React keys). Cypress spec verified against the live E2E stack, 13/13 checks green. Merged |
|  |  | **Round 2 total** |  | **10.5h** | **18h** | **—** |  |  |

### Round 3 — 3 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #310 | [Maintainability] Non-interactive DOM elements should not have an interactive handler | Medium | 1h | 2h | 3.7h | PR #366 | Fixed — added `handleDragKeyDown` keyboard equivalent for the two `DevDebugger.tsx` drag handles (arrow keys nudge position, Enter/Space reset to default), with `role="button"`/`tabIndex`/`aria-label` sized to match the full mouse-draggable area while excluding the sibling action buttons. 3 of the 4 flagged locations were already fixed by prior commits (#306, #311). Devin/DeepWiki found and fixed 2 real bugs post-implementation (mouse-drag area shrunk to the title text, keyboard focus region mismatched the mouse-draggable region) — final pass 0 bugs. `/sonar-review` cleared 2 new code smells (Cognitive Complexity via `DebuggerHeader` extraction, `role="button"` div → native `<button>`). 78 tests passing, ESLint/TypeScript clean, SonarCloud gate OK. Merged |
| ✅ | #320 | [Maintainability] Label elements should have a text label and an associated control | Medium | 0.5h | 1h | 0.27h | PR #371 | Fixed — associated the "Por pagina:" `<label>` in `data-grid.tsx` with its `<select>` via `useId()`/`htmlFor`/`id`, clearing `typescript:S6853`; regression test added via `getByLabelText`. 27/27 tests passing, ESLint/TypeScript clean, 0 review threads. Merged |
| ✅ | #313 | [Maintainability] Exceptions should not be ignored | Low (filler) | 1h | 2h | 0.23h | PR #364 | Fixed — added `console.error` logging to the 2 empty catch blocks (`create-adjustment-dialog.tsx`, `auth.store.ts`), matching the existing logging pattern already used elsewhere in `auth.store.ts`; clears both `typescript:S2486` occurrences. No behavior change, 45/45 existing tests passing, ESLint/TypeScript clean. Merged |
|  |  | **Round 3 total** |  | **2.5h** | **5h** | **—** |  |  |

### Round 4 — 2 Issues

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #324 | Add a dev-only Components catalog page | Medium | 3h | 6h | 2.2h | PR #352 | Fixed — new `/dev/components` route with a registry-driven catalog covering every `src/components/ui/` component, gated by a new `requireDev()` route guard and a dev-only sidebar entry. PR review fixed a discriminated-union `CatalogEntry` type, a wrong Toast `importPath`, and a SonarCloud read-only-props smell. 0 bugs, 7 review threads resolved. Merged |
| ✅ | #305 | [Maintainability] React props should be read-only | Low | 5h | 8h | ~4.0h | PR #367 | Fixed — marked 61 flagged prop types `Readonly<Props>` across the codebase, clearing `typescript:S6759`. Merged `2026-07-30`. Tracked derived directly from its one logged session (`20:00`–`00:01`, 4h 1m) — the Issue was closed without the mandatory `## 📊 Retrospective` section (see §12), so this figure isn't a `/finish-pr`-computed value |
|  |  | **Round 4 total** |  | **8h** | **14h** | **—** |  |  |

### Round 5 — 1 Issue

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #308 | [Maintainability] Ternary operators should not be nested | Low | 3h | 5h | 0.37h | PR #363 | Fixed — flattened 12 of the 14 flagged nested ternaries across 9 files (2, both in `confirm-dialog.tsx`, had already been resolved by the prior `useDialogTransition`/`animCls` refactor); no behavior change, full Vitest suite (3568 tests) green. Merged |
|  |  | **Round 5 total** |  | **3h** | **5h** | **—** |  |  |

### Round 6 — 1 Issue

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #311 | [Maintainability] Cognitive Complexity of functions should not be too high | Low | 1h | 2h | 0.2h | PR #349 | Merged |
|  |  | **Round 6 total** |  | **1h** | **2h** | **—** |  |  |

### Round rules

- Issues in the same round must not modify the same files unless explicitly coordinated.
- Round order represents the recommended default execution order, not a hard dependency, except where §8 identifies a real one.
- When agent capacity is limited, highest-value Issues start first; filler starts only once higher-value work is already assigned or blocked.

## 8. Route B — Sequential Dependencies

```text
#325 (Round 1, ~1h, ✅ done — PR #334 merged)  →  #328 (Round 2, ~4-7h, ✅ done — PR #347 merged)
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
| Round 1 | 13 (completed; #276, #85 removed from scope) | 13.5h | 27.5h | 26.55h | +13.05h | −0.95h |
| Round 2 | 5 | 10.5h | 18h | 8.06h | −2.44h | −9.94h |
| Round 3 | 3 | 2.5h | 5h | 4.22h | +1.72h | −0.78h |
| Round 4 | 2 | 8h | 14h | 6.22h | −1.78h | −7.78h |
| Round 5 | 1 | 3h | 5h | 0.37h | −2.63h | −4.63h |
| Round 6 | 1 | 1h | 2h | 0.22h | −0.78h | −1.78h |
| **Grand total** | **25** | **38.5h** | **71.5h** | **45.64h** | **+7.14h** | **−25.86h** |

Grand total reflects only the 25 Issues actually completed — #276 and #85 (10h/18h Opt./Pess. combined) were removed from scope on 2026-07-30 and are excluded, per the original planning totals of 48.5h/89.5h across all 27. Tracked totals were recomputed 2026-07-30 by summing every session in each Issue's `## 📅 Sessions` array directly (not by trusting the `Tracked` field text, which caught a bad value — see §12). Three Issues (#309, #316, #321) carry no `## ⏱️ Time` section on their live GitHub issue, but their archived records under `doc/tasks/2026-07/` (written by an earlier, pre-TD-01 `/finish-pr` flow that logged session data locally instead of on the issue itself) do have real Sessions data — 0.7h, 0.05h, and 0.05h respectively (0.8h combined) — included here rather than treated as `0`; #305 was closed without its `## 📊 Retrospective` section but its Sessions array was intact, so its 4.02h is a real computed figure. See "Wall-Clock Time & Parallelism" under §11 for how this 45.64h of summed labor mapped to actual calendar time.

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | ~6h (this sprint's own setup: research, issue creation/correction, conflict analysis, sprint-doc conversion) | — (not logged as Issue sessions, see note below) | — |
| Implementation | 38.5h–71.5h (completed scope, see §10) | 45.64h | +7.14h vs Opt. / −25.86h vs Pess. |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **44.5h–77.5h** (Planning + Implementation) | **45.64h** | **+1.14h vs Opt. (44.5h) / −31.86h vs Pess. (77.5h)** |

Code review/validation, documentation, and rework time are not broken out separately — each Issue's `Tracked` figure already lumps implementation together with its own review-response passes (Copilot/Devin/SonarCloud fixes), so there's no clean split without re-deriving it from individual session logs. Planning/scoping (~6h) and this closure pass's own documentation time were not logged as GitHub Issue sessions, so they contribute `0` to the Tracked total (45.64h is Implementation-only) — the Total row's Estimated column still includes the ~6h Planning estimate for comparability. That's why Total's `vs Opt.` variance (+1.14h) is so much smaller than Implementation's own `vs Opt.` variance (+7.14h): Tracked is missing the ~6h of real Planning effort that Estimated already counts, so the two columns aren't fully apples-to-apples on this row — noted here rather than silently producing a Total that looks more favorable than it is.

### Wall-Clock Time & Parallelism

See "Wall-clock time and parallelism" under [`doc/conventions/sprints.md` §7](../conventions/sprints.md) for definitions and computation rules. Computed 2026-07-30 directly from every Issue's `## 📅 Sessions` array (28 Issues had session data: all 25 of the completed scoped Issues — including #309, #316, #321, whose session data lives only in their archived `doc/tasks/2026-07/` records rather than on the live GitHub issue, see §12 — plus 3 opportunistic Issues — #340, #342, #337 — that aren't part of formal scope but consumed real time). #85 and #276 contribute nothing (never started). **This figure deliberately excludes #374** (this closure pass itself, §17) and #355 (no session data, see §12): #374's own Tracked time wasn't known until after this Person-hours/Wall-clock computation was made, and #374's Sessions are themselves the source of the "2026-07-30" closure-pass timestamps used throughout this section — including its own effort in the figure it produced would be circular. Do not recompute this total to fold #374 in; if a future closure pass needs a figure that includes it, recompute from scratch rather than adding 4.4h to this one, since #374's sessions likely overlap wall-clock blocks already counted above.

- **Person-hours:** 51.13h (sum of every logged session across all 28 Issues with data — scoped work + opportunistic work)
- **Wall-clock time:** 36.45h (union of all session intervals, overlaps merged — #309/#316/#321's sessions all fall inside blocks already counted below, so this figure is unchanged)
- **Parallelization factor:** 1.40× — on average, 1.40 sessions were open per wall-clock hour
- **Peak concurrency:** 5 simultaneous sessions, at 2026-07-28 19:46 (#311, #312, #324, #337, #342) — #309/#321's 2026-07-27 01:45 sessions peak at 3 concurrent (#309, #321, #327), below this figure, so it is unaffected

**This is the direct answer to "how much time did the sprint really take vs. how much labor went into it":** 51.13h of summed individual effort fit inside only 36.45h of actual calendar time — a ~15h saving from working several Issues at once across parallel `sushigo-a`..`sushigo-e` workspaces, not from the estimates being wrong (§10 already shows Tracked landing close to the planned Opt./Pess. range). This is the hard-numbers version of the observation in §16: all scoped implementation finished in 5 calendar days against a 14-day target (formal closure followed a day later, §4) mainly because of concurrency and extended-hours sessions, not because individual tasks were faster than estimated.

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-07-26 19:06 → 20:51 | 1.75h | #322, #323, #325, #327, #329 |
| 2026-07-26 20:59 → 2026-07-27 06:03 | 9.07h | #309, #321, #327, #329, #340 |
| 2026-07-27 10:14 → 10:35 | 0.35h | #329 |
| 2026-07-27 12:50 → 14:40 | 1.83h | #327 |
| 2026-07-27 15:20 → 19:37 | 4.28h | #327, #329 |
| 2026-07-27 20:22 → 2026-07-28 01:21 | 4.98h | #306, #314, #315, #316, #328 |
| 2026-07-28 14:10 → 15:55 | 1.75h | #306, #328 |
| 2026-07-28 19:34 → 21:22 | 1.80h | #311, #312, #324, #337, #342 |
| 2026-07-29 10:35 → 12:35 | 2.00h | #324, #342 |
| 2026-07-29 13:20 → 13:50 | 0.50h | #342 |
| 2026-07-29 15:30 → 18:30 | 3.00h | #342, #359 |
| 2026-07-29 18:55 → 19:25 | 0.50h | #359 |
| 2026-07-29 19:58 → 2026-07-30 00:01 | 4.05h | #305, #307, #308, #310, #313 |
| 2026-07-30 02:30 → 02:46 | 0.27h | #319, #320 |
| 2026-07-30 02:47 → 03:06 | 0.32h | #317, #318 |

Note the two densest blocks — 2026-07-27 20:22→2026-07-28 01:21 (#306, #314, #315, #328) and 2026-07-29 19:58→2026-07-30 00:01 (#305, #307, #308, #310, #313) — are both late-night/overnight sessions with 4–5 Issues active at once, consistent with the peak-concurrency finding above.

## 12. Notes on Estimate Confidence

- #325, #327, #328, #329, #276, #324, #85 Opt./Pess. values come from their own GitHub Issue bodies (`## ⏱️ Time` → Estimates).
- All SonarCloud Issue Opt./Pess. values are **rough T-shirt sizing from affected-file count**, not from the Issue body — those Issues carry no Time section today. Treat them as planning-only; update with real Estimates on each Issue once someone actually scopes it, and update the corresponding row above to match before that round starts.
- The sprint deadline (§4) is derived from the GitHub Project's existing 14-day iteration cadence, cross-checked against — not derived from — the raw estimate totals. See §4 for the calculation.
- **Sprint closure gaps found 2026-07-30:** #309, #321, and #316's live GitHub issues carry no `## ⏱️ Time` section — they predate TD-01 (#359), when `/finish-pr` recorded Time/Sessions data only in the local `doc/tasks/` archive, not on the issue itself. **An earlier commit in this same closure pass incorrectly treated that as "no data exists" and zeroed these three out of §10/§11/§13, additionally mischaracterizing #309's real `0.7h` figure as a fabricated/hand-typed value** — it is not: `doc/tasks/2026-07/309-array-index-keys.md` has two real logged sessions (`01:45`–`02:15`, `02:15`–`02:27`) summing to exactly `42m` = `0.7h`. A Devin/DeepWiki review pass on PR #375 caught this regression. Corrected 2026-07-30: #309 (0.7h), #316 (0.05h, `doc/tasks/2026-07/316-redundant-jump-statement.md`), #321 (0.05h, `doc/tasks/2026-07/321-card-title-heading-content.md`) are restored into §10 (Round 1 total, Grand total), §11 (Person-hours, wall-clock blocks), and §13. Follow-up to sync this data back onto the live issues recorded in §17. #305 was merged (PR #367) without its Issue ever receiving the mandatory `/finish-pr` `## 📊 Retrospective` section (its body still ends at the `Sessions` block) — its 4.02h Tracked figure is real (derived directly from its one logged session, `20:00`–`00:01`), just not accompanied by the mandatory narrative. Follow-up recorded in §17.
- **#355 carries no Estimates or Sessions anywhere**, live issue or archive — genuinely different from #309/#316/#321's case above: it postdates the Time Tracking convention but was implemented directly without going through `/start-issue`'s session-tracking flow, so its own Issue body states Estimates/Sessions "could not be honestly reconstructed" after the fact, and no archived record exists to recover them from either. Its §13 row correctly shows `—` for Tracked; unlike #309/#316/#321 this data is not retrofittable (no session log ever existed anywhere) rather than merely not-yet-synced. Noted in §15.3/§17.
- All Tracked/session figures in §10, §11, and §13 were recomputed 2026-07-30 by summing each Issue's raw `## 📅 Sessions` JSON directly, rather than trusting the `Tracked:` text field — this is what caught the #309 discrepancy above. Most other Issues agreed with their Issue-body `Tracked:` text within rounding (≤0.05h); **#306 did not** — its row showed a stale `1.9h` (inherited from before this closure pass, never cross-checked) against a real session-derived total of `1.37h`. Corrected 2026-07-30, after a Devin/DeepWiki review pass on PR #375 caught the resulting mismatch between Round 2's per-row Tracked cells and its declared total. §10's round/grand totals were already computed from the correct `1.37h` throughout — only the visible row needed fixing, nothing downstream (§11, §15.2, §16, README) required a recompute.
- Round/Grand totals in §10 are computed from each Issue's full-precision Tracked value (2 decimals, e.g. `4.97h`), while individual row cells in the Round tables (§7) and Execution Evidence (§13) are sometimes shown at coarser precision (e.g. `5.0h`) for readability. Summing the visibly-displayed cells in a round can therefore differ from that round's stated total by a few hundredths of an hour — the stated totals are the correct ones; the display rounding is cosmetic.
- #276 and #85's Opt./Pess. values (2h/4h and 8h/14h) are excluded from the §10/§11 completed-scope totals — they were removed from Sprint 001's scope on 2026-07-30, not completed. The original totals including them were 48.5h/89.5h across 27 Issues (see the Grand total note in §10).

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #323 | `Math.random()` → `crypto.randomUUID()` in `toast-provider.tsx`, guarded `generateToastId()` fallback (Date.now() + counter, no `Math.random()`) for insecure contexts/older browsers per Copilot review | PR #332 | 9560062 | 0.6h | ESLint + TypeScript pass, 0 errors; no Vitest/Cypress needed (internal id-gen, no behavior change); commits squashed to 1; Merged |
| ✅ | #322 | Backdrop `<div onClick>` → native `<button>` in confirm-dialog.tsx, BranchSwitcher.tsx, Sidebar.tsx (reused `dialog-frame.tsx` idiom) | PR #333 | 621868b | 0.2h | SonarCloud + Copilot review passed; existing Vitest suites (60 tests) pass unmodified; merged |
| ✅ | #325 | Added `container="viewport"` to `ConfirmDialog` in `AttendanceTimeDialog`, fixing the overlay for all 4 attendance dialogs (check-in, lunch-start, lunch-return, check-out); added a portal-assertion test | PR #334 | 5ccc6f4 | 0.27h | Vitest 17/17 passing, ESLint + TypeScript clean, 2 Copilot review comments addressed and resolved; manual in-browser verification of the 4 flows still pending (no browser automation available); Merged |
| ✅ | #329 | Auto-calculated current-week display + Sunday-19:00 close gate (frontend + backend, full-week validation), reusable `LabeledBadge` component, frontend sourced from the real Application Clock, periods-list redirect + roll-forward to next period after a close, new `/pay-periods/next-unclosed` endpoint fixing an out-of-order-close gap-hiding bug, and a fix for a contradictory overdue banner while browsing the current week | PR #335 | 0cc45b0 | 5.0h | PHPUnit 737 passing (incl. 6 for the new endpoint), Vitest full suite passing (incl. 2 new tests for the banner fix), Cypress 11/11 (payroll-close-preview + payroll-close-confirm, incl. the skipped-week regression and the banner-vs-button contradiction check) against dev-lab E2E stack; Pint/ESLint/TypeScript clean; 3 Copilot review threads resolved (1 code fix, 2 justified); SonarCloud quality gate clean (2 new-code smells fixed via `/sonar-review`); Devin/DeepWiki: 0 bugs, 13/13 checks; commits squashed to 1; Merged |
| ✅ | #327 | Added a 5th "Ausentes" stat card, made every stat card a clickable filter tab with a smart default tab + URL persistence, a justify-now prompt with pin/exit-animation flow for "Marcar falta", and extracted a shared `useDialogTransition` hook (full system-wide migration deferred to #342) | PR #336 | 76e3a12 | 16.4h | Vitest 3479+/3479+ passing, PHPUnit 1384 passing, Cypress 46 specs/151 tests (6 pre-existing/unrelated failures verified against a clean baseline); ESLint + TypeScript clean; `/finish-pr`'s Devin/DeepWiki readiness gate found and fixed 5 issues across two passes (a `webapp-lint` CI route-typing break, an exit-animation-skip bug, a race between that fix and the mark-falta mutation's refetch, a Custom Hook Convention violation, and `resolveDefaultFilter` landing on an empty tab at end-of-day) — final pass: 0 Bugs, 0 unresolved flags; Merged |
| ✅ | #328 | Added a pencil affordance to each already-recorded attendance event (check-in, lunch-start, lunch-return, check-out) reusing the existing time dialog; a new `attendances.update` permission (covered by the existing `attendances.%` wildcard) gates corrections on top of #83's date-based `AttendancePolicy::edit`; check-out correction recalculates overtime and syncs (never duplicates) the auto `OvertimeBankMovement`, rejecting with 422 once that overtime was already decided | PR #347 | c0c32f4 | 6.1h | PHPUnit 744/744 passing (incl. new regression tests for the decided-overtime guard, the batch day-close idempotency fix, and the lunch-tardiness recalculation), Vitest 3540/3540, Cypress 4 new + 19 existing attendance specs green against the dev-lab E2E stack; Pint/ESLint/TypeScript clean; SonarCloud quality gate clean across 2 review passes (4 code smells fixed: multi-return method, oversized seeder method, 2x cognitive-complexity); 3 Copilot review threads resolved; Devin/DeepWiki found and fixed 3 real bugs post-implementation (decided-overtime guard read the wrong model field, `CloseDayAction`'s batch path lost its correction-permission-equivalent idempotency guard, lunch-start correction left lunch tardiness stale); commits squashed to 1; Merged |
| ❌ | #276 | Removed from Sprint 001 scope, deferred | — | — | — | See §5.3 — log-based OTP display already covers password recovery pre-production; labeled `deferred`/`priority: low`; rationale comment posted; tracked via #374 |
| ✅ | #324 | New `/dev/components` catalog route documenting every `src/components/ui/` component with a live usage example, description, and import path, gated by a `requireDev()` route guard and a dev-only sidebar entry; registry-driven so a new component is a one-entry diff | PR #352 | ada437e | 2.2h | Vitest 3551/3551 passing (48 new for the guard, sidebar entry, and registry), Cypress 3/3 (sidebar visibility, navigation, interactive `ToggleSwitch` example); ESLint + TypeScript clean; 7 Copilot review threads resolved (discriminated-union `CatalogEntry` type, wrong Toast `importPath`, `vi.unstubAllEnvs()` cleanup) plus a SonarCloud read-only-props fix; commits squashed to 1; Merged |
| ✅ | #309 | Fixed 5 array-index keys (data-grid ellipsis, cash line items, product-wizard conversions/balances, dashboard stats) with stable identifiers (`crypto.randomUUID()`-backed parallel key arrays where the item objects post directly to the API, `pages[i-1]`/`stat.title` where a natural stable value existed) | PR #339 | 2fc1169 | 0.7h | ESLint + TypeScript clean, Vitest 47/47 passing; 2 Copilot review comments fixed (non-functional `setState` updaters in `handleAddLine`/`handleRemoveLine` and stale-closure `uom_id` read in `addOpeningBalance` — both could desync state under rapid clicks); added coverage for previously-untested remove-item flows, raising touched-file line coverage 75.4% → 81.8%; Merged. No `## ⏱️ Time` section on the live GitHub issue; its `0.7h` Tracked value is real, from its archived record's two logged sessions (`doc/tasks/2026-07/309-array-index-keys.md`, 42m) — a Devin/DeepWiki review pass on PR #375 caught this row wrongly zeroed and this value wrongly branded fabricated by an earlier commit, corrected 2026-07-30 (see §12) |
| ✅ | #314 | Removed unused `onClose` from `VariantDetailsProps` (`variant-details.tsx`, dead — the owning `SlidePanel` already handles closing) and `showText` from `LogoProps` (`logo.tsx`, no call site anywhere passed it); dropped the now-invalid call-site prop and unused test mock | PR #343 | 2e929b5 | 0.03h | Vitest 7/7 passing, ESLint + TypeScript clean; Devin/DeepWiki: 0 bugs, 0 flags, 12/12 checks; 0 review threads; commit already a single commit; Merged |
| ✅ | #315 | Flattened the deeply nested `ToggleSwitch onChange` role-toggle handler in `employee-edit-create-form.tsx` into module-level `addRole`/`removeRole` functions, fixing SonarCloud S2004; further split to avoid a boolean selector parameter after `/sonar-review` flagged the initial fix as S2301 | PR #344 | 9389363 | 0.25h | Vitest 3/3 passing on the new role-toggle test, full suite (3531 tests) green, ESLint + TypeScript clean; SonarCloud quality gate OK (0 new code smells); 0 review threads; Devin/DeepWiki 0 bugs, 3 Informational-only flags; 12/12 checks; commit squashed to 1; Merged |
| ✅ | #306 | `type="button"` added to 52 native `<button>` elements across 18 files (rule `typescript:S9011`); `data-grid.tsx`'s 17 occurrences (4 near-duplicate responsive pagination blocks) refactored into shared helper functions (`renderEdgeButton`, `renderLeadingEdges`, `renderTrailingEdges`, `renderPaginationNav`) rather than a flat scripted insert, since the flat fix tripped the PR's own SonarCloud duplication gate | PR #346 | 74dc90c | 1.37h | ESLint + TypeScript clean; SonarCloud gate OK — 0 new bugs/vulnerabilities/smells, 0.0% new duplication (was 11.5%), 100% new coverage (was 73.7% after a mis-diagnosed first attempt; the real cause, found by inspecting the raw CI lcov artifact, was two arrow-function `onClick` handlers genuinely never invoked by any test — the pagination edge-nav buttons and the schedule dialog's default tab — closed with 2 targeted test assertions); Devin/DeepWiki 0 bugs/0 flags, 12/12 checks, 0 review threads; commits squashed to 1; Merged |
| ✅ | #311 | Reduced cognitive complexity (`typescript:S3776`) in 3 flagged functions via structural extraction: `handleNext` split into `advanceFromStep1/2/3` (product-wizard.tsx), `StockInfoPanel`/`ProfitAnalysisPanel` extracted from nested-ternary JSX (stock-out-form.tsx), `MinimizedDebugger`/`RolesPermissionsSection`/`DevLoginSection` extracted from the render body (DevDebugger.tsx) | PR #349 | 0921bdd | 0.2h | Vitest 3550/3550 passing (7 new tests added via `/sonar-review` after the extraction dropped new-code coverage to 50.8%, closing it to 94.7% — also found and fixed a latent test-mock bug causing an infinite-render worker OOM); ESLint + TypeScript clean; SonarCloud gate OK (0 new bugs/vulnerabilities/smells, 0% duplication); Devin/DeepWiki 0 bugs, 2 Informational-only flags, 12/12 checks; 0 review threads; commit squashed to 1; Merged |
| ✅ | #312 | Wrapped `SidebarContext`/`ThemeContext`/`ToastContext` Provider `value` in `useMemo` (and their inline toggle handlers in `useCallback`), resolving all 3 `typescript:S6481` occurrences | PR #348 | ef6e9e7 | 0.27h | Vitest 33/33 new/updated (value-identity stability tests added to all three providers), full suite 242 files/3546 passing; ESLint + TypeScript clean; Devin/DeepWiki 0 bugs/0 flags, 12/12 checks; 1 Copilot review thread (missing mandatory task Retrospective section) fixed and resolved; commits squashed to 1; Merged |
| ✅ | #308 | Flattened 12 of the 14 SonarCloud-flagged nested ternaries (`typescript:S3358`) across 9 files — `employee-detail-view.tsx`, `employee-edit-create-form.tsx`, `use-employee-form.ts` (x2), `use-employees-search.ts`, `data-grid.tsx`, `slide-panel.tsx` (x2), `Dashboard.tsx`, `product-wizard.tsx`, `stock-out-form.tsx` (x2) — using whichever flat form fit the call site: a precomputed variable/component, an if/else-computed render variable, a state-keyed lookup table, or a small named helper function; the other 2 flagged locations (both in `confirm-dialog.tsx`) had already been resolved by the prior `useDialogTransition`/`animCls` refactor | PR #363 | d8535d8 | 0.37h | ESLint + TypeScript clean; Vitest full suite 242 files/3568 tests passing (3 pre-existing skips), no behavior change so no new tests needed; 0 review threads; commit already a single commit; Merged |
| ✅ | #307 | Replaced global `parseFloat` with `Number.parseFloat` (5 files) and global `isNaN` with `Number.isNaN` (`cash-balance-service.ts`), clearing all 17 occurrences of `typescript:S7773`; 2 tests added afterward (register-wage-form onChange handlers, open-session-dialog negative-balance validation) to close a new-code coverage gap | PR #362 | 3f1e9dd | 0.05h | ESLint + TypeScript clean; Vitest 69/69 passing, identical to pre-change baseline; no Cypress needed (no behavior change); merged directly (2 commits, not squashed — housekeeping/`/finish-pr` backfilled later via #308's PR #363) |
| ✅ | #310 | Added `handleDragKeyDown` to `use-dev-debugger.ts` (arrow keys nudge the panel position 20px, Enter/Space reset to default, reusing the mouse-drag `setState` logic) and applied `role="button"`/`tabIndex`/`aria-label="Mover panel de depuración"` to both `DevDebugger.tsx` drag handles (floating panel header, minimized bubble), sized to the full mouse-draggable area while excluding the sibling action buttons; 3 of the 4 SonarCloud-flagged S6848 locations were already fixed by prior commits (#306, #311) | PR #366 | 2389461 | 3.7h | Vitest 78/78 passing (56 `use-dev-debugger` + 22 `DevDebugger`); ESLint + TypeScript clean; 1 Copilot review thread resolved; Devin/DeepWiki found and fixed 2 real bugs across 2 review passes (shrunk mouse-drag area, mismatched keyboard-focus region) — final pass 0 bugs; `/sonar-review` cleared 2 new code smells (S3776 Cognitive Complexity via `DebuggerHeader` extraction, S6819 `role="button"` div → native `<button>`) — SonarCloud gate OK, 0 new code smells; commit squashed to 1; Merged |
| ✅ | #313 | Added `console.error` logging to the 2 SonarCloud-flagged empty catch blocks (`typescript:S2486`) — `create-adjustment-dialog.tsx`'s create-adjustment catch (user feedback already shown by the mutation's `onError` toast) and `auth.store.ts`'s `initializeAuth()` catch — matching the existing logging pattern already used elsewhere in `auth.store.ts` | PR #364 | ac5db39 | 0.23h | Vitest 45/45 passing (unchanged before/after), ESLint + TypeScript clean; no behavior change so no new tests needed; commit already a single commit; Merged |
| ✅ | #317 | Removed the rethrow-only `catch` block (`typescript:S2737`) in `auth.store.ts`'s `refreshUser` — the block only did `throw err`, functionally identical to no catch at all, so it was removed outright rather than adding logging (no user-facing feedback path exists for this action yet) | PR #372 | ea7fa7f | 0.03h | Vitest 30/30 passing (unchanged before/after), ESLint + TypeScript clean; no behavior change so no new tests needed; commit already a single commit; Merged |
| ✅ | #320 | Associated the "Por pagina:" `<label>` in `data-grid.tsx` with its `<select>` via `useId()`/`htmlFor`/`id`, clearing `typescript:S6853` | PR #371 | 087d1f1 | 0.27h | Vitest 27/27 passing (1 new regression test via `getByLabelText`), ESLint + TypeScript clean; no behavior change beyond the a11y association; 0 review threads; commit already a single commit; Merged |
| ✅ | #319 | Simplified `form?: 'new' | string` to `form?: string` in the `EmployeesSearch` interface (`use-employees-search.ts`), clearing the redundant union member flagged by `typescript:S6571` — `string` already covers `'new'` and every consumer already read/wrote `form` as a plain string | PR #369 | 74b6815 | 0.03h | Vitest 33/33 passing unmodified; ESLint + TypeScript clean; no behavior change so no new tests needed; 0 review threads; commit already a single commit; Merged |
| ✅ | #318 | Added a `/cash/sessions/$sessionId` detail page (status badge, current balance, per-tender income/expense breakdown) reusing the already-implemented `ShowCashSessionController`/`GetSessionSummaryController` backend endpoints and previously-unused `useCashSession`/`useCashSessionSummary` frontend hooks; wired the dashboard "Ver Detalles" button to navigate there, resolving `typescript:S1135` | PR #373 | fd059d4 | 0.3h | Vitest 8 new tests (5 hook + 3 dashboard), full suite 244 files/3591 tests passing; Cypress `cash-session-detail.cy.ts` 2/2 verified against the live sushigo-d E2E stack; ESLint + TypeScript + Pint clean; 3 Copilot review threads resolved via `/pr-comments` (a `formatDate()` timezone bug shifting date-only strings under negative UTC offsets, a Cypress race waiting only on the summary request, and unstable array-index React keys); 13/13 checks green; commit squashed to 1; Merged |
| ✅ | #305 | Marked 61 flagged prop types `Readonly<Props>` across the codebase, clearing `typescript:S6759` | PR #367 | 6b95de7 | ~4.0h | Merged `2026-07-30`; Tracked derived from its single logged session — Issue closed without a `## 📊 Retrospective` section, see §12 |
| ✅ | #316 | Removed the redundant `return` in `Layout.tsx`'s redirect effect (line 55), clearing `typescript:S3626` | PR #345 | e26e333 | 0.05h | Merged `2026-07-28`; no `## ⏱️ Time` section on the live GitHub issue, but its archived record (`doc/tasks/2026-07/316-redundant-jump-statement.md`) has a real logged session (3m) |
| ✅ | #321 | Gave the `CardTitle` heading (`card.tsx:31`) meaningful text content, clearing `typescript:S6850` | PR #338 | 67c2845 | 0.05h | Merged `2026-07-27`; no `## ⏱️ Time` section on the live GitHub issue, but its archived record (`doc/tasks/2026-07/321-card-title-heading-content.md`) has a real logged session (3m) |
| ❌ | #85 | Removed from Sprint 001 scope, deferred | — | — | — | See §5.3 — postponed until backend + web attendance functionality is proven out first; labeled `deferred`/`priority: low`; rationale comment posted; tracked via #374 |
| ✅ | #340 | Opportunistic work (§5.4) — `.claude/settings.json` un-ignored and versioned in `sushigo-c`; read-only Bash/gh permission allowlist added, reducing repeated permission prompts across parallel workspaces | PR #341 | dd08dd8 | 0.32h | Not scheduled into a round — see §5.4. Merged `2026-07-27` |
| ✅ | #355 | Opportunistic work (§5.4) — `/finish-pr` Phase 1b and 7.6c now auto-run `/rebase-main` when the branch is BEHIND main instead of stopping, falling back to the existing conflict-abort behavior if the rebase doesn't apply cleanly | PR #356 | 1d912f7 | — | Not scheduled into a round — see §5.4. Merged `2026-07-30` |
| ✅ | #342 | Follow-up work (§17) discovered while implementing #327 — promoted the shared `useDialogTransition` hook app-wide, migrated the 5 remaining duplicated-animation dialogs, animated the 6 previously-unanimated ones, reconciled `BranchSelectionDialog` styling | PR #354 | 02531c4 | 4.68h | Not part of original scope — see §17. Merged `2026-07-30` |
| ✅ | #337 | Follow-up work (§17) deferred from #327/PR #336 — added an "En comida" stat tab for employees at lunch, mechanical extension of #327's bucket-split + clickable-tab pattern | PR #350 | 73f05e6 | 0.5h | Not part of original scope — see §17. Merged `2026-07-29` |
| ✅ | #359 | GitHub Issue made the single source of truth for `/start-issue`/`/finish-pr` (no local `.md` created or edited during active work); `/finish-pr` now generates a verbatim archive snapshot under `doc/tasks/yyyy-mm/<issue-number>-slug.md` exactly once at finish time; started `doc/decisions.md` + `doc/decisions/td-NN-*.md` technical decisions log; resolved 5 pre-existing orphaned `doc/tasks/backlog/*.md` files (3 for already-closed issues, 1 never migrated to GitHub, 1 byte-identical duplicate) | PR #361 | 0dc2d54 | 3.0h | Docs/tooling only, no application tests apply; ESLint/TypeScript/Pint not touched; 1 Copilot review thread resolved (`## 📊 Retrospective` timing clarified in `doc/conventions/tasks.md`); manual merge-conflict resolution against #355 (concurrent `finish-pr.md` auto-rebase feature) during `/rebase-main`; added to scope mid-sprint (§5.3). Branch `chore/359-unify-issue-tracking`, workspace `sushigo-a`. Merged `2026-07-30` |
| ✅ | #374 | Follow-up work (§17) — this closure pass itself: deferred #276/#85 from Sprint 001 scope (`deferred`/`priority: low` labels + rationale comments), fixed 5 stale status markers (#305/#316/#319/#320/#321), formalized and computed the wall-clock/parallelism metric (§7 of `doc/conventions/sprints.md`), and corrected several data-integrity gaps found along the way (stale #306 Tracked value, fabricated #309 Tracked value, missing #340 Tracked value, Consolidated Time Tracking Total arithmetic, ambiguous Person-hours definition) | PR #375 | `4ac51ff` | 4.4h | docs/-only change — no PHPUnit/Vitest/Cypress applicable; every Issue referenced in the rewrite cross-checked against `gh issue view`/`gh pr list` state before writing it into the document; 2 review threads resolved; commit squashed to 1; Not scheduled into a round — see §17. Merged 2026-07-31 |

All scoped work finished 2026-07-30 — all rows above reflect final status; no items remain in `⏳`/`🚧`. Sprint formally closed 2026-07-31 upon Sprint 002's promotion (#386, see front matter).

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Tests passing | — | 100% | 100% — every merged PR's CI gate (PHPUnit/Vitest/Cypress) passed before merge | ✅ |
| Coverage | — | maintain or improve | Maintained or improved on every touched file — SonarCloud's ≥80% new-code coverage gate is a hard merge requirement (CLAUDE.md) | ✅ |
| SonarCloud Issues (open) | 19 (#305–#323) | 0 | 0 — all 19 merged | ✅ |
| Technical debt | 3 duplicated dialog-animation implementations + 6 unanimated dialogs (#342); dual issue-tracking drift, 5 orphaned task files (#359) | — | Cleared opportunistically same-sprint via #342 and #359 | ✅ |
| Bugs fixed | 0 | 2 (#322, #325) | 2 targeted (#322, #325) + at least 12 additional real bugs found and fixed during PR review passes (Devin/DeepWiki, Copilot, `/sonar-review`) across #327 (5), #328 (3), #310 (2), #329 (2) | ✅ (exceeded target) |
| Security findings | 1 open (#323) | 0 new, 1 resolved | 0 new, 1 resolved (`Math.random()` → `crypto.randomUUID()`) | ✅ |

## 15. Results

### 15.1 Delivered Value

- **Attendance correction capability** (#328): managers can now correct an already-recorded check-in/lunch-start/lunch-return/check-out, with permission gating and overtime-safe recalculation — previously no endpoint allowed this at all.
- **Payroll-close integrity** (#329): periods can no longer be closed early, out of order, or as a partial week; a real Sunday-19:00 gate replaced an honor-system workflow.
- **Attendance Today UX** (#327, #337, #325): a 5th "Ausentes" stat card, clickable filter tabs, a justify-now flow, an "En comida" tab, and a fixed dialog overlay bug.
- **Full quality/security debt clearance**: all 19 SonarCloud Issues (#305–#323) merged — including the two most-connected nodes in the conflict graph (#305, 61 files; #306, 18 files) — plus a real security fix (`Math.random()` → `crypto.randomUUID()`, #323) and an a11y/reliability bug (#322).
- **System-wide dialog/animation unification** (#342, opportunistic): the shared `useDialogTransition` hook, first built scoped-to-Attendance in #327, was promoted app-wide the same sprint, resolving 3 duplicated implementations and animating 6 previously-static dialogs.
- **Process improvements**: GitHub Issues became the single source of truth for task tracking (#359, resolving 5 orphaned files), permission-prompt friction was reduced via a versioned allowlist (#340), and `/finish-pr` now auto-rebases instead of stopping when a branch falls behind main (#355).
- **Dev tooling**: a registry-driven `/dev/components` catalog page (#324) and a cash-session detail page (#318).

**Not delivered — deliberately deferred:** #276 (WhatsApp real-provider integration) and #85 (Flutter mobile bootstrap) were removed from scope on 2026-07-30. Neither had started; see §5.3 for the reasoning and §17 for their follow-up tracking.

### 15.2 Planned vs. Actual

- **Scope:** 27 Issues planned; 25 completed (92.6%); 2 removed from scope and deferred (#276, #85) rather than left incomplete. 4 additional Issues (#340, #355, #342, #337) were delivered opportunistically, beyond the original 27.
- **Schedule:** target deadline was 2026-08-09 (14 calendar days from creation); all scoped implementation finished 2026-07-30 (5 calendar days from creation, 10 days ahead of the target), with formal closure following 2026-07-31 (6 calendar days from creation) once Sprint 002 was promoted (§4, #386).
- **Effort:** completed-scope estimates were 38.5h (Optimistic) to 71.5h (Pessimistic); tracked time totaled 45.64h — 36.2% under the pessimistic estimate, close to the low end of the original range. Across all Issues with logged sessions (scoped + opportunistic), summed effort was 51.13h against 36.45h of actual wall-clock time — a 1.40× parallelization factor (§11). See §16 for why the calendar time was so much shorter than the 14-day window despite tracked effort landing inside the expected range.
- **Deviations from the planned route:** the file-conflict-driven round order (§7) held with no rework — #325 landed before #328 as planned (§8), and the #305/#306 dependency chain resolved in the planned sequence. The only scope deviation was #359 (added mid-sprint, §5.3) and the two removals (#276, #85) at closure.

### 15.3 Known Limitations

- **#276 remains open and deferred**: password-recovery OTPs are still delivered via log only, not a real WhatsApp provider. Acceptable while there's no production rollout plan; revisit before one exists.
- **#85 remains open and deferred**: no Flutter mobile app work has started. Blocked, by design, until the attendance functionality it would mirror is proven out in backend + web.
- **#305's Issue is missing its mandatory `## 📊 Retrospective` section** despite being merged (PR #367) — a documentation-process gap found during this closure pass, not a code issue. Tracked as follow-up in §17.
- **#309, #316, and #321's Time/Sessions data lives only in their archived `doc/tasks/2026-07/` records, not on the live GitHub issue** — they predate TD-01 (#359), when `/finish-pr` didn't yet write Time data back onto the issue itself. An earlier commit in this closure pass mistook the missing live-issue section for missing data entirely and zeroed these three out of §10/§11/§13 (also mischaracterizing #309's real `0.7h` as fabricated); a Devin/DeepWiki review pass on PR #375 caught the regression and it was corrected (see §12).
- **#355 also carries no Estimates or Sessions**, unretrofittably — it postdates the Time Tracking convention but was implemented directly without going through `/start-issue`'s session flow, so no session log exists to reconstruct (see §12).
- Planning/scoping, code-review, documentation, and rework time are not broken out separately from implementation in §11 — each Issue's `Tracked` figure already lumps review-response passes in with implementation.

## 16. Lessons Learned

- **Why all scoped implementation finished in 5 calendar days against a 14-day window (formal closure followed a day later, §4), despite tracked effort (45.64h) landing close to the planned range (38.5h–71.5h):** the 14-day deadline was sized for serial, single-agent, 8-hour-day work. The "Wall-Clock Time & Parallelism" data in §11 makes this precise instead of anecdotal: 51.13h of summed session effort (across all Issues with logged sessions, including opportunistic work) fit inside just 36.45h of actual elapsed calendar time — a 1.40× parallelization factor, peaking at 5 Issues with simultaneously open sessions (2026-07-28 19:46). Sessions also ran well outside a standard 8-hour workday — the two densest overlap blocks are both late-night/overnight (2026-07-27 20:22→2026-07-28 01:21 and 2026-07-29 19:58→2026-07-30 00:01). The estimate-vs-tracked comparison in §10/§11 was accurate; the calendar-time compression came from concurrency and extended hours, not from the estimates being wrong. Future sprint deadlines for this team's shape of work (multi-agent, non-standard hours) should be set from parallel-agent-day capacity — informed by a target parallelization factor, not just headcount — rather than a single-contributor 8-hour-day assumption. The current 14-day cadence (inherited from a prior GitHub Project iteration) is far more conservative than this team's actual throughput; §7 of `doc/conventions/sprints.md` now formalizes how to compute this metric so future sprints don't have to re-derive it from scratch at closure.
- Deferring #85 to the very end of Round 1 and ultimately removing it from scope entirely, without any rework or rescheduling elsewhere, confirms the original Value Ranking call (§6) was right — a large, zero-conflict, low-value Issue can sit at the bottom of the queue indefinitely without ever blocking higher-value work.
- The #305/#306 conflict-graph dependency chain (§8) correctly predicted that nearly every downstream SonarCloud Issue would need one of those two to land first — the round structure held with zero merge-conflict rework across all 6 rounds.
- Four Issues (#305's missing Retrospective; #309, #316, #321's Time data living only in the local archive instead of on the live issue) show that the `/finish-pr` Retrospective and Time Tracking conventions (adopted mid-sprint via #359 and #330/#331) don't yet have full backward coverage — worth a follow-up check on whether large or older Issues are systematically more likely to skip these steps. #309's case additionally shows the risk of treating "missing from the live issue" as "missing entirely" without checking the archive first — this closure pass initially made that exact mistake before a Devin/DeepWiki review pass caught it.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | — | Retrofit real Estimates onto #305–#323 per `doc/conventions/tasks.md` | Current values are rough sizing, not technically scoped. Not done before Sprint 001's implementation finished — carrying forward | Next |
| ✅ | #342 | Unify dialog component and enter/exit transitions across the system | Discovered while implementing #327: 3 duplicated dialog animation implementations + 6 dialogs with no animation + a separate SlidePanel family; a scoped-to-Attendance version of the shared hook lands in #327's PR, full system migration is cross-cutting frontend work that doesn't fit Sprint 001's scope. Completed opportunistically same-sprint: promoted the shared `useDialogTransition` hook app-wide, migrated the 5 remaining duplicated-animation dialogs, animated the 6 previously-unanimated ones, and reconciled `BranchSelectionDialog`'s styling — 4h 41m tracked, PR #354 merged | Sprint 001 |
| ✅ | #337 | Add "En comida" stat tab for employees at lunch on Attendance Today | Deferred from #327/PR #336: `computeSummary()` lumped `checked-in`/`at-lunch`/`returned` into one "En trabajo" bucket with no way to see who's at lunch. Completed same-sprint as a mechanical extension of #327's bucket-split + clickable-tab pattern — 0.5h tracked, PR #350 merged | Sprint 001 |
| ✅ | #374 | Defer #276 and #85, close out Sprint 001 documentation | This closure pass itself — labels/comments on #276 and #85, this document rewrite, and the wall-clock/parallelism metric formalized in `doc/conventions/sprints.md` §7. Tracked separately from Sprint 001's own scope since it's process/documentation work discovered at closure, not a product or quality-debt Issue — 4.4h tracked, PR #375 merged 2026-07-31 (`4ac51ff`) | N/A — housekeeping |
| ⏳ | — | Verify why #305's Issue never received its `/finish-pr` `## 📊 Retrospective` section despite merging (PR #367) — check whether this is an isolated miss or a gap in the automation for large affected-file-count SonarCloud Issues | Found during this sprint's closure pass (§12); the ~4.0h Tracked figure used in §10/§13 for #305 is derived from its raw session data, not a computed Retrospective | Next |
| ⏳ | — | Sync #309, #316, and #321's real Time/Sessions data from `doc/tasks/2026-07/` back onto their live GitHub issues (and any other pre-TD-01 Issue in the same state) | Their data already exists and is now correctly folded into §10/§11/§13, but it still lives only in the local archive — a future reader of the live issue alone would see no Time section and could repeat this closure pass's initial mistake of treating it as missing | Next |
| ⏳ | — | Enforce `/start-issue` session tracking on every implementation, opportunistic work included | #355 (§5.4, opportunistic) was implemented directly without opening a session — unlike #309/#316/#321, its missing Estimates/Sessions can't be retrofitted after the fact since no log ever existed (see §12); a process gap, not a documentation gap | Next |
| ⏳ | #276 | Integrate a real WhatsApp provider in WhatsAppService | Removed from Sprint 001 scope and deferred on 2026-07-30 (§5.3) — revisit once a concrete production rollout is scheduled; the log-based OTP display covers password recovery until then | Next |
| ⏳ | #85 | Mobile App — Project Bootstrap (Flutter) | Removed from Sprint 001 scope and deferred on 2026-07-30 (§5.3) — revisit once the attendance functionality it needs to mirror is proven out in backend + web first | Next |

## 18. Sprint Closure Checklist

- [x] All included work items have a final status marker.
- [x] Completed items include Pull Request or commit evidence.
- [x] Deprecated items identify their replacement. (N/A — no `⚠️ Deprecated` items in this sprint)
- [x] Cancelled items include a reason. (#276, #85 — see §5.3)
- [x] Scope changes are recorded.
- [x] Tracked time was synchronized from Issue sessions. (§10/§11/§13's Tracked figures are all derived directly from raw session data, incl. #309/#316/#321 recovered from their `doc/tasks/` archives. Two residual gaps are permanent — not fixable by re-running sync — and tracked as follow-up instead: #305 was merged without its `/finish-pr` Retrospective, and #316/#321's session data lives only in their archives, never written back to the live Issue; see §12, §15.3, §17)
- [x] Round totals and sprint totals were recalculated.
- [x] Estimate variance was calculated.
- [x] Consolidated effort was completed. (§11's Implementation row is fully computed from session data; Planning/Review/Documentation/Rework are intentionally left as `—` and explained inline — each Issue's `Tracked` figure already lumps review-response passes in with implementation, so there is no clean data source to split them without re-deriving from individual session logs. Documented as a permanent limitation, not a pending sync)
- [x] Wall-clock time, parallelization factor, and peak concurrency were computed (§7, §11).
- [x] Dependencies reflect actual execution.
- [x] Conflict notes reflect actual execution.
- [x] Tests and relevant quality metrics were recorded.
- [x] Delivered value and known limitations were documented.
- [x] Follow-up work was created or recorded.
- [x] Lessons learned were captured.
- [x] Metadata dates and status were updated.
- [x] The next sprint was promoted or created when applicable. (Sprint 002 — "Platillos Catalog & Platform Hardening" — created directly at `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` and promoted to current in #386; its `doc/sprints/planned/` draft was never committed to git, so no `git mv` history exists for it — the file simply appears as new in #386's diff, unlike the tracked move `doc/conventions/sprints.md` §2 describes. Promotion still unblocks this sprint's `status: Completed`.)
