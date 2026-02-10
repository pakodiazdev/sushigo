# 🌐 Task #058: Query Closed Period API

## 📖 Story

**English:**
As a Manager, I want to query closed periods and their frozen data.

**Español:**
Como Manager, quiero consultar periodos cerrados y sus datos congelados.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/{id}` — ShowPayPeriodController (eager: employees, lines)
- [ ] 🌐 `GET /api/v1/pay-periods?branch_id=&status=` — ListPayPeriodsController
- [ ] 🔧 Include totals per employee and breakdown per concept/day
- [ ] 🧪 Feature tests: show period with data, list by branch, filter by status

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Closed Periods List Page** — route: `/payroll/periods`; table: period dates, branch, status badge, closed_by, closed_at, total payroll; filter by branch and status
- [ ] 📱 **Period Detail Page** — route: `/payroll/periods/:id`; header with period info; employee breakdown table with all pay concepts; expandable daily lines
- [ ] 📱 **Reopen Button** — shown for admin users, triggers #069 flow
- [ ] 📱 Hooks: `usePayPeriods(branchId, status)`, `usePayPeriod(id)` — queries
- [ ] 🧪 E2E test: list periods, navigate to detail, verify frozen data displays

---

## 🎯 Acceptance Criteria

- [ ] Returns full snapshot data
- [ ] Filter by branch and status works
- [ ] 🖥️ List page renders with pagination
- [ ] 🖥️ Detail page shows full breakdown

---

## 🔗 References

- **Backlog:** AP-061
- RF-20
- domain-model.md §2.20–2.22

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
