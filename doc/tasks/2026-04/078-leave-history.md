# 📋 Task #078: Leave History — Employee Detail Tab

**Status:** ✅ Completado
**PR:** [#99](https://github.com/pakodiazdev/sushigo/pull/99)
**Branch:** `feature/078-leave-history`

## 📖 Story

**English:**
As a Manager, I want to view an employee's full absence history from their detail page — with filters by status and date range — so I can review all registered leaves, their pay impact, and who registered them.

**Español:**
Como Manager, quiero ver el historial completo de ausencias de un empleado desde su página de detalle — con filtros por estado y rango de fechas — para revisar todas las ausencias registradas, su impacto en nómina y quién las registró.

---

## ✅ Backend Tasks

- [x] 🌐 `GET /api/v1/employees/{id}/leaves` — `ListEmployeeLeavesController`
  - Filters: `status`, `date_from`, `date_to`, `leave_type_id`
  - Pagination (15 per page)
  - Response per item: `id`, `leave_type` (code, name, calculation_mode), `start_date`, `end_date`, `resolved_pay_percentage`, `rest_day_factor`, `time_mode`, `scheduled_start_time`, `scheduled_end_time`, `actual_start_time`, `actual_end_time`, `actual_duration_minutes`, `status`, `requested_by` (name), `approved_by` (name nullable), `approved_at`, `notes`
- [x] 🔧 `LeaveResource` (if not done in #077) with all fields above
- [x] 🧪 Feature tests: 13 tests, 59 assertions — list by employee, filter by status, filter by date range, filter by leave type, pagination, unauthorized access

---

## ✅ Frontend Tasks

- [x] 📝 Add `getEmployeeLeaves(employeeId, filters)` to `src/services/leave-api.ts`
- [x] 📱 **LeaveSummarySection** in Employee slide panel — monthly badges + last 3 leaves
- [x] 📱 **FullHistoryDialog** — full leaves table with columns:
  - Fecha(s): date range or single date
  - Tipo: leave type badge (shows `calculation_mode` indicator)
  - Pago: resolved pay % with color (green=100%, yellow=partial, red=0%)
  - Estado: status badge (APPROVED / CANCELLED / PENDING / REJECTED)
  - Para `PROPORTIONAL_HOURS`: show scheduled and actual times, duration
- [x] 📱 Filter bar inside dialog: status selector + leave type selector
- [x] 📱 **"Registrar ausencia" button** at top of section → opens same form as Today view (#077) but pre-scoped to this employee
- [x] 🔧 `useLeaveSummarySection(employeeId)` hook — manages summary, dialog state, filters, pagination
- [x] 🗑️ Deleted dedicated employee detail page (`/attendance/employees/$employeeId/`) and 6 associated files — leave history now lives in the employee slide panel

---

## 🧪 Tests

- [x] ✅ PHPUnit: 13 tests, 59 assertions — all passing
- [x] ✅ Vitest: `useLeaveSummarySection` hook (12 tests) + `leaveApi.listEmployeeLeaves` (3 tests) + `LeaveSummarySection` component (8 tests)
- [x] 🌲 Cypress E2E: `attendance-leave-history.cy.ts` — register leave → open employee panel → verify summary section → open full history dialog → apply status filter → close dialog

---

## 🎯 Acceptance Criteria

- [x] LeaveSummarySection shows monthly badges and last 3 leaves with pay info
- [x] FullHistoryDialog shows all leaves with pay % clearly indicated
- [x] PROPORTIONAL_HOURS leaves show time details and actual duration
- [x] Filters work independently and in combination
- [x] "Registrar ausencia" button from the panel pre-fills the employee
- [x] Orphaned employee detail page deleted; route tree regenerated

---

## 🔗 References

- **Backlog:** AP-051 · RF-25, RF-25a

---

## ⏱️ Sessions

```json
[
  { "date": "2026-04-10", "start": "16:00", "end": "17:00" },
  { "date": "2026-04-10", "start": "19:00", "end": "20:00" },
  { "date": "2026-04-10", "start": "23:00", "end": "24:00" }
]
```

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
