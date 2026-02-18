# 🌐 Task #020: EmploymentPeriod API

## 📖 Story

**English:**
As an Admin, I want to register and query employment periods for an employee, to control hires, terminations, and re-hires.

**Español:**
Como Admin, quiero registrar y consultar periodos laborales de un empleado, para controlar altas, bajas y reingresos.

---

## ✅ Technical Tasks

### 🔧 Backend

- [x] 🌐 `PATCH /api/v1/employees/{id}/deactivate` — DeactivateEmployeeController (closes active period + marks employee inactive)
- [x] 🌐 `PATCH /api/v1/employees/{id}/rehire` — RehireEmployeeController (creates new active period)
- [x] 🌐 `PATCH /api/v1/employment-periods/{id}/terminate` — TerminateEmploymentPeriodController (closes period with reason)
- [x] 📝 DeactivateEmployeeRequest — end_date, termination_reason required
- [x] 📝 RehireEmployeeRequest — start_date, branch_id required  
- [x] 📝 TerminateEmploymentPeriodRequest — end_date, termination_reason required
- [x] 🧪 Feature tests: EmploymentPeriodApiTest (408 lines) covering deactivate, rehire, terminate, validations
- [x] 🔧 Enhanced ToggleEmployeeActiveController to show active periods count
- [x] 🔧 ShowEmployeeController eager-loads employment periods with user.roles

### 🖥️ Frontend Tasks (webapp)

- [x] 📱 **EmployeeDetailView** — tabbed interface (General, Employment Periods) with deactivate/rehire actions
- [x] 📱 **EmploymentPeriodsSection** — timeline showing all periods with active/terminated badges
- [x] 📱 **EmploymentPeriodCard** — card component displaying period info (start, end, branch, reason)
- [x] 📱 **ConfirmDialog** — reusable confirmation modal for destructive actions
- [x] 📱 Hooks: `useDeactivateEmployee()`, `useRehireEmployee()`, `useToggleEmployeeActive()`
- [x] 🎨 Major refactor of EmployeeForm to support detail view + edit modes (panel modes)
- [x] 🎨 Enhanced SlidePanel with panel modes (detail/edit/create)
- [x] 🎨 Added visual styling for employment periods section

---

## 🎯 Acceptance Criteria

- [x] Only one active period per employee (enforced in model + validated in API)
- [x] Deactivate requires end_date and termination_reason
- [x] Rehire creates new active period with validations
- [x] Employment periods displayed in timeline with active/terminated badges
- [x] Confirm dialogs for destructive actions (deactivate)
- [x] Detail view shows employee info + employment history
- [x] Toggle active button integrated in form

---

## 🔗 References

- **Backlog:** AP-004
- RF-05, RF-06, RF-07
- domain-model.md §2.2

---

## 🎯 Commits

- `96d066f` ✨ [#020] - Implement Employment Periods API and employee lifecycle management 🔄

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** `~6h`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-16 to 2026-02-18",
    "duration": "~6h",
    "commit": "96d066f",
    "summary": "Employment Periods API (deactivate, rehire, terminate controllers + requests), comprehensive API tests (408 lines), EmployeeDetailView component with tabs, EmploymentPeriodCard, EmploymentPeriodsSection, ConfirmDialog, major EmployeeForm refactor for detail/edit modes, SlidePanel enhancements, employee lifecycle hooks"
  }
]
