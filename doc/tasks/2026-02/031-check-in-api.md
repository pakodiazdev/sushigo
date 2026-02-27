# ⏰ Task #031: Register Check-in API

## 📖 Story

**English:**
As a Manager, I want to register an employee's arrival time, so the system auto-calculates their lateness.

**Español:**
Como Manager, quiero registrar la hora de entrada de un empleado, para que el sistema calcule automáticamente su tardanza.

---

## ✅ Technical Tasks

- [x] 🌐 `POST /api/v1/attendances/check-in` — RegisterCheckInController (SAC)
- [x] 📝 CheckInRequest — employee_id (required, exists:employees,public_id), check_in (required, date_format:Y-m-d\TH:i:s)
- [x] 🔧 RegisterCheckInAction: resolve employee → guard duplicate → find active period → find active schedule → find ScheduleDay → guard day_off → calculate entry_late_seconds = max(0, checkIn − expected_start) → create Attendance with day_status = WORKED
- [x] 🔧 Return 422 if employee already has attendance for that date (field: check_in)
- [x] 🔧 Return 422 if no active employment period (field: employee_id)
- [x] 🔧 Return 422 if no active schedule (field: employee_id)
- [x] 🔧 Return 422 if no ScheduleDay configured for that day_of_week (field: check_in)
- [x] 🔧 Return 422 if ScheduleDay is day_off (field: check_in)
- [x] 🔧 Response includes: entry_late_seconds, entry_late_minutes, is_entry_deductible (> 1800 seconds)
- [x] 🔧 Added public_id (ULID) to Attendance model via migration 000004 + HasPublicId trait
- [x] 🔧 Added toApiArray() to Attendance model
- [x] 🔧 AttendanceResponse OA Schema stub (Swagger)
- [x] 🧪 Feature tests: on-time (0 sec), late <30min, late >30min (deductible=true), early arrival (0 sec), duplicate date (422), no period (422), no schedule (422), no ScheduleDay (422), day_off (422), response structure, unauthenticated (401) — 11 tests ✅

### 📱 Frontend Tasks (mobile) — PENDING (future task)

- [ ] 📱 **Check-in Action Button** — in employee card on Today Attendance screen
- [ ] 📱 **Check-in Confirmation Modal**
- [ ] 📱 **Late Indicator**
- [ ] 📱 **Error Handling**
- [ ] 📱 Hook: `useCheckIn()`

---

## 🎯 Acceptance Criteria

- [x] Lateness calculated in seconds against schedule
- [x] > 30 min flagged as deductible (strictly > 1800 seconds)
- [x] Duplicate date rejected with 422
- [ ] 📱 Check-in button disabled after check-in (frontend pending)
- [ ] 📱 Late badge appears when entry_late_seconds > 0 (frontend pending)
- [ ] 📱 Error messages display correctly (frontend pending)

---

## 🔗 References

- **Backlog:** AP-013
- RF-11, RF-13, RF-15a
- domain-model.md §2.7, sequence §6.1

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
