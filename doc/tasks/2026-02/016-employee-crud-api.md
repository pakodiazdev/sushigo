# 🌐 Task #016: Employee CRUD API

## 📖 Story

**English:**
As an Admin, I want to create, list, view, update, and deactivate employees via API, to manage the workforce.

**Español:**
Como Admin, quiero crear, listar, ver, actualizar y desactivar empleados vía API, para gestionar la plantilla.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees` — CreateEmployeeController + StoreEmployeeRequest (validate code unique, role in enum, first_name/last_name required)
- [ ] 🌐 `GET /api/v1/employees` — ListEmployeesController (filters: is_active, role; pagination)
- [ ] 🌐 `GET /api/v1/employees/{id}` — ShowEmployeeController (Hashid binding, eager load active period + current wage)
- [ ] 🌐 `PUT /api/v1/employees/{id}` — UpdateEmployeeController + UpdateEmployeeRequest
- [ ] 🌐 `PATCH /api/v1/employees/{id}/toggle-active` — ToggleEmployeeActiveController
- [ ] 🔐 Add permission: employees.view, employees.create, employees.update
- [ ] 📝 Add OpenAPI/Swagger annotations to controllers and requests
- [ ] 🧪 Feature tests: CRUD happy paths, validation errors (duplicate code, invalid role), toggle active, unauthorized access

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Employee List Page** — table with columns: code, name, role, active status; filters by role and active; pagination; search by name
- [ ] 📱 **Create Employee Page/Modal** — form: first_name, last_name, code, role (select), email, phone, password; validation errors display; success toast + redirect to list
- [ ] 📱 **Employee Detail Page** — header (name, code, role badge, active status), tabs: General, Employment Periods (#020), Wages (#021), Schedules (#023), Overtime Config (#048)
- [ ] 📱 **Edit Employee Modal** — pre-filled form for updatable fields (first_name, last_name, role, meta)
- [ ] 📱 **Toggle Active Button** — confirm dialog, optimistic update, success toast
- [ ] 📱 **Employee search/filter hooks** — `useEmployees(filters)`, `useEmployee(hashid)`, `useCreateEmployee()`, `useUpdateEmployee()`, `useToggleEmployee()`
- [ ] 🧪 E2E test: create employee, verify in list, view detail, edit, toggle active

---

## 🎯 Acceptance Criteria

- [ ] All 5 endpoints respond correctly
- [ ] Hashids used for external IDs
- [ ] Pagination works
- [ ] Validation rejects invalid data
- [ ] 🖥️ Employee list renders with pagination and filters
- [ ] 🖥️ Create form validates and shows API errors
- [ ] 🖥️ Detail page loads with tabs

---

## 🔗 References

- **Backlog:** AP-002
- RF-01, RF-02
- domain-model.md §2.1

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `4h`
- **Pessimistic:** `6h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
