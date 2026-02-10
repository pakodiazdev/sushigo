# 🔐 Task #059: Manager Edit Restriction — Current Day Only

## 📖 Story

**English:**
As the system, I need to prevent Managers from editing attendance for past days.

**Español:**
Como sistema, necesito impedir que un Manager edite asistencias de días anteriores.

---

## ✅ Technical Tasks

- [ ] 🔧 Create Policy/Middleware: if user role = Manager AND attendance.date < today → deny (403)
- [ ] 🔧 Apply to: check-in, check-out, lunch-return, day-status, partial-leave, overtime-decision endpoints
- [ ] 🔧 Admin bypasses this restriction
- [ ] 🧪 Feature tests: Manager edits today (OK), Manager edits yesterday (403), Admin edits yesterday (OK)

---

## 🎯 Acceptance Criteria

- [ ] Manager blocked on past dates
- [ ] Admin allowed on any date

---

## 🔗 References

- **Backlog:** AP-066
- RF-17
- backlog AP-066

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
