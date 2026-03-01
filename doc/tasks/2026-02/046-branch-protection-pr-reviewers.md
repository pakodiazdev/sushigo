# 🛡️ Configure branch protection and required PR reviewers

## 📖 Story

**🇬🇧 English:**
As a developer, I need `main` branch protection rules to require linter checks to pass and at least one human reviewer to approve before merging, so that no unreviewed or format-broken code reaches the production pipeline.

**🇪🇸 Español:**
Como desarrollador, necesito reglas de protección en la rama `main` que exijan que los checks de linters pasen y que al menos un revisor humano apruebe antes de hacer merge, para que ningún código sin revisar o con errores de formato llegue al pipeline de producción.

---

## ✅ Technical Tasks
- [x] 🔧 Enable branch protection on `main`: require pull request before merging
- [x] 🔧 Set required status checks: `api-lint`, `webapp-lint`, `api-tests`, `webapp-tests`
- [x] 🔧 Require at least 1 approved review before merge
- [x] 🔧 Add `dervi` as required reviewer on pull requests (via `.github/CODEOWNERS`)
- [x] 🔧 Enable GitHub Copilot code review on pull requests (via Rulesets)
- [x] 🔧 Dismiss stale reviews on new commits
- [x] 🔧 Require branches to be up to date before merging

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** `1h`

### 📅 Sessions
```json
[
  {
    "date": "2026-02-28",
    "duration": "1h",
    "notes": "Configured branch protection via GitHub API; created CODEOWNERS for dervi; enabled Copilot review via Rulesets"
  }
]
```
