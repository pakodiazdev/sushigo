# 🌐 Task #077: List Vacation Requests API

## 📖 Story

**English:**
As a Manager, I want to query vacation requests for an employee.

**Español:**
Como Manager, quiero consultar las solicitudes de vacaciones.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/vacation-requests?employee_id=&status=` — ListVacationRequestsController
- [ ] 🧪 Feature test

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Vacation Requests Table** (in Employee Detail → Vacaciones tab or Leaves page) — columns: dates, days count, status badge, approved/rejected by; filter by status; pagination
- [ ] 📱 **Cancel Action** — for PENDING requests, show cancel button
- [ ] 📱 Hook: `useVacationRequests(employeeId, status)` — query with pagination

---

## 🎯 Acceptance Criteria

- [ ] Filters work

---

## 🔗 References

- **Backlog:** AP-055
- RF-27
- domain-model.md §2.15

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1h`
- **Pessimistic:** `1.5h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
