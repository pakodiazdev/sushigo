# 🛡️ Configure branch protection and required PR reviewers

## 📖 Story

**🇬🇧 English:**
As a developer, I need `main` branch protection rules to require linter checks to pass and at least one human reviewer to approve before merging, so that no unreviewed or format-broken code reaches the production pipeline.

**🇪🇸 Español:**
Como desarrollador, necesito reglas de protección en la rama `main` que exijan que los checks de linters pasen y que al menos un revisor humano apruebe antes de hacer merge, para que ningún código sin revisar o con errores de formato llegue al pipeline de producción.

---

## ✅ Technical Tasks
- [ ] 🔧 Enable branch protection on `main`: require pull request before merging
- [ ] 🔧 Set required status checks: `api-lint`, `webapp-lint`, `api-tests`, `webapp-tests`, `sonarcloud`
- [ ] 🔧 Require at least 1 approved review before merge
- [ ] 🔧 Add `dervi` as required reviewer on pull requests
- [ ] 🔧 Enable GitHub Copilot code review on pull requests
- [ ] 🔧 Dismiss stale reviews on new commits
- [ ] 🔧 Require branches to be up to date before merging

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** —

### 📅 Sessions
```json
[]
```
