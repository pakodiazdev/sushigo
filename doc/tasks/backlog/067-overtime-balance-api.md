# 🌐 Task #067: Overtime Bank Balance & Movements API

## 📖 Story

**English:**
As a Manager, I want to query the overtime bank balance and movement history for an employee.

**Español:**
Como Manager, quiero consultar el balance y movimientos del banco de horas extra de un empleado.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/employees/{id}/overtime-bank` — balance (sum of balanceImpact)
- [ ] 🌐 `GET /api/v1/employees/{id}/overtime-bank/movements?date_from=&date_to=` — list movements
- [ ] 🧪 Feature tests: balance calculation, movement list with filters

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Overtime Balance Card** (in Employee Detail → Overtime tab) — current balance (hours/minutes), visual indicator (positive 🟢 / zero ⚪ / negative 🔴)
- [ ] 📱 **Movement History Table** — columns: date, type (EARNED/USED/PAID/ADJUSTMENT), minutes, balance_after, notes; date range filter; pagination
- [ ] 📱 **Manual Movement Button** — visible for admin, opens #068 form
- [ ] 📱 Hooks: `useOvertimeBalance(employeeId)`, `useOvertimeMovements(employeeId, dateRange)` — queries
- [ ] 🧪 E2E test: view balance, filter movement history

---

## 🎯 Acceptance Criteria

- [ ] Balance = sum of impacts
- [ ] Movements filtered correctly

---

## 🔗 References

- **Backlog:** AP-038
- RF-46
- domain-model.md §2.10

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
