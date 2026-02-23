# 🔧 Task #044: Auditable Trait (auto-audit on model events)

## 📖 Story

**English:**
As a developer, I need a reusable trait that auto-logs CREATE/UPDATE/DELETE events, to avoid repeating audit logic.

**Español:**
Como desarrollador, necesito un trait reutilizable que registre automáticamente eventos CREATE/UPDATE/DELETE.

---

## ✅ Technical Tasks

- [x] 🔧 Create trait `Auditable` in app/Models/Concerns/Auditable.php
- [x] 🔧 Hook into Eloquent events: created → log CREATE + new_values; updated → log UPDATE + old_values (dirty) + new_values (changes); deleted → log DELETE + old_values
- [x] 🔧 user_id from Auth::id() (nullable — supports unauthenticated CLI/seeder context)
- [x] 🔧 Apply trait to: Attendance (PartialLeave and NegotiatedExtraDay pending their models)
- [x] 🔧 auditReason transient property — single-use, cleared after log write
- [x] 🔧 Enum values serialized as strings in JSON via castAuditValues()
- [x] 🔧 Made attendance_audit_logs.user_id nullable (nullOnDelete) to support unauthenticated context
- [x] 🧪 Tests: create Attendance → audit log created; update Attendance → log with diff; delete → log with old values — 11 tests ✅

---

## 🎯 Acceptance Criteria

- [x] Auto-logs on create/update/delete
- [x] Only changed fields in UPDATE diff
- [x] Works on all applied models

---

## 🔗 References

- **Backlog:** AP-065
- RF-19
- domain-model.md §2.23

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
