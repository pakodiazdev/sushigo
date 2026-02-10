# 🌐 Task #076: Vacation Request & Approval API

## 📖 Story

**English:**
As a Manager, I want to request and approve vacations, blocking attendance capture for those days.

**Español:**
Como Manager, quiero solicitar y aprobar vacaciones, bloqueando la captura de asistencia.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/vacation-requests` — CreateVacationRequestController (auto-calculate days_count, validate balance)
- [ ] 🌐 `PATCH /api/v1/vacation-requests/{id}/approve` — ApproveVacationController (update used_days, create attendances with VACATION)
- [ ] 🌐 `PATCH /api/v1/vacation-requests/{id}/reject` — RejectVacationController
- [ ] 🔧 RF-28: check-in on approved vacation date → 422
- [ ] 🧪 Feature tests: request, approve (attendances created, balance updated), reject, insufficient balance (422), check-in on vacation (422)

---

## 🎯 Acceptance Criteria

- [ ] Balance validated
- [ ] Approval creates VACATION attendances
- [ ] Check-in blocked on vacation days

---

## 🔗 References

- **Backlog:** AP-054
- RF-27, RF-28
- domain-model.md §2.15

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
