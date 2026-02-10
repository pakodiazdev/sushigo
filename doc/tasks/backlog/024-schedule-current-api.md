# 🌐 Task #024: Get Current Schedule API

## 📖 Story

**English:**
As a Manager, I want to view the current effective schedule for an employee, to know their expected times.

**Español:**
Como Manager, quiero consultar el horario vigente de un empleado, para saber sus tiempos esperados.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/employees/{id}/current-schedule` — GetCurrentScheduleController
- [ ] 🔧 Query: EmployeeSchedule where effective_to IS NULL (or effective on today), eager load scheduleDays
- [ ] 🔧 Return 404 if no current schedule found
- [ ] 🔧 Response: schedule name, workday_type, working_days_per_week, days[] with all times
- [ ] 🧪 Feature tests: employee with schedule, employee without schedule (404)

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Current Schedule Card** (in Employee Detail → Schedules tab) — displays active schedule name, effective_from, workday_type; 7-day grid read-only with times
- [ ] 📱 **Empty State** — "Sin horario asignado" when no current schedule, with CTA to create one
- [ ] 📱 Hook: `useCurrentSchedule(employeeId)` — query with stale time

---

## 🎯 Acceptance Criteria

- [ ] Returns current schedule with 7 days
- [ ] 404 if none found

---

## 🔗 References

- **Backlog:** AP-009
- RF-08
- domain-model.md §2.3

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
