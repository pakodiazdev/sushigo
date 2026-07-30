# 🔨 [Maintainability] "catch" clauses should do more than rethrow (typescript:S2737)

## Description

SonarCloud flagged **1** occurrence of rule `typescript:S2737` (Maintainability, MINOR) in
`sushigo-webapp`: the `catch` block in `refreshUser` (`src/stores/auth.store.ts:298`) does nothing
but rethrow the caught error, which is functionally identical to not catching it at all.

## Reason

A `catch` clause that only rethrows adds no value — it doesn't log, transform, or handle the
error, so it's dead code that obscures the real control flow and trips SonarCloud's maintainability
gate, blocking a clean quality report for `sushigo-webapp`.

## Objective

The `try`/`catch` in `refreshUser` no longer contains a rethrow-only `catch` block (either removed
entirely or replaced with real handling), and SonarCloud no longer reports `typescript:S2737` for
this file.

## Affected locations

- `src/stores/auth.store.ts:298`

## Proposed approach

Either remove the catch block entirely (letting the exception propagate naturally) or add real handling (logging, transformation, user feedback) — a catch that only rethrows adds no value.

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S2737)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `1h` · **Tracked:** `2m`

### 📅 Sessions
```json
[
  { "date": "2026-07-30", "start": "02:47", "end": "02:49" }
]
```

## 📊 Retrospective
- **Actual total:** 2m (2m)
- **vs optimistic:** −13m
- **vs pessimistic:** −58m

**Justification:**
Straightforward maintainability fix with a well-scoped rule and a single affected location — the
rethrow-only `catch` in `refreshUser` was removed outright since it added no behavior, verified by
the existing 30-test `auth.store.test.ts` suite plus lint/typecheck, with no rework or surprises.




