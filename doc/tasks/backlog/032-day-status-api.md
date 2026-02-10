# 📝 Task #032: Set Day Status API (day-off / absence)

## 📖 Story

**English:**
As a Manager, I want to mark a day as day-off or absence for an employee, without check-in/out.

**Español:**
Como Manager, quiero marcar un día como descanso o falta para un empleado, sin check-in/out.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/attendances/day-status` — SetDayStatusController
- [ ] 📝 DayStatusRequest — employee_id (required), date (required), day_status (required, in: DAY_OFF, ABSENCE)
- [ ] 🔧 Creates Attendance record with only day_status (no check_in/out)
- [ ] 🔧 Return 422 if attendance already exists for that date
- [ ] 🧪 Feature tests: mark day off, mark absence, duplicate date (422)

### 📱 Frontend Tasks (mobile)

- [ ] 📱 **Day-off/Absence Button** — on employee card when no attendance exists; dropdown or sheet: "Día de descanso" / "Falta"
- [ ] 📱 **Confirmation Modal** — "Marcar [employee] como [day-off/absence] para hoy?"
- [ ] 📱 **Updated Card State** — show day-off icon (🟠) or absence icon (🔴) after marking
- [ ] 📱 Hook: `useSetDayStatus()` — mutation with optimistic update
- [ ] 🧪 Test: mark day-off, verify card updates; attempt duplicate, verify error

---

## 🎯 Acceptance Criteria

- [ ] Attendance created without timestamps
- [ ] Duplicate rejected
- [ ] 📱 Button hidden after status is set
- [ ] 📱 Card shows correct icon per status

---

## 🔗 References

- **Backlog:** AP-019
- RF-16
- domain-model.md §2.7

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
