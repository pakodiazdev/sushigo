# 🔓 Task #069: Reopen Pay Period API (Admin)

## 📖 Story

**English:**
As an Admin, I want to reopen a closed period to make corrections, with audit trail.

**Español:**
Como Admin, quiero reabrir un periodo cerrado para corregir errores, con auditoría.

---

## ✅ Technical Tasks

- [ ] 🌐 `PATCH /api/v1/pay-periods/{id}/reopen` — ReopenPayPeriodController (reason required)
- [ ] 🌐 `PATCH /api/v1/pay-periods/{id}/reclose` — ReclosePayPeriodController (recalculate + freeze)
- [ ] 🔧 Reopen: status → REOPENED, reopened_by, reopened_at, reopen_reason
- [ ] 🔧 Reclose: re-run PayrollCalculator, overwrite snapshot, status → CLOSED
- [ ] 🔧 Only Admin can reopen
- [ ] 🧪 Feature tests: reopen, reclose, non-admin rejected (403)

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Reopen Button** (on Closed Period Detail, Admin only) — opens confirmation modal
- [ ] 📱 **Reopen Modal** — requires reason (textarea); warning: "Se recalculará la nómina al re-cerrar"
- [ ] 📱 **Reopened State** — period detail shows status=REOPENED with badge; shows "Re-cerrar" button
- [ ] 📱 **Re-close Button** — triggers recalculation + close (loading state while processing)
- [ ] 📱 Hooks: `useReopenPeriod()`, `useReclosePeriod()` — mutations
- [ ] 🧪 E2E test: reopen period, verify status change, re-close, verify recalculated snapshot

---

## 🎯 Acceptance Criteria

- [ ] Reopen records reason and user
- [ ] Reclose recalculates everything
- [ ] Only Admin allowed

---

## 🔗 References

- **Backlog:** AP-047
- RF-21, RN-17
- domain-model.md §2.20, state §5.1

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
