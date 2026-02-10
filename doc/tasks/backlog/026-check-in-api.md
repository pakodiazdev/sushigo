# ⏰ Task #026: Register Check-in API

## 📖 Story

**English:**
As a Manager, I want to register an employee's arrival time, so the system auto-calculates their lateness.

**Español:**
Como Manager, quiero registrar la hora de entrada de un empleado, para que el sistema calcule automáticamente su tardanza.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/attendances/check-in` — RegisterCheckInController
- [ ] 📝 CheckInRequest — employee_id (required, exists), check_in (required, datetime)
- [ ] 🔧 Service logic (AttendanceService::registerCheckIn): fetch current schedule → get ScheduleDay for check_in's day_of_week → calculate entry_late_seconds = max(0, check_in − expected_start) in seconds → create Attendance with day_status = WORKED
- [ ] 🔧 Return 422 if employee already has attendance for that date
- [ ] 🔧 Return 422 if no current schedule found
- [ ] 🔧 Response includes: entry_late_seconds, is_deductible (> 1800)
- [ ] 🧪 Feature tests: on-time check-in (late=0), late <30min, late >30min (deductible), duplicate date (422), no schedule (422)

### 📱 Frontend Tasks (mobile)

- [ ] 📱 **Check-in Action Button** — in employee card on Today Attendance screen; shows current time; tap opens confirmation
- [ ] 📱 **Check-in Confirmation** — modal showing employee name, current time, scheduled start time; confirm/cancel buttons
- [ ] 📱 **Late Indicator** — after check-in, show late minutes and deductible badge (> 30 min) in employee card
- [ ] 📱 **Error Handling** — display 422 errors: "Ya tiene asistencia para hoy" (duplicate), "No tiene horario asignado" (no schedule)
- [ ] 📱 Hook: `useCheckIn()` — mutation with optimistic update of today attendance list
- [ ] 🧪 Test: tap check-in, confirm, verify card updates with check-in time

---

## 🎯 Acceptance Criteria

- [ ] Lateness calculated in seconds against schedule
- [ ] > 30 min flagged as deductible
- [ ] Duplicate date rejected
- [ ] 📱 Check-in button disabled after check-in
- [ ] 📱 Late badge appears when entry_late_seconds > 0
- [ ] 📱 Error messages display correctly

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
