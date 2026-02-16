# 🌐 Task #016: Employee CRUD API

## 📖 Story

**English:**
As an Admin, I want to create, list, view, update, and deactivate employees via API, to manage the workforce.

**Español:**
Como Admin, quiero crear, listar, ver, actualizar y desactivar empleados vía API, para gestionar la plantilla.

---

## ✅ Technical Tasks

- [x] 🌐 `POST /api/v1/employees` — CreateEmployeeController + StoreEmployeeRequest (validate code unique, role in enum, first_name/last_name required)
- [x] 🌐 `GET /api/v1/employees` — ListEmployeesController (filters: is_active, role; pagination)
- [x] 🌐 `GET /api/v1/employees/{id}` — ShowEmployeeController (ULID binding, eager load user + roles)
- [x] 🌐 `PUT /api/v1/employees/{id}` — UpdateEmployeeController + UpdateEmployeeRequest
- [x] 🌐 `PATCH /api/v1/employees/{id}/toggle-active` — ToggleEmployeeActiveController
- [x] 🔐 Add permission: employees.view, employees.create, employees.update
- [x] 📝 Add OpenAPI/Swagger annotations to controllers and requests
- [x] 🧪 Feature tests: CRUD happy paths, validation errors (duplicate code, invalid role), toggle active, unauthorized access

### 🖥️ Frontend Tasks (webapp)

- [x] 📱 **Employee List Page** — table with columns: code, name, roles, active status; filters by role and active; pagination; search by name; multi-column sorting
- [x] 📱 **Create Employee Page/Modal** — SlidePanel form: first_name, last_name, code, roles (multi-select), email, phone; validation errors display; success toast
- [ ] 📱 **Employee Detail Page** — header (name, code, role badge, active status), tabs: General, Employment Periods (#020), Wages (#021), Schedules (#023), Overtime Config (#048)
- [x] 📱 **Edit Employee Modal** — pre-filled SlidePanel for updatable fields (first_name, last_name, roles, email, phone, meta)
- [x] 📱 **Toggle Active Button** — integrated in form, optimistic update, success toast
- [x] 📱 **Employee search/filter hooks** — `useEmployees(filters)`, `useEmployee(id)`, `useCreateEmployee()`, `useUpdateEmployee()`, `useToggleEmployee()`, `useEmployeesSearch()`
- [ ] 🧪 E2E test: create employee, verify in list, view detail, edit, toggle active

---

## 🎯 Acceptance Criteria

- [x] All 5 endpoints respond correctly
- [x] ULIDs used for external IDs (public_id)
- [x] Pagination works
- [x] Validation rejects invalid data
- [x] 🖥️ Employee list renders with pagination and filters
- [x] 🖥️ Create form validates and shows API errors
- [ ] 🖥️ Detail page loads with tabs

---

## Commits

- `1b836fe` ✨ [#016] - Employee CRUD API, frontend, and ULID public identifiers 👷
- `23b05c8` 🔨 [#016] ! - Migrate employee roles from enum to Spatie multi-role system 👥
- `b11bc5d` 🔨 [#016] - Refactor repositories, employee form (react-hook-form), and code review fixes 🧹

---

## References

- **Backlog:** AP-002
- RF-01, RF-02
- domain-model.md §2.1

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `4h`
- **Pessimistic:** `6h`
- **Tracked:** `~11h`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-10",
    "duration": "~5h",
    "commit": "1b836fe",
    "summary": "Employee CRUD API (5 controllers, requests, tests), frontend (list page, form, hooks), ULID public identifiers, migrations, seeders, factories"
  },
  {
    "date": "2026-02-13",
    "duration": "~2.5h",
    "commit": "23b05c8",
    "summary": "Migrate employee roles from enum column to Spatie multi-role system, update seeders, update factory, update controllers/requests"
  },
  {
    "date": "2026-02-16",
    "duration": "~3h",
    "commit": "b11bc5d",
    "summary": "Refactor repository pattern (BaseRepository), employee form to react-hook-form, extract columns/filters/search into components, add HandlesSortableRequest trait, add UpdateEmployeeContactTest, remove unused migrations, add conventions docs"
  },
  {
    "date": "2026-02-17",
    "duration": "~0.5h",
    "commit": null,
    "summary": "Code review verification: confirm putJson/public_id usage in tests, fix duplicate onClose() in EmployeeForm, typecheck pass"
  }
]
```
