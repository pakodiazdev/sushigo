# 📄 Task #074: View Closed Period Detail

## 📖 Story

**English:**
As a Manager or Admin, I want to view the frozen results of a closed payroll period, including each employee's breakdown and daily evidence, so I have the official record for payments.

**Español:**
Como Manager o Admin, quiero ver los resultados congelados de un periodo de nómina cerrado, incluyendo el desglose por empleado y la evidencia diaria, para tener el registro oficial de pagos.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/{id}` — ClosedPeriodDetailController; returns PayPeriod + all PayPeriodEmployees + their PayPeriodLines
- [ ] 🌐 `GET /api/v1/pay-periods?branch_id=&status=` — list periods (with pagination)
- [ ] 🧪 Feature tests: get detail, list with status filter

## ✅ Frontend Tasks

- [ ] 📂 Create routes `src/pages/attendance/payroll/index.tsx` (list) + `src/pages/attendance/payroll/$periodId.tsx` (detail)
- [ ] 🔧 `getPayPeriods(branchId, status)` + `getPayPeriodDetail(periodId)` in `src/services/payroll.service.ts`
- [ ] 📱 **Periods list page** — table: period range, status badge, closed_by, closed_at, total employees; row click opens detail
- [ ] 📱 **Closed period detail** — same layout as preview (#072) but read-only; header shows status, closed_by, closed_at
- [ ] 📱 **Daily evidence expandable** per employee with all PayPeriodLines
- [ ] 🔧 `usePayPeriods(branchId)` + `usePayPeriodDetail(periodId)` hooks

---

## 🎯 Acceptance Criteria

- [ ] Manager can navigate to a closed period and see the frozen breakdown
- [ ] All amounts match what was shown in the preview at close time
- [ ] Status badge clearly shows CLOSED / REOPENED

---

## 🔗 References

- **Backlog:** AP-061 · RF-20

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`
