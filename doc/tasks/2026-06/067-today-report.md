# 📊 Task #067: View Today's Operational Report

## 📖 Story

**English:**
As a Manager, I want a consolidated view of today's attendance showing each employee's status, tardiness, and overtime flags, so I can quickly assess the operational situation without opening individual records.

**Español:**
Como Manager, quiero una vista consolidada de la asistencia del día con el estado de cada empleado, sus tardanzas e indicadores de horas extra, para evaluar rápidamente la situación operativa sin abrir registros individuales.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/reports/today?branch_id=` — TodayReportController
- [ ] 🔧 Per employee: name, code, role, status (arrived/not_arrived/late/day_off/on_leave), check_in_time, late_minutes, has_overtime, overtime_authorized
- [ ] 🔧 Summary totals: total_employees, arrived, not_arrived, late_count
- [ ] 🧪 Feature tests: mixed statuses, empty branch

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/reports/today.tsx`
- [ ] 🔧 `getTodayReport(branchId)` in `src/services/report.service.ts`
- [ ] 📱 **Today report page** — summary cards at top (total / arrived / not arrived / late); employee table below
- [ ] 📱 **Status badge per employee** — color-coded: verde "A tiempo", amarillo "Tardanza X min", rojo "No registrado", gris "Descanso/Permiso"
- [ ] 📱 Overtime indicator column — flag icon when employee has overtime pending decision
- [ ] 🔧 `useTodayReport(branchId)` hook — auto-refresh every 2 minutes

---

## 🎯 Acceptance Criteria

- [ ] Manager sees all active branch employees with their current status
- [ ] Summary cards reflect accurate totals
- [ ] Page refreshes automatically to reflect new check-ins without manual reload

---

## 🔗 References

- **Backlog:** AP-059 · RF-48

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `12h 34m`

### 📅 Sessions
```json
[
  { "date": "2026-06-14", "start": "00:08", "end": "02:17" },
  { "date": "2026-06-14", "start": "10:06", "end": "15:46" },
  { "date": "2026-06-14", "start": "16:05", "end": "20:13" },
  { "date": "2026-06-15", "start": "01:43", "end": "02:00" },
  { "date": "2026-06-15", "start": "10:55", "end": "11:15" }
]
```

## 📊 Desviación
- **Actual total:** 12h 34m (129 min + 340 min + 248 min + 17 min + 20 min)
- **vs optimistic:** +9h 34m
- **vs pessimistic:** +7h 34m

**Justification:**

The endpoint and basic page were ready within the optimistic estimate. The overrun is explained by four factors not contemplated in the original scope:

1. **PR review iterations (≈6h):** Multiple rounds of feedback were received — four Copilot observations (fix `late_minutes`, Carbon cast redundancy, TypeScript type comment, Cypress hydration race condition) and four author observations (extract logic to `TodayReportService`, query to `EmployeeRepository`, response formatting to `TodayReportResponse`, move Swagger `@OA\Schema` to the response class, extract sub-components to independent files). Each round required implementation, lint, commit and re-push.

2. **`rest_day` status not contemplated in original scope (≈1h):** During manual testing, employees with a scheduled day off (`ScheduleDay.is_day_off = true`) appeared as "not_arrived" instead of "rest_day". Fixing this required eager-loading the `EmploymentPeriod → EmployeeSchedule (effective scope) → ScheduleDay` chain filtered by the ISO day of week.

3. **SonarCloud quality gate (≈1h):** The gate failed on coverage and code smells in both webapp and api, requiring a dedicated review and fix session before the PR review could continue.

4. **E2E spec with deterministic seeder for all 6 statuses (≈1h):** Building `TodayReportStatusSeeder` with deterministic employees for each status and debugging a Cypress `scrollIntoView` failure for rows below the viewport fold took longer than a standard E2E spec.
