# 🌐 Task #071: Schedule History API

## 📖 Story

**English:**
As an Admin, I want to view the schedule history for an employment period.

**Español:**
Como Admin, quiero ver el historial de horarios de un periodo laboral.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/employment-periods/{id}/schedules` — ListSchedulesController
- [ ] 🔧 Each schedule includes its 7 days, ordered by effective_from desc
- [ ] 🧪 Feature test

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Schedule History List** (in Employee Detail → Schedules tab) — ordered list: name, effective_from, effective_to, workday_type badge; current schedule highlighted
- [ ] 📱 **Expand to View Days** — click to show 7-day grid read-only for historical schedule
- [ ] 📱 Hook: `useScheduleHistory(periodId)` — query
- [ ] 🧪 E2E test: view schedule history, expand old schedule

---

## 🎯 Acceptance Criteria

- [ ] History ordered descending

---

## 🔗 References

- **Backlog:** AP-010
- RF-09
- domain-model.md §2.3

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
