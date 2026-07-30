# 🔨 [Maintainability] Ternary operators should not be nested (typescript:S3358)

## Description

SonarCloud flagged **14** occurrences of rule `typescript:S3358` ("Ternary operators should not be nested") in `sushigo-webapp`, category Maintainability, severity MAJOR.

## Reason

Nested ternary expressions are hard to read at a glance and hide branching logic that a reviewer has to mentally unwind. SonarCloud blocks the quality gate on new/major issues like this, and leaving them in place accumulates maintainability debt across the frontend.

## Objective

Every flagged nested ternary is replaced with a flat, single-expression form (early return, if/else chain, or a small lookup/helper function) so the rule no longer fires, with no behavior change to the affected components/hooks:

- `src/components/employees/employee-detail-view.tsx:200`
- `src/components/employees/employee-edit-create-form.tsx:280`
- `src/components/employees/use-employee-form.ts:212`
- `src/components/employees/use-employee-form.ts:219`
- `src/components/ui/confirm-dialog.tsx:116`
- `src/components/ui/confirm-dialog.tsx:123`
- `src/hooks/use-employees-search.ts:38`
- `src/components/ui/data-grid.tsx:354`
- `src/components/ui/slide-panel.tsx:164`
- `src/components/ui/slide-panel.tsx:167`
- `src/components/dashboard/Dashboard.tsx:346`
- `src/components/inventory/product-wizard.tsx:458`
- `src/components/inventory/stock-out-form.tsx:234`
- `src/components/inventory/stock-out-form.tsx:248`

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S3358)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `0h 22m`

### 📅 Sessions
```json
[
  { "date": "2026-07-29", "start": "20:08", "end": "20:30" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 22m (22m)
- **vs optimistic:** −1h 38m
- **vs pessimistic:** −3h 38m

**Justification:**
Came in well under estimate. The 14 SonarCloud-flagged locations resolved to 12 real fixes (2 of
the 14, both in `confirm-dialog.tsx`, had already been eliminated by an unrelated prior refactor —
`useDialogTransition`/`animCls` — before this branch was cut, so no work was needed there). The
remaining 12 were mechanical, single-file, no-behavior-change extractions (precomputed variables,
if/else-built render variables, lookup tables, small helper functions) with the existing Vitest
suite (3568 tests) acting as a regression safety net — no new tests, design decisions, or rework
cycles were required.




