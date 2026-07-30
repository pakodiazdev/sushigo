# 🔨 [Maintainability] Number static methods and properties should be preferred over global equivalents (typescript:S7773)

## Description

SonarCloud flagged **17** occurrence(s) of rule `typescript:S7773` (Maintainability, MINOR) in
`sushigo-webapp`: code uses the global `parseInt`/`parseFloat`/`isNaN`/`isFinite` functions instead
of their `Number.*` static equivalents.

## Reason

The global functions coerce their argument to a string/number more loosely than the `Number.*`
static methods (e.g. `isNaN` coerces non-numeric values before checking, `parseInt`/`parseFloat`
implicitly stringify). This looseness has caused subtle bugs elsewhere in the codebase and is
flagged by SonarCloud as a maintainability risk. Fixing it keeps the SonarCloud quality gate clean
and removes a category of implicit-coercion bugs before they occur.

## Objective

All 17 flagged occurrences use `Number.parseInt`, `Number.parseFloat`, `Number.isNaN`, or
`Number.isFinite` in place of their global equivalents, with no behavior change, and SonarCloud
reports 0 occurrences of `typescript:S7773` in `sushigo-webapp`.

## Affected locations

- `src/components/employees/register-wage-form.tsx:77`
- `src/components/employees/register-wage-form.tsx:98`
- `src/components/employees/register-wage-form.tsx:119`
- `src/components/employees/register-wage-form.tsx:151`
- `src/components/employees/register-wage-form.tsx:178`
- `src/components/employees/wage-history-card.tsx:15`
- `src/components/employees/wage-history-card.tsx:28`
- `src/components/cash/create-adjustment-dialog.tsx:108`
- `src/components/cash/create-adjustment-dialog.tsx:138`
- `src/components/cash/open-session-dialog.tsx:70`
- `src/services/cash-balance-service.ts:34`
- `src/services/cash-balance-service.ts:35`
- `src/services/cash-balance-service.ts:36`
- `src/services/cash-balance-service.ts:73`
- `src/services/cash-balance-service.ts:74`
- `src/services/cash-balance-service.ts:86`
- `src/services/cash-balance-service.ts:88`

## Proposed approach

Replace global `parseInt`/`parseFloat`/`isNaN`/`isFinite` calls with their `Number.*` static
equivalents (`Number.parseInt`, `Number.isNaN`, etc.) to avoid the global functions' looser
coercion behavior.

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S7773)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `0h 3m`

### 📅 Sessions
```json
[
  { "date": "2026-07-29", "start": "19:58", "end": "20:01" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 3m (3m)
- **vs optimistic:** −57m
- **vs pessimistic:** −1h 57m

**Justification:**
Came in well under estimate. All 17 flagged occurrences were a mechanical global-function →
`Number.*` static-method swap (`parseFloat` → `Number.parseFloat`, `isNaN` → `Number.isNaN`)
across 5 files, with no behavior change. Two new tests (register-wage-form onChange handlers,
open-session-dialog negative-balance validation) were added afterward to close a new-code coverage
gap flagged by the quality gate, and all 69 existing tests passed unmodified — no design decisions
or rework cycles were required.




