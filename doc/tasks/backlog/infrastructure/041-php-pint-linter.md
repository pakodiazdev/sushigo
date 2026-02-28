# 🎨 Configure PHP Pint linter in GitHub Actions

## 📖 Story

**🇬🇧 English:**
As a developer, I need PHP Pint to run automatically on every pull request and on every push to `main` that changes files in `api/`, so that PHP code formatting issues are caught early during review and enforced before reaching production.

**🇪🇸 Español:**
Como desarrollador, necesito que PHP Pint se ejecute automáticamente en cada pull request y en cada push a `main` que modifique archivos en `api/`, para que los problemas de formato de código PHP se detecten temprano durante la revisión y se apliquen antes de llegar a producción.

---

## ✅ Technical Tasks
- [x] 🔧 Create `.github/workflows/api-lint.yml`
  - Trigger: `pull_request` and `push` to `main`, path filter `code/api/**`
  - Steps: checkout → setup PHP → composer install → `./vendor/bin/pint --test`
- [x] 📝 Add or validate `pint.json` config at `code/api/pint.json` (preset: laravel)
- [x] ✅ Verify pipeline passes on current codebase — pint --test: PASS 389 files, 0 violations
- [x] 📝 Update `doc/architecture/infrastructure/infrastructure.en.md` workflow table (done in #040)

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** —

### 📅 Sessions
```json
[
  { "date": "2026-02-28", "start": "02:53" }
]
```
