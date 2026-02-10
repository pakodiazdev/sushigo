# 🔧 Task #044: Auditable Trait (auto-audit on model events)

## 📖 Story

**English:**
As a developer, I need a reusable trait that auto-logs CREATE/UPDATE/DELETE events, to avoid repeating audit logic.

**Español:**
Como desarrollador, necesito un trait reutilizable que registre automáticamente eventos CREATE/UPDATE/DELETE.

---

## ✅ Technical Tasks

- [ ] 🔧 Create trait `Auditable` in app/Models/Concerns/Auditable.php
- [ ] 🔧 Hook into Eloquent events: created → log CREATE + new_values; updated → log UPDATE + old_values (dirty) + new_values (changes); deleted → log DELETE + old_values
- [ ] 🔧 user_id from Auth::id()
- [ ] 🔧 Apply trait to: Attendance, PartialLeave, NegotiatedExtraDay
- [ ] 🧪 Tests: create Attendance → audit log created; update Attendance → log with diff; delete → log with old values

---

## 🎯 Acceptance Criteria

- [ ] Auto-logs on create/update/delete
- [ ] Only changed fields in UPDATE diff
- [ ] Works on all applied models

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
