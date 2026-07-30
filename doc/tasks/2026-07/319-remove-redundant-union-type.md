# 🔨 [Maintainability] Type constituents of unions and intersections should not be redundant (typescript:S6571)

## Summary

SonarCloud flagged **1** occurrence(s) of this rule in `sushigo-webapp`.

- **Rule:** `typescript:S6571`
- **Category:** Maintainability
- **Severity:** MINOR

## Affected locations

- `src/hooks/use-employees-search.ts:17`

## Proposed approach

Remove the redundant member from the union/intersection type (e.g. a type already covered by a broader member, or a duplicate).

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6571)

## Description

The `EmployeesSearch` interface in `src/hooks/use-employees-search.ts` declares `form?: 'new' | string`. Since `string` already includes the literal `'new'`, the `'new'` member is redundant and SonarCloud's `typescript:S6571` rule flags it.

## Reason

Redundant union members add noise without adding type safety — TypeScript already accepts `'new'` under the broader `string` type, so keeping both constituents misleads readers into thinking `'new'` is special-cased when it isn't. Cleaning this up keeps the webapp's SonarCloud quality gate green (0 new code smells).

## Objective

- `form` field on `EmployeesSearch` is typed as plain `string` (or an equivalent non-redundant form), no functional change to how the field is read or written
- SonarCloud no longer flags `typescript:S6571` for this file
- Existing lint/typecheck/tests still pass

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `0.5h` · **Tracked:** `0h 2m`

### 📅 Sessions
```json
[
  { "date": "2026-07-30", "start": "02:44", "end": "02:46" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 2m (2m)
- **vs optimistic:** −13m
- **vs pessimistic:** −28m

**Justification:**
Straightforward, well-scoped SonarCloud fix — the redundant union member had a single call site and every existing consumer already treated `form` as a plain string, so no exploratory work or rework was needed. Finished well under both estimates with no surprises.




