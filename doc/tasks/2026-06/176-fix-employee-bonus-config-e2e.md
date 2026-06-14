# 🐛 Task #176: Fix employee-bonus-config E2E test

## 📖 Story

**English:**
The `employee-bonus-config.cy.ts` E2E test was failing because the "Ver detalle" button selector used `button[aria-label]` which didn't match the rendered element.

**Español:**
El test E2E `employee-bonus-config.cy.ts` fallaba porque el selector del botón "Ver detalle" usaba `button[aria-label]` que no coincidía con el elemento renderizado.

---

## ✅ Tasks

- [x] 🐛 Fix "Ver detalle" button selector in `employee-bonus-config.cy.ts`
- [x] 🔧 Address Copilot review comments on PR #177

---

## 🎯 Acceptance Criteria

- [x] `employee-bonus-config.cy.ts` passes in CI and dev-lab E2E stack

---

## 🔗 References

- **GitHub issue:** #176
- **PR:** #177

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `2h`

### 📅 Sessions
```json
[
  { "date": "2026-06-13", "start": "10:00", "end": "12:00" }
]
```
