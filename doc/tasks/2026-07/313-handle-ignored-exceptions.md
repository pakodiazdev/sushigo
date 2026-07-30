# 🔨 [Maintainability] Exceptions should not be ignored (typescript:S2486)

## Description

SonarCloud flagged 2 occurrences of rule `typescript:S2486` (Exceptions should not be ignored) in `sushigo-webapp`:

- `src/components/cash/create-adjustment-dialog.tsx:131`
- `src/stores/auth.store.ts:244`

Both are `catch` blocks that swallow the caught exception without using it in any way.

## Reason

Empty/no-op catch blocks hide failures from anyone reading logs or debugging production issues, and trip the SonarCloud Maintainability quality gate, blocking a clean scan.

## Objective

Both catch blocks handle the caught exception meaningfully (via `console.error`, following the existing logging pattern already used elsewhere in `auth.store.ts`), the SonarCloud rule no longer flags these locations, and no behavior changes for end users.

## ✅ Technical Tasks
- [x] 🐛 Log the caught error in `create-adjustment-dialog.tsx`'s create-adjustment catch block
- [x] 🐛 Log the caught error in `auth.store.ts`'s `initializeAuth()` catch block

## 🎯 Acceptance Criteria
- [x] Both catch blocks call `console.error` with a descriptive prefix and the error
- [x] SonarCloud no longer reports `typescript:S2486` for these two locations
- [x] Existing behavior (toast on adjustment failure, auth reset on `initializeAuth` failure) is unchanged
- [x] Lint and typecheck pass

## 🔗 References
- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S2486)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `0h 14m`

### 📅 Sessions
```json
[
  { "date": "2026-07-29", "start": "20:03", "end": "20:17" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 14m (14m)
- **vs optimistic:** −16m (under)
- **vs pessimistic:** −46m (under)

**Justification:** Finished well under both estimates. The fix was narrowly scoped — two `catch` blocks each needed one `console.error` line — and the codebase already had an established logging pattern in the same file (`auth.store.ts` lines 66 and the storage-rehydration catch) to mirror, so there was no design decision to make and no rework.

