# 🔓 Task #076: Reopen Closed Period

## 📖 Story

**English:**
As an Admin, I want to reopen a closed payroll period with a justification, so I can correct errors while maintaining a full audit trail of the reopening.

**Español:**
Como Admin, quiero reabrir un periodo de nómina cerrado con una justificación, para poder corregir errores manteniendo un registro completo de auditoría de la reapertura.

---

## ✅ Backend Tasks

- [ ] 🌐 `PATCH /api/v1/pay-periods/{id}/reopen` — ReopenPeriodController; body: `{ reason }`
- [ ] 🔧 Sets status = REOPENED; records reopened_by, reopened_at, reopen_reason; only Admin can execute (403 otherwise)
- [ ] 🌐 `PATCH /api/v1/pay-periods/{id}/reclose` — recalculates and closes again (status = CLOSED)
- [ ] 🔧 Creates audit log entry for both operations
- [ ] 🧪 Feature tests: reopen by admin (success), reopen by manager (403), reclose

## ✅ Frontend Tasks

- [ ] 🔧 `reopenPeriod(periodId, reason)` + `reclosePeriod(periodId)` in `src/services/payroll.service.ts`
- [ ] 📱 **"Reabrir periodo" button** in Closed Period Detail (#074) — visible only to Admin + only for CLOSED status
- [ ] 📱 **Reopen modal** — reason text area (required); "Confirmar reapertura" button
- [ ] 📱 After reopen: status badge changes to REOPENED; preview and confirm buttons reappear
- [ ] 📱 After reclose: status returns to CLOSED; reopening metadata visible in the header

---

## 🎯 Acceptance Criteria

- [ ] Admin can reopen a period and provide a mandatory reason
- [ ] Managers cannot reopen (403 response maps to permission error message)
- [ ] After reopening, the period can be reclosed; reason is visible in the period header

---

## 🔗 References

- **Backlog:** AP-047 · RF-21, RN-17

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
