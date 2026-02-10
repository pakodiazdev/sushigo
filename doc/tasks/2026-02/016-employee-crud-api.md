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

---

## 🎯 Acceptance Criteria

- [ ] All 5 endpoints respond correctly
- [ ] Hashids used for external IDs
- [ ] Pagination works
- [ ] Validation rejects invalid data

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
