# 🔧 Task #340: Version .claude/settings.json and formalize Opportunistic Work

## 📖 Story

**English:**
As a developer working across parallel Sprint 1 workspaces, I need `.claude/settings.json` versioned and populated with a read-only permission allowlist, so I stop re-approving the same safe commands in every workspace and future workspaces inherit the same config from git.

**Español:**
Como desarrollador trabajando en varios workspaces en paralelo durante el Sprint 1, necesito que `.claude/settings.json` esté versionado y con una lista de permisos de solo lectura, para dejar de re-aprobar los mismos comandos seguros en cada workspace y que los futuros workspaces hereden la misma configuración desde git.

---

## ✅ Technical Tasks

- [x] 🔍 Scanned recent transcripts across all active workspaces (`sushigo-a`..`e` + `sushigo-dev-lab`) for the most common read-only Bash/`gh` calls
- [x] 🔓 Un-ignored `.claude/settings.json` in `sushigo-c` (`.claude/.gitignore`: added `!settings.json`, kept `settings.local.json` ignored)
- [x] 🔧 Added the read-only allowlist: `php artisan test*`, `npx vitest run*`, `npm run typecheck`, `npm run lint`, `gh run watch*`, `gh project item-list*`, `gh label list*`, `shellcheck *`
- [x] 📝 Added `doc/conventions/sprints.md` §5.4 Opportunistic Work (convention + both embedded templates) to formalize how unplanned in-sprint tooling/process work like this gets tracked
- [x] 📇 Recorded this as sprint-001's first §5.4 entry and an Execution Evidence row

## 🚫 Explicitly Out of Scope

- Replicating this same config into `sushigo-a`, `-b`, `-d`, `-e` — those workspaces are mid-issue on other Sprint 1 work; deferred until they're free

---

## 🔗 References

- Sprint: `doc/sprints/sprint-001-attendance-payroll-quality.md` §5.4 and §13
- Convention: `doc/conventions/sprints.md` §5.4

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `19m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "02:03", "end": "02:22" }
]
```

## 📊 Retrospective
- **Actual total:** 19m
- **vs optimistic:** −11m
- **vs pessimistic:** −41m

**Justification:**

Config and documentation only — no code logic, no tests to write or run. The bulk of the time was scanning transcripts for real usage patterns (to avoid guessing at what to allowlist) and writing the §5.4 convention section itself; the actual settings.json/.gitignore edits were mechanical once the pattern list was decided. Landed well under even the optimistic estimate.
