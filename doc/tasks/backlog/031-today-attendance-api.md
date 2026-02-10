# 📋 Task #031: Today Attendance View API

## 📖 Story

**English:**
As a Manager, I want to see all employees with their attendance status for today, to operate daily capture.

**Español:**
Como Manager, quiero ver la lista de empleados con su estado de asistencia del día, para operar la captura diaria.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/attendances/today?branch_id=` — TodayAttendanceController
- [ ] 🔧 Query active employees for the branch (via active employment period) → LEFT JOIN attendances for today
- [ ] 🔧 Response per employee: { employee: {id, code, name, role}, attendance: {check_in, check_out, lunch_end, day_status, entry_late_seconds, overtime_minutes} | null }
- [ ] 🔧 Employees without attendance appear with null (not yet registered)
- [ ] 🔧 Order by employee name
- [ ] 🧪 Feature tests: branch with mixed attendance (some checked in, some not), empty branch

### 📱 Frontend Tasks (mobile — PANTALLA PRINCIPAL)

- [ ] 📱 **Today Attendance Screen** (main screen) — list of all active employees with attendance status cards; auto-refresh every 30s
- [ ] 📱 **Employee Status Card** — shows: avatar/initials, name, code, role badge; attendance state: ⭕ Sin registro, ⏰ Entrada (time), 🍜 Comida, ✅ Completado; late badge if late; overtime badge if overtime
- [ ] 📱 **Action Buttons per State** — dynamic per employee: Check-in → Lunch Return → Check-out; Day-off/Absence button always available if no attendance
- [ ] 📱 **Summary Header** — totals bar: X arrived, Y pending, Z day-off, W late
- [ ] 📱 **Pull-to-Refresh** — manual refresh of employee list
- [ ] 📱 **Search/Filter** — filter by name or role
- [ ] 📱 Hook: `useTodayAttendance(branchId)` — query with refetch interval
- [ ] 🧪 Test: screen loads employees, shows correct states, actions change per state

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Today Attendance Page** — same data as mobile but in table layout: employee, check_in, lunch_end, check_out, late, overtime, status
- [ ] 📱 **Quick Actions Column** — action buttons inline per row (check-in, day-off, etc.)
- [ ] 📱 **Auto-refresh Toggle** — enable/disable auto-refresh
- [ ] 🧪 E2E test: verify today attendance table renders with correct data

---

## 🎯 Acceptance Criteria

- [ ] All active employees shown
- [ ] Employees without attendance show null
- [ ] Filtered by branch
- [ ] 📱 Mobile: employee cards show correct action buttons per state
- [ ] 📱 Mobile: summary header totals are correct
- [ ] 🖥️ Webapp: table renders with inline actions

---

## 🔗 References

- **Backlog:** AP-018
- RF-48
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
