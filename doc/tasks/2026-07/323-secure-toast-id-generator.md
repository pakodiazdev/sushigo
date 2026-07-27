# 🔒 Task #323: Replace insecure PRNG used for toast ids in sushigo-webapp

## 📖 Story

**English:**
As a developer, I need to review the SonarCloud Security finding for `typescript:S2245` in `sushigo-webapp`, so the project's security review status stays clean and any real risk is addressed or consciously accepted with justification.

**Español:**
Como desarrollador, necesito revisar el hallazgo de seguridad reportado por SonarCloud para `sushigo-webapp`, para que el estado de revisión de seguridad del proyecto se mantenga limpio y cualquier riesgo real sea resuelto o aceptado conscientemente con justificación.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line |
|---|---|---|---|---|
| `typescript:S2245` | Security | MAJOR | `src/components/ui/toast-provider.tsx` | 17 |

**Message:** "Make sure that using this pseudorandom number generator (Math.random()) is safe here."

## ✅ Technical Tasks

- [x] 🔍 Inspect `toast-provider.tsx:17` — confirmed the `id` from `Math.random().toString(36).substring(2, 9)` is only used as a React list key and as the token passed to `removeToast()` to dismiss a specific toast; not a token, session id, or secret
- [x] 🔧 Replace `Math.random().toString(36).substring(2, 9)` with `crypto.randomUUID()` — cheap, no behavior change, removes the finding at the source
- [x] 🛡️ Add guarded `generateToastId()` fallback (Date.now() + counter, no `Math.random()`) for environments where `crypto.randomUUID` is unavailable, per Copilot review comment on PR #332
- [ ] 🔍 Confirm SonarCloud's PR analysis shows the `typescript:S2245` occurrence resolved (this is a Vulnerability Issue, not a Security Hotspot — no manual "mark reviewed" step is needed, it clears automatically once the fixed line is re-scanned on the PR)

## 🎯 Acceptance Criteria

- [x] The finding at `toast-provider.tsx:17` is resolved via code fix (no behavioral change to toast display/removal)
- [ ] SonarCloud's PR analysis shows 0 occurrences of `typescript:S2245` for sushigo-webapp

## 🚫 Explicitly Out of Scope

- No new Vitest test added: `showToast`'s id generation is an internal implementation detail (React list key / dismiss token), not user-facing behavior; existing toast display/removal behavior is unaffected by swapping the id generator.

---

## 🔗 References

- SonarCloud project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S2245
- Rule: `typescript:S2245`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `1h` · **Tracked:** `34m`

### 📅 Sessions
```json
[
  { "date": "2026-07-26", "start": "19:08", "end": "19:16" },
  { "date": "2026-07-26", "start": "19:40", "end": "20:06" }
]
```

## 📊 Retrospective
- **Actual total:** 34m (8m + 26m)
- **vs optimistic:** +19m
- **vs pessimistic:** −26m

**Justification:**

Session 1 was a single-line RNG swap (`Math.random()` → `crypto.randomUUID()`) in a component whose id is only used as a React list key / dismiss token, so inspection and implementation were immediate with no ambiguity. Session 2 addressed a Copilot review comment: `crypto.randomUUID()` can be unavailable in insecure contexts or older browsers, so a guarded `generateToastId()` fallback (Date.now() + counter, not `Math.random()`, to keep SonarCloud's `S2245` resolved) was added, plus a rebase onto an updated `main`. The overrun past the optimistic estimate reflects that second round of review-driven work, which wasn't part of the original scope.
