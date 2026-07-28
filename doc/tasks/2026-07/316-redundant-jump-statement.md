# 🔨 Task #316: Jump statements should not be redundant (typescript:S3626)

**Type:** 🔨 Refactor / Code Quality
**Priority:** Low
**Detected by:** SonarCloud — `typescript:S3626` (Maintainability, MINOR)
**SonarCloud project:** [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S3626)

---

## 📋 Description

SonarCloud flagged 1 occurrence of a redundant `return` statement in `sushigo-webapp`. The `return` has no effect on control flow and can be safely removed.

## 🔍 Affected locations

| File | Line | Fix approach |
|---|---|---|
| `src/components/layout/Layout.tsx` | 55 | `return;` inside the `shouldRedirectToLogin` branch of the redirect `useEffect` is the last statement of the effect callback — remove it, the `router.navigate({ to: '/login' })` call above it is unaffected. |

---

## 🎯 Acceptance Criteria

- [x] Redundant `return` at `Layout.tsx:55` removed
- [x] No behavior change (auth redirect flow works identically)
- [x] `npm run lint` and `npm run typecheck` pass with 0 errors
- [ ] SonarCloud shows 0 new occurrences of `typescript:S3626` on the PR

---

## 🔗 References

- GitHub issue: [#316](https://github.com/pakodiazdev/sushigo/issues/316)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `10m` · **Pessimistic:** `30m` · **Tracked:** `3m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "20:38", "end": "20:41" }
]
```

## 📊 Retrospective
- **Actual total:** 3m
- **vs optimistic:** −7m
- **vs pessimistic:** −27m

**Justification:**

Finished well under the optimistic estimate — a single-line redundant `return;` removal with existing test coverage (`Layout.test.tsx`, 10/10 passing) already validating the redirect flow, no new tests needed, lint and typecheck clean on the first pass.
