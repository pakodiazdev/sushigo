# 🔨 Migrate Payroll Periods list/detail tables to the shared DataGrid component

## Description

Migrate the Payroll Periods list and detail tables from three separately hand-rolled
implementations to the shared `DataGrid<T>` component at
`code/webapp/src/components/ui/data-grid.tsx`.

Current implementation (three different styles across two pages):
- List page — `code/webapp/src/pages/attendance/payroll/index.tsx:115-153`: raw HTML `<table>`
  styled with a hardcoded gray/indigo palette (`border-gray-200`, `text-gray-500`,
  `divide-gray-100`, `text-indigo-600`) instead of the app's semantic tokens, plus manual prev/next
  pagination buttons built inline (lines 155-183) instead of a shared pager
- Detail page — `code/webapp/src/pages/attendance/payroll/$periodId.tsx:112-116`: doesn't use a
  table for the employee list at all; each employee renders as a collapsible `<div>` card
  (`EmployeePayRow`)
- `code/webapp/src/pages/attendance/payroll/-employee-pay-row.tsx:20-72,93-111`: a third distinct
  visual style — white cards (`bg-white`, `shadow-sm`, `rounded-lg border-gray-200`) with amounts
  colored via hardcoded `text-red-600`/`text-green-600`/`text-indigo-800`, with a nested `<table>`
  only for the expanded line-item breakdown

## Reason

`DataGrid<T>` is the app's standard table component (used by `employees.tsx`,
`cash-register-list.tsx`, `stock-dashboard.tsx`, `attendance/config/holidays.tsx`, and others),
wired to the app's semantic Tailwind tokens (`bg-muted/50`, `divide-border`,
`text-muted-foreground`, `bg-primary/10`) with built-in sorting, pagination, and skeleton loading.
Payroll Periods uses none of it — worse, its list and detail pages don't even agree with each
other (semantic-free gray/indigo table vs. white shadow cards), and neither matches the rest of
the app. This is the same underlying gap as #382 (daily report employee table), but more visually
divergent since it also reinvents pagination instead of just table markup.

## Objective

- The Payroll Periods list page (`index.tsx`) renders through `DataGrid<T>` with a `Column<T>[]`
  definition and uses `DataGrid`'s built-in pagination instead of the inline prev/next buttons
- The Payroll Period detail page's employee list uses `DataGrid<T>` (or, if the expand/collapse
  interaction for line-item breakdown genuinely can't map to `DataGrid`'s row model, at minimum
  restyle it to use the app's semantic tokens instead of hardcoded gray/indigo/red/green classes)
- `-employee-pay-row.tsx` no longer uses hardcoded color classes for amounts — swaps to the
  semantic tokens (`text-muted-foreground`, `bg-primary/10`, etc.) already used elsewhere
- Any tests covering these pages are updated to match the new markup

## 🔗 References

- Related: #382 (same DataGrid-migration gap, daily report employee table)
- `code/webapp/src/pages/attendance/payroll/index.tsx`
- `code/webapp/src/pages/attendance/payroll/$periodId.tsx`
- `code/webapp/src/pages/attendance/payroll/-employee-pay-row.tsx`
- `code/webapp/src/components/ui/data-grid.tsx` (target shared component)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `12h 5m`

### 📅 Sessions
```json
[
  { "date": "2026-08-03", "start": "22:57", "end": "23:59" },
  { "date": "2026-08-04", "start": "00:00", "end": "11:03" }
]
```

## 📊 Retrospective
- **Actual total:** 12h 5m (62m + 663m)
- **vs optimistic:** +9h 5m
- **vs pessimistic:** +6h 5m

**Justification:**
The implementation itself (migrating `index.tsx` to `DataGrid<T>`, restyling `-employee-pay-row.tsx`
to semantic tokens, writing 2 new Vitest component test files, and updating 4 Cypress specs) landed
comfortably inside the 3–6h estimate. The overrun is almost entirely autonomous end-to-end pipeline
overhead the estimate didn't anticipate: this issue was delivered via `/issue`, which runs the full
CI → Copilot review → squash → Devin/DeepWiki review → close-out loop unattended, including several
multi-minute waits (CI runs re-triggered after each push, a mandated ~10-minute poll window for a
possible new Copilot review after the squash, starting and stopping a full local E2E Docker stack to
run 6 Cypress specs / 20 tests against the new markup, and two full DeepWiki scan cycles). None of
that wall-clock time reflects rework or scope creep — one real Copilot comment (a test-selector
robustness issue) and one real Devin flag (a stale-code English-text fallback) were found and fixed,
each in a single round-trip.




