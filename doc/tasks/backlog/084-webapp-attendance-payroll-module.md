````markdown
# 🖥️ Task #084: Webapp — Attendance-Payroll Module Setup

## 📖 Story

**English:**
As a developer, I need to set up the attendance-payroll module structure in the existing webapp (React + Vite + TanStack Router), including routes, navigation entries, shared types, API services, and reusable components, so the team can build admin/management screens efficiently.

**Español:**
Como desarrollador, necesito configurar la estructura del módulo attendance-payroll en la webapp existente (React + Vite + TanStack Router), incluyendo rutas, entradas de navegación, tipos compartidos, servicios API y componentes reutilizables, para que el equipo pueda construir las pantallas de admin/gestión eficientemente.

---

## ✅ Technical Tasks

### Phase 1: Routes & Navigation

- [ ] 📂 Create route group `src/routes/attendance-payroll/` with layout file
- [ ] 📂 Create sub-routes: `employees/`, `schedules/`, `attendance/`, `payroll/`, `config/`, `reports/`
- [ ] 🔧 Add "Asistencia y Nómina" section to sidebar navigation with sub-items:
    - Empleados, Horarios, Asistencia del día, Reportes, Cierre semanal, Configuración
- [ ] 🔧 Apply permission-based visibility (`employees.view`, `employees.create`, etc.)

### Phase 2: Shared Types

- [ ] 📝 Create `src/types/attendance-payroll.ts`:
    - `Employee`, `EmployeeRole`, `EmploymentPeriod`, `WageHistory`
    - `EmployeeSchedule`, `ScheduleDay`, `WorkdayType`
    - `Attendance`, `DayStatus`, `PartialLeave`
    - `PayPeriod`, `PayPeriodEmployee`, `PayPeriodLine`
    - `PunctualityRange`, `BonusGroup`, `OvertimePayConfig`
    - `NegotiatedExtraDay`, `Leave`, `LeaveType`, `Holiday`
    - `VacationEntitlement`, `VacationRequest`
    - `OvertimeBankMovement`

### Phase 3: API Services

- [ ] 🔧 Create `src/services/employee.service.ts` — CRUD + toggle active
- [ ] 🔧 Create `src/services/employment-period.service.ts` — create, terminate, list
- [ ] 🔧 Create `src/services/wage-history.service.ts` — register, list
- [ ] 🔧 Create `src/services/schedule.service.ts` — create, current, history, update
- [ ] 🔧 Create `src/services/attendance.service.ts` — today view, check-in/out, day-status
- [ ] 🔧 Create `src/services/partial-leave.service.ts` — register, list
- [ ] 🔧 Create `src/services/leave.service.ts` — register, approve, reject, list
- [ ] 🔧 Create `src/services/payroll.service.ts` — preview, close, query, reopen
- [ ] 🔧 Create `src/services/report.service.ts` — today report, weekly summary
- [ ] 🔧 Create `src/services/config.service.ts` — punctuality, overtime, bonus, holidays
- [ ] 🔧 Create `src/services/overtime.service.ts` — balance, movements, manual
- [ ] 🔧 Create `src/services/extra-day.service.ts` — register, list
- [ ] 🔧 Create `src/services/vacation.service.ts` — entitlements, requests

### Phase 4: Reusable Components

- [ ] 🔧 Create `<EmployeeCard>` — code, name, role badge, active status
- [ ] 🔧 Create `<StatusBadge>` — variant per DayStatus enum
- [ ] 🔧 Create `<ScheduleGrid>` — 7-day schedule table (reusable for create/edit/view)
- [ ] 🔧 Create `<DateRangePicker>` — for reports and period selection
- [ ] 🔧 Create `<ConfirmDialog>` — for destructive/important actions
- [ ] 🔧 Create `<DataTable>` — sortable, filterable table for lists
- [ ] 🔧 Create `<FormField>` — label + input + validation error wrapper
- [ ] 🔧 Create `<TimeInput>` — time picker for schedule times

### Phase 5: Hooks

- [ ] 🔧 Create `useEmployees()` — list with filters (TanStack Query)
- [ ] 🔧 Create `useEmployee(id)` — detail with eager loaded relations
- [ ] 🔧 Create `useTodayAttendance(branchId)` — polling/refetch for live view
- [ ] 🔧 Create `usePayPeriods(branchId)` — list with status filter
- [ ] 🔧 Create standard mutation hooks per service (create, update, delete patterns)

### Phase 6: Validation

- [ ] 🧪 Verify: `npm run typecheck` passes
- [ ] 🧪 Verify: routes render with empty placeholder pages
- [ ] 🧪 Verify: navigation shows/hides based on permissions

---

## 🎯 Acceptance Criteria

- [ ] Module route group configured with nested routes
- [ ] Navigation entries visible for authorized users
- [ ] Types mirror API response shapes
- [ ] API services cover all attendance-payroll endpoints
- [ ] Shared components render correctly in isolation
- [ ] `typecheck` passes

---

## 🔗 References

- **Depends on:** Task #014 (auth consolidation, completed)
- **Existing patterns:** `src/services/`, `src/types/`, `src/routes/inventory/`
- **Tasks that consume this:** #016-frontend, #020-frontend, etc.

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `6h`
- **Pessimistic:** `10h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
````
