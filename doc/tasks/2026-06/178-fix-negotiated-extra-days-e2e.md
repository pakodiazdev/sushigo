# 🐛 Task #178: Fix employee-negotiated-extra-days E2E test

## 📖 Story

**English:**
The `employee-negotiated-extra-days.cy.ts` E2E test had 8 root causes: stale dates, wrong selectors, seeder using non-deterministic `now()` calls, and `this->now` derived from different timestamps within the same seeder run.

**Español:**
El test E2E `employee-negotiated-extra-days.cy.ts` tenía 8 causas raíz: fechas obsoletas, selectores incorrectos, seeder usando llamadas `now()` no deterministas y `this->now` derivado de distintos timestamps dentro del mismo seeder.

---

## ✅ Tasks

- [x] 🐛 Fix 8 root causes in `employee-negotiated-extra-days.cy.ts`
- [x] 🌱 Capture single `now()` base in `NegotiatedExtraDaysSeeder`
- [x] 🌱 Derive `this->now` from single today base timestamp in seeder
- [x] 🔧 Add `pr-comments` slash command to project `.claude/commands`

---

## 🎯 Acceptance Criteria

- [x] `employee-negotiated-extra-days.cy.ts` passes in CI and dev-lab E2E stack

---

## 🔗 References

- **GitHub issue:** #178

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `2h 30m`

### 📅 Sessions
```json
[
  { "date": "2026-06-13", "start": "11:00", "end": "13:30" }
]
```
