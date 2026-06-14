# 🔧 Task #147: Skip CI Workflows on Documentation-Only Pull Requests

## 📖 Story

**English:**
As a developer merging documentation-only PRs (licensing docs, task files, README, architecture docs), I need CI workflows to skip entirely so that merge is not blocked by queued checks that have nothing to test.

**Español:**
Como desarrollador al mergear PRs de solo documentación, necesito que los CI workflows no corran para que el merge no quede bloqueado por checks en cola que no tienen nada que probar.

---

## ✅ Technical Tasks

- [ ] 🔧 Add `paths: ['code/api/**']` to `on: pull_request:` trigger in `.github/workflows/api-lint.yml`
- [ ] 🔧 Add `paths: ['code/api/**']` to `on: pull_request:` trigger in `.github/workflows/api-tests.yml`
- [ ] 🔧 Add `paths: ['code/webapp/**']` to `on: pull_request:` trigger in `.github/workflows/webapp-lint.yml`
- [ ] 🔧 Add `paths: ['code/webapp/**']` to `on: pull_request:` trigger in `.github/workflows/webapp-tests.yml`
- [ ] 🧪 Verify: doc-only PR → zero CI checks appear → merge unblocked
- [ ] 🧪 Verify: code PR → CI checks appear and run correctly
- [ ] 🧪 Verify: mixed PR (code + docs) → only relevant suite runs

---

## 🎯 Acceptance Criteria

- [ ] A PR changing only `doc/**`, `*.md`, or `LICENSE` triggers zero CI workflows
- [ ] A PR changing `code/api/**` triggers `api-lint` and `api-tests`
- [ ] A PR changing `code/webapp/**` triggers `webapp-lint` and `webapp-tests`
- [ ] Branch protection required checks continue to work for code PRs
- [ ] No changes required to branch protection rules

---

## 🔗 References

- **GitHub Issue:** [#147](https://github.com/pakodiazdev/sushigo/issues/147)
- Triggered by: PR #146 (doc-only PR blocked by pending api-sonar check)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-06-14", "start": "02:06", "end": "?" }
]
```
