# ✅ Configure PHPUnit test execution with coverage in GitHub Actions

## 📖 Story

**🇬🇧 English:**
As a developer, I need PHPUnit tests with coverage to run automatically on every pull request and on every push to `main` that changes files in `api/`, so that regressions are blocked before they reach `main` and before they reach production.

**🇪🇸 Español:**
Como desarrollador, necesito que las pruebas de PHPUnit con cobertura se ejecuten automáticamente en cada pull request y en cada push a `main` que modifique archivos en `api/`, para que las regresiones se bloqueen antes de llegar a `main` y antes de llegar a producción.

---

## ✅ Technical Tasks
- [ ] 🔧 Create `.github/workflows/api-tests.yml`
  - Trigger: `pull_request` and `push` to `main`, path filter `code/api/**`
  - Services: PostgreSQL container (`mydb_test`)
  - Steps: checkout → setup PHP with Xdebug/PCOV → composer install → `php artisan test --coverage --coverage-clover=coverage.xml`
- [ ] 📤 Upload `coverage.xml` as workflow artifact (consumed by SonarCloud task [#045](https://github.com/pakodiazdev/sushigo/issues/45))
- [ ] ✅ Verify all existing tests pass in CI environment
- [ ] 📝 Update `doc/architecture/infrastructure/infrastructure.en.md` workflow table

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** —

### 📅 Sessions
```json
[]
```
