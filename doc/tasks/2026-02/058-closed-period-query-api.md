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

---

## 🎯 Acceptance Criteria

- [ ] Returns full snapshot data
- [ ] Filter by branch and status works

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
