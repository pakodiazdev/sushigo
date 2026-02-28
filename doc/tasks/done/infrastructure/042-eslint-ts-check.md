# 🎨 Configure ESLint + TypeScript check in GitHub Actions

## 📖 Story

**🇬🇧 English:**
As a developer, I need ESLint and TypeScript type-check to run automatically on every pull request and on every push to `main` that changes files in `webapp/`, so that frontend lint errors and type errors are caught early during review and enforced before reaching production.

**🇪🇸 Español:**
Como desarrollador, necesito que ESLint y la verificación de tipos de TypeScript se ejecuten automáticamente en cada pull request y en cada push a `main` que modifique archivos en `webapp/`, para que los errores de lint y de tipos se detecten temprano durante la revisión y se apliquen antes de llegar a producción.

---

## ✅ Technical Tasks
- [x] 🔧 Create `.github/workflows/webapp-lint.yml`
  - Trigger: `pull_request` and `push` to `main`, path filter `code/webapp/**`
  - Steps: checkout → setup Node → npm ci → `npm run lint` → `npm run typecheck`
- [x] ✅ Verify lint and typecheck pass on current codebase — ESLint: PASS, tsc --noEmit: PASS
- [x] 📝 Update `doc/architecture/infrastructure/infrastructure.en.md` workflow table (done in #040)

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** `~1h 45m`

### 📅 Sessions
```json
[
  { "date": "2026-02-28", "start": "04:57", "end": "05:32" },
  { "date": "2026-02-28", "start": "05:32", "end": "06:11" }
]
```
