# 🔍 Integrate SonarCloud for code quality and coverage analysis

## 📖 Story

**🇬🇧 English:**
As a developer, I need SonarCloud to analyze the project on every pull request and on every push to `main`, using coverage reports from the PHP and JS pipelines, so that code smells, bugs, and insufficient coverage are blocked before they reach `main` and before they reach production.

**🇪🇸 Español:**
Como desarrollador, necesito que SonarCloud analice el proyecto en cada pull request y en cada push a `main`, usando los reportes de cobertura de los pipelines de PHP y JS, para que los code smells, bugs e insuficiencia de coverage se bloqueen antes de llegar a `main` y antes de llegar a producción.

---

## ✅ Technical Tasks
- [x] 🔧 Create SonarCloud projects linked to `pakodiazdev/sushigo` repository (monorepo: `sushigo-api` + `sushigo-webapp`)
- [x] 🔑 Add `SONAR_TOKEN_API` and `SONAR_TOKEN_WEBAPP` secrets to GitHub repository settings
- [x] 🔧 Add `code/api/sonar-project.properties` and `code/webapp/sonar-project.properties`
- [x] 🔧 Add SonarCloud scan step to `api-tests.yml` — runs on PR and push to main. Consumes `coverage.xml` from task [#043](https://github.com/pakodiazdev/sushigo/issues/43)
- [x] 🔧 Add SonarCloud scan step to `webapp-tests.yml` — runs on PR and push to main. Consumes lcov from task [#044](https://github.com/pakodiazdev/sushigo/issues/44)
- [ ] 📊 Configure quality gate: minimum coverage threshold 70%, zero new blocker issues
- [ ] ✅ Verify quality gate passes on first run before enforcing as required check
- [x] 📝 Document SonarCloud setup in `doc/architecture/infrastructure/infrastructure.en.md`

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `5h`
- **Tracked:** —

### 📅 Sessions
```json
[
  { "date": "2026-03-01", "start": "20:26", "end": "23:30" }
]
```
