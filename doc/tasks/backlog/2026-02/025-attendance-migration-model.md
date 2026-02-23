# 🗄️ Task #025: Attendance Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `Attendance` migration and model, to store daily check-in/out records per employee.

**Español:**
Como desarrollador, necesito crear la migración y modelo `Attendance`, para almacenar el registro diario de cada empleado.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_attendances_table` — id, employee_id (FK), date, check_in (datetime nullable), check_out (datetime nullable), lunch_start (datetime nullable), lunch_end (datetime nullable), entry_late_seconds (int default 0), lunch_late_seconds (int default 0), net_worked_minutes (int nullable), overtime_minutes (int default 0), overtime_authorized (bool default false), overtime_authorized_by (FK nullable → users), overtime_authorized_at (datetime nullable), day_status (enum), confirmed_by (FK nullable → users), meta (json nullable), timestamps
- [ ] 🔧 UNIQUE(employee_id, date), INDEX(date), INDEX(day_status)
- [ ] 🔧 Create `DayStatus` enum: WORKED, DAY_OFF, LEAVE, VACATION, HOLIDAY, ABSENCE, EXTRA
- [ ] 🔧 Create `Attendance` model — $casts, relationships: belongsTo(Employee), hasMany(PartialLeave), hasMany(OvertimeBankMovement)
- [ ] 🔧 Add scopes: byDate(date), byStatus(status), forEmployee(employeeId)
- [ ] 🔧 Add helper methods: isLateDeductible() (entry_late_seconds > 1800), entryLateMinutes(), lunchLateMinutes()
- [ ] 🏭 Create AttendanceFactory
- [ ] 🧪 Unit tests: unique constraint, isLateDeductible at boundary (1800s vs 1801s), status enum

---

## 🎯 Acceptance Criteria

- [ ] UNIQUE(employee_id, date) enforced
- [ ] isLateDeductible returns false at 1800s, true at 1801s
- [ ] DayStatus enum restricts values

---

## 🔗 References

- **Backlog:** AP-012
- RF-11, RF-12, RF-16
- domain-model.md §2.7 `attendances`

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
