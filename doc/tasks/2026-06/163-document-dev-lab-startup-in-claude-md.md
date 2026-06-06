# 🔧 Task #163: Document init-agent-workspace.sh in CLAUDE.md as dev-lab startup method

## 📖 Story

**English:**
As an AI agent or developer working inside a `sushigo-dev-lab` workspace, I need `CLAUDE.md` to document the correct startup method (`init-agent-workspace.sh`) so I don't accidentally run the full heavyweight Docker stack inside a workspace clone.

**Español:**
Como agente o desarrollador trabajando dentro de un workspace de `sushigo-dev-lab`, necesito que `CLAUDE.md` documente el método de arranque correcto (`init-agent-workspace.sh`) para no ejecutar accidentalmente el stack Docker completo dentro de un clon de workspace.

---

## ✅ Technical Tasks

- [x] 📝 Add `### Dev-Lab (multi-agent local development)` section to `CLAUDE.md`
- [x] 📝 Document `./init-agent-workspace.sh` as the startup method when using dev-lab
- [x] 📝 Clarify that shared services (PostgreSQL, Redis, Mailpit) come from dev-lab's `docker compose up -d`
- [x] 📝 Add warning: do NOT run `docker compose up` from inside a workspace when using dev-lab
- [x] 📝 Add link to `sushigo-dev-lab` repo

---

## 🎯 Acceptance Criteria

- [x] `CLAUDE.md` has a `### Dev-Lab (multi-agent local development)` section before the Docker section
- [x] Section explains `init-agent-workspace.sh` purpose and usage
- [x] Section warns against running `docker compose up` from workspace
- [x] Section links to `sushigo-dev-lab` repo

---

## 🔗 References

- **GitHub Issue:** [#163](https://github.com/pakodiazdev/sushigo/issues/163)
- **dev-lab repo:** [pakodiazdev/sushigo-dev-lab](https://github.com/pakodiazdev/sushigo-dev-lab)
- Related: pakodiazdev/sushigo-dev-lab #1

---

## ⏱️ Estimates

- **Optimistic:** `15m`
- **Pessimistic:** `30m`
- **Tracked:** `~15m`
- **Closed:** `2026-06-05`
