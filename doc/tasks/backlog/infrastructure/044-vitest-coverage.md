# ✅ Configure Vitest unit tests with coverage in GitHub Actions

## 📖 Story

**🇬🇧 English:**
As a developer, I need Vitest to run with coverage reporting on every pull request and on every push to `main` that changes files in `webapp/`, so that frontend regressions are blocked before they reach `main` and before they reach production.

**🇪🇸 Español:**
Como desarrollador, necesito que Vitest se ejecute con reporte de cobertura en cada pull request y en cada push a `main` que modifique archivos en `webapp/`, para que las regresiones del frontend se bloqueen antes de llegar a `main` y antes de llegar a producción.

---

## ✅ Technical Tasks
- [ ] 🔧 Create `.github/workflows/webapp-tests.yml`
  - Trigger: `pull_request` and `push` to `main`, path filter `code/webapp/**`
  - Steps: checkout → setup Node → npm ci → `npm run test:coverage`
- [ ] 🔧 Configure Vitest with coverage reporter (lcov + json) in `vite.config.ts`
- [ ] 📤 Upload lcov coverage report as artifact (consumed by SonarCloud task [#045](https://github.com/pakodiazdev/sushigo/issues/45))
- [ ] ✅ Verify tests pass in CI environment
- [ ] 📝 Update `doc/architecture/infrastructure/infrastructure.en.md` workflow table

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1.5h`
- **Pessimistic:** `3h`
- **Tracked:** —

### 📅 Sessions
```json
[]
```
