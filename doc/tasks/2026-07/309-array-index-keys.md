# 🔨 Task #309: JSX list components should not use array indexes as key

**Type:** 🔨 Refactor / Code Quality
**Priority:** Medium
**Detected by:** SonarCloud — `typescript:S6479` (Maintainability, MAJOR)
**SonarCloud project:** [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6479)

---

## 📋 Description

SonarCloud flagged 5 occurrences of `key={index}` (or index-derived keys) in list-rendering `.map()` calls across the webapp. Using the array index as the React `key` breaks item identity across insertions/reorders/deletions. Each occurrence needs a stable, unique key derived from the item's own data instead of its position.

## 🔍 Affected locations

| File | Line | Fix approach |
|---|---|---|
| `src/components/ui/data-grid.tsx` | 167 | Pagination ellipsis. `pages` array is monotonic (`1 … ellipsis … N`); key off the preceding page number (`ellipsis-${pages[i-1]}`) instead of loop index — always unique/stable. |
| `src/components/cash/create-adjustment-dialog.tsx` | 238 | `lines.map((line, index) => <Card key={index}>`. `CashAdjustmentLineFormData` has no id and is posted verbatim to the API, so no id field is added to it. Track a parallel `lineKeys: string[]` state (`crypto.randomUUID()`), synced in `handleAddLine`/`handleRemoveLine`. |
| `src/components/inventory/product-wizard.tsx` | 666 | `wizardData.conversions.map((conversion, index) => <div key={index}>`. Same constraint (`conv` posted to `/uom-conversions`). Parallel `conversionKeys: string[]` state, synced in `addConversion`/`removeConversion`. |
| `src/components/inventory/product-wizard.tsx` | 757 | `wizardData.openingBalances.map((balance, index) => <div key={index}>`. Parallel `balanceKeys: string[]` state, synced in `addOpeningBalance`/`removeOpeningBalance`. |
| `src/components/dashboard/Dashboard.tsx` | 286 | `data.stats.map((stat, index) => <StatCard key={index}>`. `Stat.title` is unique in the dataset — use `key={stat.title}`. |

---

## 🎯 Acceptance Criteria

- [x] All 5 flagged locations use a stable, unique, non-index-derived key
- [x] No new `any` usage, no data transformation moved into controllers (n/a — frontend only)
- [x] `npm run lint` and `npm run typecheck` pass with 0 errors
- [x] Existing Vitest and Cypress suites pass unchanged (pure refactor, no behavior change); added targeted Vitest coverage for the previously-untested remove-item flows to keep new-code coverage >= 80%
- [ ] SonarCloud shows 0 new occurrences of `typescript:S6479` on the PR

---

## 🔗 References

- GitHub issue: [#309](https://github.com/pakodiazdev/sushigo/issues/309)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `42m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "01:45", "end": "02:15" },
  { "date": "2026-07-27", "start": "02:15", "end": "02:27" }
]
```

## 📊 Retrospective
- **Actual total:** 42m (30 min + 12 min)
- **vs optimistic:** −18m
- **vs pessimistic:** −1h 18m

**Justification:**

Finished under the optimistic estimate — the fix was mechanical (5 well-scoped `key` replacements) with no unplanned rework. Deviations from the original no-new-tests scope: added Vitest coverage for the previously-untested "remove item" flows to keep new-code coverage above 80% (session 1), then addressed 3 PR review comments in session 2 — two real bugs (stale closures/non-functional state updates in `handleAddLine`/`handleRemoveLine` and `addOpeningBalance` that could desync state under rapid clicks) and a missing task-file retrospective. Both sessions were fast since the components already had test scaffolding and the review feedback was precise and actionable.
