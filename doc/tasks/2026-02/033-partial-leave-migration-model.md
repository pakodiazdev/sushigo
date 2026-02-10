# 🗄️ Task #033: PartialLeave Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `PartialLeave` migration and model, to store partial leave events.

**Español:**
Como desarrollador, necesito crear la migración y modelo `PartialLeave`, para almacenar permisos parciales.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_partial_leaves_table` — id, employee_id (FK), attendance_id (FK nullable), date, type (enum: ARRIVE_LATE|LEAVE_EARLY|TAKE_TIME), is_paid (bool), start_time (time nullable), end_time (time nullable), duration_minutes (int), reason (text nullable), approved_by (FK → users), timestamps
- [ ] 🔧 Create `PartialLeaveType` enum: ARRIVE_LATE, LEAVE_EARLY, TAKE_TIME
- [ ] 🔧 Create `PartialLeave` model — $casts, relationships: belongsTo(Employee), belongsTo(Attendance)
- [ ] 🔧 Add validation: duration_minutes > 0
- [ ] 🏭 Create PartialLeaveFactory
- [ ] 🧪 Unit test: create, enum restriction, duration positive

---

## 🎯 Acceptance Criteria

- [ ] Enum restricts to 3 types
- [ ] duration_minutes > 0 enforced

---

## 🔗 References

- **Backlog:** AP-020
- RF-25a
- domain-model.md §2.8 `partial_leaves`

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
