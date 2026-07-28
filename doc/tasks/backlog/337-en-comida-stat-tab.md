# ✨ Task #337: Add "En comida" Stat Tab for Employees at Lunch on Attendance Today

## 📖 Story

**English:**
As a Manager, I need a dedicated "En comida" stat tab on the Attendance/Today screen, so that I can quickly see which employees are currently out at lunch, separate from employees who are actively checked in and working.

**Español:**
Como Manager, necesito una pestaña de estadística "En comida" dedicada en la pantalla de Asistencia/Hoy, para poder ver rápidamente qué empleados están actualmente en su hora de comida, separado de los empleados que están activamente trabajando.

---

## 🧠 Context

Deferred from #327 / PR #336 (which added the "Ausentes" stat tab and made all stat cards clickable filters over the main grid).

Currently, `computeSummary()` (`code/webapp/src/pages/attendance/-use-today-attendance-page.ts`) lumps three distinct `AttendancePhase` values — `checked-in`, `at-lunch`, and `returned` — into a single `checkedIn` bucket / "En trabajo" tab. There's no way to see, at a glance, how many employees are currently at lunch vs. actively working.

---

## ✅ Technical Tasks

- [ ] 🔧 Add an `atLunch` count to `AttendanceSummary` / `computeSummary()`, splitting the `at-lunch` phase out of the `checkedIn` bucket
- [ ] 📱 Add a 6th `SummaryStat` "En comida" tab to `AttendanceSummaryBar.tsx`, adjusting the stat grid layout so 6 cards lay out evenly
- [ ] 📱 Wire "En comida" into the tab-filter behavior introduced in #327/#336 (clicking it filters the main grid to only `at-lunch` employees)
- [ ] 🧪 Extend Vitest coverage for the new bucket and tab filter
- [ ] 🧪 Cypress coverage for the new tab

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** `0h`

### 📅 Sessions
```json
[]
```

---

## 🔗 References

- GitHub issue: [#337](https://github.com/pakodiazdev/sushigo/issues/337)
- Follows up on #327 / PR #336
