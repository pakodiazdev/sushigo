# 📚 Document CI/CD infrastructure architecture

## 📖 Story

**🇬🇧 English:**
As a developer, I need the deployment and CI/CD infrastructure documented in the repository itself, so that the architecture is traceable and understandable independently of any external platform.

**🇪🇸 Español:**
Como desarrollador, necesito que la infraestructura de despliegue y CI/CD esté documentada en el propio repositorio, para que la arquitectura sea trazable y comprensible de forma independiente a cualquier plataforma externa.

---

## ✅ Technical Tasks
- [ ] 📝 Document current deployment flow (manual trigger → Cloud Run, unified backend+frontend image)
- [ ] 📝 Document branch strategy (`main` = production, `feature/*` = preview environment)
- [ ] 📝 Document target CI/CD pipeline with per-folder triggers (`api/` vs `webapp/`)
- [ ] 📊 Add Mermaid diagram: branch and environment flow
- [ ] 📊 Add Mermaid diagram: pipeline trigger flow per folder
- [ ] 📋 Define non-functional requirements table (format enforcement, coverage threshold, quality gate, required PR reviewers)
- [ ] 🌐 Write in English (`infrastructure.en.md`) and Spanish (`infrastructure.es.md`)

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `3h`
- **Tracked:** —

### 📅 Sessions
```json
[]
```
