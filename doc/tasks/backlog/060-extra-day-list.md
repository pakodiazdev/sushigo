# 📋 Task #060: View Negotiated Extra Days List

## 📖 Story

**English:**
As a Manager, I want to view the list of negotiated extra days for an employee or a date range, so I can review all payment agreements.

**Español:**
Como Manager, quiero ver la lista de días extra negociados de un empleado o rango de fechas, para revisar todos los acuerdos de pago.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/negotiated-extra-days?employee_id=&date_from=&date_to=` — ListExtraDaysController
- [ ] 🔧 Response includes: employee (name, code), date, agreed_pay, approved_by (name), notes
- [ ] 🧪 Feature tests: filter by employee, filter by date range

## ✅ Frontend Tasks

- [ ] 📝 Add `getExtraDays(filters)` to `src/services/extra-day.service.ts`
- [ ] 📱 **Extra days panel** in Employee Detail — table: date, agreed pay, approved by, notes
- [ ] 📱 Date range filter
- [ ] 🔧 `useExtraDayList(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Extra days are listed with their agreed pay amounts and approver
- [ ] Filter by date range works correctly

---

## 🔗 References

- **Backlog:** AP-033 · RF-39

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
