# 🌐 Task #020: EmploymentPeriod API

## 📖 Story

**English:**
As an Admin, I want to register and query employment periods for an employee, to control hires, terminations, and re-hires.

**Español:**
Como Admin, quiero registrar y consultar periodos laborales de un empleado, para controlar altas, bajas y reingresos.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/employment-periods` — CreateEmploymentPeriodController (validates no other active period exists)
- [ ] 🌐 `GET /api/v1/employees/{id}/employment-periods` — ListEmploymentPeriodsController (history)
- [ ] 🌐 `PATCH /api/v1/employment-periods/{id}/terminate` — TerminateEmploymentPeriodController (requires end_date + termination_reason)
- [ ] 📝 StoreEmploymentPeriodRequest — branch_id required, start_date required
- [ ] 📝 TerminateRequest — end_date required, termination_reason required
- [ ] 🧪 Feature tests: create period, duplicate active rejected (422), terminate, list history

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Employment Periods Tab** (in Employee Detail) — timeline/list showing all periods: start date, end date, termination reason, active badge
- [ ] 📱 **Create Employment Period Modal** — fields: start_date, branch_id (select); validation
- [ ] 📱 **Terminate Period Modal** — fields: end_date, termination_reason (select); confirm dialog
- [ ] 📱 Hooks: `useEmploymentPeriods(employeeId)`, `useCreatePeriod()`, `useTerminatePeriod()`
- [ ] 🧪 E2E test: create period from employee detail, terminate, verify history

---

## 🎯 Acceptance Criteria

- [ ] Cannot create two active periods
- [ ] Termination requires reason
- [ ] History is ordered by start_date desc

---

## 🔗 References

- **Backlog:** AP-004
- RF-05, RF-06, RF-07
- domain-model.md §2.2

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
