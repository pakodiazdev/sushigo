# 📋 Task #078: Leave History — Employee Detail Tab

## 📖 Story

**English:**
As a Manager, I want to view an employee's full absence history from their detail page — with filters by status and date range — so I can review all registered leaves, their pay impact, and who registered them.

**Español:**
Como Manager, quiero ver el historial completo de ausencias de un empleado desde su página de detalle — con filtros por estado y rango de fechas — para revisar todas las ausencias registradas, su impacto en nómina y quién las registró.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/employees/{id}/leaves` — `ListEmployeeLeavesController`
  - Filters: `status`, `date_from`, `date_to`, `leave_type_id`
  - Pagination (15 per page)
  - Response per item: `id`, `leave_type` (code, name, calculation_mode), `start_date`, `end_date`, `resolved_pay_percentage`, `rest_day_factor`, `time_mode`, `scheduled_start_time`, `scheduled_end_time`, `actual_start_time`, `actual_end_time`, `actual_duration_minutes`, `status`, `requested_by` (name), `approved_by` (name nullable), `approved_at`, `notes`
- [ ] 🔧 `LeaveResource` (if not done in #077) with all fields above
- [ ] 🧪 Feature tests: list by employee, filter by status, filter by date range, filter by leave type, pagination, unauthorized access

---

## ✅ Frontend Tasks

- [ ] 📝 Add `getEmployeeLeaves(employeeId, filters)` to `src/services/leave.service.ts`
- [ ] 📱 **"Ausencias" tab** in Employee Detail page
- [ ] 📱 **Leaves table** — columns:
  - Fecha(s): date range or single date
  - Tipo: leave type badge (shows `calculation_mode` indicator)
  - Pago: resolved pay % with color (green=100%, yellow=partial, red=0%)
  - Descanso: rest_day_factor badge (FULL / PROPORCIONAL / SIN IMPACTO)
  - Para `PROPORTIONAL_HOURS`: show scheduled and actual times, duration
  - Estado: status badge (APPROVED / CANCELLED)
  - Registrado por: name
- [ ] 📱 Filter bar: status selector, date range picker, leave type selector
- [ ] 📱 **"Registrar ausencia" button** at top of tab → opens same form as Today view (#077) but pre-scoped to this employee
- [ ] 🔧 `useEmployeeLeaves(employeeId)` hook — manages filters, pagination, query

---

## 🧪 Tests

- [ ] ✅ PHPUnit: all backend feature tests listed above
- [ ] ✅ Vitest: `useEmployeeLeaves` — filter changes trigger new query, pagination works
- [ ] 🌲 Cypress E2E (happy path): navigate to Employee Detail → Ausencias tab → verify leave registered in #077 appears → apply status filter → verify table updates

---

## 🎯 Acceptance Criteria

- [ ] Ausencias tab shows all leaves with pay % and rest-day factor clearly indicated
- [ ] PROPORTIONAL_HOURS leaves show time details and actual duration
- [ ] Filters work independently and in combination
- [ ] "Registrar ausencia" button from this tab pre-fills the employee

---

## 🔗 References

- **Backlog:** AP-051 · RF-25, RF-25a

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
