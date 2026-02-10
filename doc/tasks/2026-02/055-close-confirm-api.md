# 🔒 Task #055: Confirm Weekly Close API (freeze)

## 📖 Story

**English:**
As a Manager, I want to confirm the weekly close, to freeze results as an immutable snapshot.

**Español:**
Como Manager, quiero confirmar el cierre de la semana, para congelar los resultados como snapshot inmutable.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/pay-periods` — ClosePayPeriodController
- [ ] 📝 ClosePayPeriodRequest — branch_id, period_start, period_end
- [ ] 🔧 Execute PayrollCalculator for all employees
- [ ] 🔧 Create PayPeriod (status=CLOSED, closed_by=auth, closed_at=now)
- [ ] 🔧 Create PayPeriodEmployee per employee (with frozen totals + daily_snapshot)
- [ ] 🔧 Create PayPeriodLine per concept/day
- [ ] 🔧 Wrap in DB::transaction
- [ ] 🔧 Return 422 if period already exists for branch/dates
- [ ] 🧪 Feature tests: successful close, duplicate (422), verify snapshot immutability

---

## 🎯 Acceptance Criteria

- [ ] PayPeriod + employees + lines created atomically
- [ ] Status = CLOSED
- [ ] Duplicate rejected

---

## 🔗 References

- **Backlog:** AP-046
- RF-20, RN-16
- domain-model.md §2.20–2.22, sequence §6.3

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h`
- **Pessimistic:** `6h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
