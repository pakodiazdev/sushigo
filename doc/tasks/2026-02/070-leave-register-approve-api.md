# 🌐 Task #070: Register & Approve Leave API

## 📖 Story

**English:**
As a Manager, I want to register and approve full-day leaves, updating attendance records.

**Español:**
Como Manager, quiero registrar y aprobar permisos de día completo, actualizando los registros de asistencia.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/leaves` — CreateLeaveController (status=PENDING)
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/approve` — ApproveLeaveController (creates attendances with LEAVE status)
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/reject` — RejectLeaveController
- [ ] 🔧 On approve: create Attendance per day in range with day_status=LEAVE
- [ ] 🧪 Feature tests: create, approve (attendances created), reject

---

## 🎯 Acceptance Criteria

- [ ] Approval creates attendance records
- [ ] Status transitions correct

---

## 🔗 References

- **Backlog:** AP-050
- RF-25
- domain-model.md §2.12

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
