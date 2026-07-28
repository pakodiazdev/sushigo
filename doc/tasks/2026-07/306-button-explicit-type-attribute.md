# 306 - Fix SonarCloud maintainability issues in sushigo-webapp: missing button type attribute (project-wide)

**Type:** 🔨 Refactor / Quality gate
**Priority:** Medium
**Detected by:** SonarCloud (rule `typescript:S9011`)

---

## 📋 Description

SonarCloud flagged **52** occurrences of rule `typescript:S9011` ("Add an explicit `type` attribute to this button") in `sushigo-webapp`, severity MAJOR, category Maintainability. This is a project-wide (not just new-code) sweep — task [[266-button-type-attribute]] previously fixed 13 new-code occurrences on 2026-07-21, but the rule remains open project-wide across older code.

Without an explicit `type="button"`, a native `<button>` defaults to `type="submit"`, which can trigger unintended form submissions if it's ever nested inside a `<form>`.

None of the 18 affected files contain a `<form>` element, so every flagged button gets `type="button"` — no ambiguity about `type="submit"`.

---

## 🔍 Affected files

- `src/components/solicitudes/SolicitudesLayout.tsx` (1)
- `src/components/employees/schedule-dialog.tsx` (3)
- `src/components/devtools/ClockBadge.tsx` (4)
- `src/components/dev/DevDebugger.tsx` (11)
- `src/components/layout/Sidebar.tsx` (1)
- `src/components/employees/day-label.tsx` (2)
- `src/components/employees/override-list-dialog.tsx` (2)
- `src/components/employees/override-scope-dialog.tsx` (1)
- `src/components/employees/schedule-config-rows.tsx` (4)
- `src/components/employees/week-day-row.tsx` (1)
- `src/components/employees/weekly-calendar.tsx` (2)
- `src/components/ui/data-grid.tsx` (17)
- `src/components/auth/BranchSelectionDialog.tsx` (1)
- `src/components/auth/BranchSwitcher.tsx` (2)
- `src/components/ui/search-input.tsx` (1)
- `src/components/ui/toast.tsx` (1)
- `src/pages/stock-dashboard.tsx` (1)
- `src/components/ui/dropdown-menu.tsx` (2)

(Counts verified directly against current `main` at session start — SonarCloud's line numbers may drift from the issue body.)

---

## 🎯 Acceptance Criteria

- [x] All native `<button>` elements without an explicit `type` in the files above have `type="button"` added
- [x] SonarCloud shows 0 open `typescript:S9011` issues for sushigo-webapp (quality gate `new_code_smells = 0` confirmed on PR #346)
- [x] `npm run lint` and `npm run typecheck` pass
- [x] No behavior change

---

## 🔗 References

- GitHub issue: [#306](https://github.com/pakodiazdev/sushigo/issues/306)
- Related: [[266-button-type-attribute]] — prior new-code-only pass on the same rule

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1.5h` · **Tracked:** `1.4h`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "20:24", "end": "20:46" },
  { "date": "2026-07-27", "start": "23:29", "end": "23:30" },
  { "date": "2026-07-28", "start": "00:25", "end": "00:53" },
  { "date": "2026-07-28", "start": "00:58", "end": "01:03" },
  { "date": "2026-07-28", "start": "01:05", "end": "01:21" },
  { "date": "2026-07-28", "start": "14:10", "end": "14:20" }
]
```

## 📊 Retrospective
- **Actual total:** ~1.4h (22m + 1m + 28m + 5m + 16m + 10m)
- **vs optimistic (0.5h):** +0.9h
- **vs pessimistic (1.5h):** −0.1h

**Justification:** The mechanical fix itself (session 1, 22m) landed well under estimate, matching the original scope: `type="button"` added to 52 already-identified buttons across 18 files with no behavior change, verified with a per-file scripted sweep rather than trusting the issue body's line numbers. That alone would have closed the task under the optimistic estimate.

What blew the estimate was the PR's own SonarCloud quality gate, which the original scope didn't anticipate: the scripted fix for `data-grid.tsx` (17 occurrences across 4 near-duplicate responsive breakpoint blocks) tripped the gate's `new_duplicated_lines_density` and `new_coverage` conditions. The first `/sonar-review` pass (session 3, 28m) extracted shared helper functions to kill the duplication (11.5% → 0.0%, confirmed fixed) but chased a coverage-attribution theory across three separate restructurings — array-literal extraction, then moving JSX out of call arguments — that never moved `new_coverage` past 73.7%, exhausting that session's 3-iteration fix budget on a misdiagnosis (concluding it was a SonarCloud tooling artifact rather than a real gap).

A second `/sonar-review` pass (session 5, 16m) got it right: downloading the actual lcov artifact from the CI run showed the uncovered lines were arrow-function `onClick` handlers that were declared but genuinely never *invoked* — no test had ever clicked the pagination's First/Prev/Next/Last edge buttons (only numbered page buttons), and separately the schedule dialog's default "Configuración" tab handler was never exercised since nothing needs to click into the tab that's already active. Adding two targeted test assertions (clicking the edge buttons; clicking back to the default tab) took `new_coverage` straight to 100% on the first try once the real cause was identified.

Sessions 2 and 4 were `/rebase-main` (keeping the branch current against a fast-moving `main`) and a `/pr-comments` pass that found no open review threads — both fast, non-substantive overhead rather than scope growth. Session 6 is this `/finish-pr` closeout.
