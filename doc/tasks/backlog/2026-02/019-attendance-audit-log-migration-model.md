# 🗄️ Task #019: AttendanceAuditLog Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `AttendanceAuditLog` migration and model, to record all changes to attendance data.

**Español:**
Como desarrollador, necesito crear la migración y modelo `AttendanceAuditLog`, para registrar todos los cambios en datos de asistencia.

---

## ✅ Technical Tasks

- [x] 📂 Create migration `create_attendance_audit_logs_table` — id, auditable_type (varchar 100), auditable_id (bigint), action (enum: CREATE|UPDATE|DELETE), old_values (json nullable), new_values (json nullable), user_id (FK → users), reason (text nullable), created_at
- [x] 🔧 Create `AuditAction` enum: CREATE, UPDATE, DELETE
- [x] 🔧 Create `AttendanceAuditLog` model — polymorphic relationship (auditable), belongsTo(User)
- [x] 🔧 Add INDEX(auditable_type, auditable_id)
- [x] 🧪 Unit test: create log entry, polymorphic lookup

---

## 🎯 Acceptance Criteria

- [x] Migration runs
- [x] Polymorphic relationship resolves correctly

---

## 🔗 References

- **Backlog:** AP-064
- RF-19
- domain-model.md §2.23 `attendance_audit_logs`

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
