# 🔨 Task #264: Nest personal data under `user` in Employee API responses

## 📖 Story

**English:**
As an API consumer, I want `EmployeeResource`/`EmployeeSummaryResource` responses to nest personal data (`first_name`, `last_name`, `email`, `phone`, `phone_country`) under a `user` key, so the response honestly reflects that `Employee` doesn't own that data — `User` does.

**Español:**
Como consumidor de la API, quiero que las respuestas de `EmployeeResource`/`EmployeeSummaryResource` aniden los datos personales (`first_name`, `last_name`, `email`, `phone`, `phone_country`) bajo una clave `user`, para que la respuesta refleje honestamente que `Employee` no es dueño de esos datos — `User` sí.

---

## ✅ Backend Tasks

- [ ] 🔨 `EmployeeResource` — nest `first_name/last_name/email/phone/phone_country` under `user` object, update Swagger schema
- [ ] 🔨 `EmployeeSummaryResource` — nest `first_name/last_name` under `user` object, update Swagger schema
- [ ] 🧪 Update `EmployeeCrudTest`, `EmploymentPeriodApiTest`, `TodayAttendanceApiTest` assertions to the new nested shape

## ✅ Frontend Tasks

- [ ] 📝 `Employee` type (`src/types/employee.ts`) — nest personal fields under `user`
- [ ] 📝 `TodayAttendanceEmployee` type (`src/types/attendance.ts`) — nest under `user`
- [ ] 📝 `ManualOvertimeMovementEmployee` / `RegisterVacationRequestEmployee` local shapes — nest under `user`
- [ ] 🔨 Update ~16 consumer components/pages reading `employee.first_name` etc. directly to read `employee.user.first_name`
- [ ] 🧪 Update affected Vitest specs (`employee-detail-view`, `ManualOvertimeMovementDialog`, `RegisterVacationRequestDialog`, `employee-hooks`)

---

## 🎯 Acceptance Criteria

- [ ] `EmployeeResource`/`EmployeeSummaryResource` nest first_name/last_name/email/phone/phone_country under a `user` key
- [ ] All frontend consumers and their tests updated to the new nested shape — no code reads `employee.first_name` etc. directly anymore
- [ ] TypeScript types updated to match

## 🚫 Explicitly Out of Scope

- `PayPeriodEmployeeResource` has the same flattening pattern but is not named in the issue's acceptance criteria — left untouched (decision confirmed with user).
- Request payloads (`EmployeeFormData`, `EmployeeUpdateData`, `StoreEmployeeRequest`, `UpdateEmployeeRequest`) stay flat — this issue only changes response shape.

---

## 🔗 References

- Follow-up to #86 (`doc/tasks/2026-07/086-unify-employee-user-name.md`)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `~1h42m`

### 📅 Sessions
```json
[
  { "date": "2026-07-20", "start": "22:07", "end": "23:49" }
]
```
