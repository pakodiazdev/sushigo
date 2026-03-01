# 🕓 Task #062: View Schedule History

## 📖 Story

**English:**
As an Admin, I want to see the history of all schedules an employee has had, so I can audit shift changes over time.

**Español:**
Como Admin, quiero ver el historial de todos los horarios que ha tenido un empleado, para auditar los cambios de turno a lo largo del tiempo.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/employment-periods/{id}/schedules` — ListSchedulesController
- [ ] 🔧 Returns all schedules ordered by `effective_from` desc; each includes its 7 ScheduleDays
- [ ] 🧪 Feature tests: multiple schedules, empty list

## ✅ Frontend Tasks

- [ ] 📱 **History section** below Current Schedule panel (from #056) — collapsible list of past schedules
- [ ] 📝 Add `getScheduleHistory(periodId)` to `src/services/schedule.service.ts`
- [ ] 📱 Each history item shows: name, effective_from → effective_to, workday_type badge, expandable 7-day grid

---

## 🎯 Acceptance Criteria

- [ ] Past schedules appear listed with their effective date ranges
- [ ] Each past schedule can be expanded to see its 7-day detail
- [ ] Active schedule is not shown in history (already shown in Current Schedule panel)

---

## 🔗 References

- **Backlog:** AP-010 · RF-09

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
