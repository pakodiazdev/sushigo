# 🔨 Migrate the daily report employee table to the shared DataGrid component

## Description

Migrate the employee table in the "Reporte Operacional de Hoy" (daily report, route
`/attendance/reports/today`) from a hand-rolled `<table>` to the shared `DataGrid<T>` component at
`code/webapp/src/components/ui/data-grid.tsx`.

Current implementation:
- `code/webapp/src/pages/attendance/reports/employee-table-section.tsx:28-46` — raw HTML `<table>`,
  manually styled with Tailwind (`w-full text-sm`, `bg-muted/50`, borders, wrapped in
  `div.rounded-lg.border`)
- `code/webapp/src/pages/attendance/reports/employee-row.tsx:17-46` — row markup with an inline
  `hover:bg-muted/40 transition-colors` hover style
- No sorting, no pagination, no skeleton loading, no shared `Column<T>` definitions — every cell is
  hardcoded per-row

## Reason

`DataGrid<T>` already exists as the app's standard table component (used by `employees.tsx`,
`cash-register-list.tsx`, `stock-dashboard.tsx`, `attendance/config/holidays.tsx`, and several
others) with built-in sorting, pagination, skeleton loading, and responsive `hideBelow`
breakpoints, all wired to the app's semantic Tailwind tokens (`bg-muted/50`, `divide-border`,
`text-muted-foreground`, `bg-primary/10`). The daily-report employee table reimplements this from
scratch instead of consuming it. It happens to use similar semantic tokens today, so the visual
drift is currently small — but it duplicates logic `DataGrid` already provides (sorting, skeleton
states) and will keep diverging as `DataGrid` evolves. See also #383 for a
second, more visually divergent instance of the same problem.

## Objective

- `employee-table-section.tsx` renders through `DataGrid<T>` with a `Column<T>[]` definition
  instead of hand-written `<table>`/`<tr>`/`<td>` markup
- `employee-row.tsx` is removed or folded into the column cell renderers, as appropriate for the
  `DataGrid` API
- Existing sort/filter/loading behavior on this page (if any) is preserved or improved via
  `DataGrid`'s built-in sorting/skeleton support
- Any tests covering this page/component are updated to match the new markup

## 🔗 References

- `code/webapp/src/pages/attendance/reports/today.tsx`
- `code/webapp/src/pages/attendance/reports/employee-table-section.tsx`
- `code/webapp/src/pages/attendance/reports/employee-row.tsx`
- `code/webapp/src/components/ui/data-grid.tsx` (target shared component)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `2h36m`

### 📅 Sessions
```json
[
  { "date": "2026-08-05", "start": "21:25", "end": "23:39" },
  { "date": "2026-08-07", "start": "00:55", "end": "01:17" }
]
```

## 📊 Retrospective

**Tracked:** `2h36m` (session 1: `2h14m`, session 2: `22m`) against an estimate of **2h optimistic
/ 4h pessimistic** — landed close to optimistic, slightly over.

The core migration (rewriting `employee-table-section.tsx` against `DataGrid<T>`, deleting
`employee-row.tsx`, writing the Vitest suite) went smoothly and matched the optimistic estimate —
the existing `holidays.tsx`/`employees.tsx` usages of `DataGrid` gave a clear, directly-reusable
pattern to follow, so there was no real design ambiguity.

The overage came from two sources, both caught by verification rather than being free:
- Adopting `DataGrid`'s taller row padding silently pushed the first employee row below the fold
  in the existing Cypress specs — only caught by actually running the E2E suite against the
  migrated markup (and confirmed as a real regression, not a pre-existing flake, by running the
  same specs against the pre-migration code first). Fixed with `scrollIntoView()`, matching the
  pattern the specs already used for other below-the-fold rows.
- One Copilot round (switched `check_in_time` formatting to the centralized
  `formatTimeInFrontendTz()` resolver instead of a raw `toLocaleTimeString()` call) and one Devin
  round (made the `scrollIntoView()` fix consistent across all row assertions, not just the one
  that had actually failed) — both legitimate, low-risk fixes, not business-rule disputes.

Session 2 was short — closing out `finish-pr`'s housekeeping after CI cleared. A stuck `api-swagger`
GitHub Actions run (repo-wide runner/infra issue, unrelated to this PR's frontend-only diff)
briefly blocked the pipeline between the two sessions; it was resolved by closing and reopening the
PR to re-trigger the `pull_request`-scoped workflows against the same commit, not by any code
change.





