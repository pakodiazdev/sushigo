# 🔨 [Maintainability] logout() silently swallows its catch error in auth.store.ts

## Description

`auth.store.ts`'s `logout()` action has a `catch (_err)` block (line 171) that silently discards the caught error with only a comment — no logging, no user feedback:

```ts
try {
  await authService.logout();
} catch (_err) {
  // Silently handle logout errors - we'll clear state anyway
} finally {
  set({ ... });
}
```

Flagged by Devin/DeepWiki (Investigate severity) during review of PR #364, which fixed the same anti-pattern at two other locations in this file and in `create-adjustment-dialog.tsx` for SonarCloud rule `typescript:S2486`. This location wasn't part of SonarCloud's original 2-location report for that issue, so it was intentionally left out of #313's scope and filed here separately instead.

## Reason

Even though clearing local auth state regardless of the API call's outcome is correct behavior (the user is logged out client-side either way), swallowing the actual error with no log entry hides real failures (network errors, 500s, auth service outages) from anyone debugging why a user's logout silently failed to reach the backend.

## Objective

The `catch` block in `logout()` logs the caught error (e.g. via `console.error`, matching the pattern already used elsewhere in this file at lines 66 and 245) before falling through to the existing `finally` state-clearing logic. No behavior change — the client still always logs the user out locally.

## ✅ Technical Tasks
- [x] 🐛 Log the caught error in `auth.store.ts`'s `logout()` catch block

## 🎯 Acceptance Criteria
- [x] The catch block calls `console.error` with a descriptive prefix and the error
- [x] Existing behavior (local auth state always cleared on logout, regardless of API outcome) is unchanged
- [x] Lint and typecheck pass

## 🔗 References
- Related: #313, PR #364 (fixed the same anti-pattern at 2 other locations)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `0.5h` · **Tracked:** `2m`

### 📅 Sessions
```json
[
  { "date": "2026-07-30", "start": "02:44", "end": "02:46" }
]
```

## 📊 Retrospective
- **Actual total:** 2m (2m)
- **vs optimistic:** −13m
- **vs pessimistic:** −28m

**Justification:** This was a single-line, well-precedented fix — the exact same `console.error`
pattern had already been applied twice in this same file by PR #364/#313, so there was no
investigation needed, just applying the established pattern to the third location plus a small
Vitest suite covering the `logout()` success/failure paths. One round of review response (a
Copilot comment asking for an additional `token` assertion) was addressed and resolved without
needing to reopen a session, since it fell within the same sitting.




