# 🔨 Task #264: Nest personal data under `user` in Employee API responses

## 📖 Story

**English:**
As an API consumer, I want `EmployeeResource`/`EmployeeSummaryResource` responses to nest personal data (`first_name`, `last_name`, `email`, `phone`, `phone_country`) under a `user` key, so the response honestly reflects that `Employee` doesn't own that data — `User` does.

**Español:**
Como consumidor de la API, quiero que las respuestas de `EmployeeResource`/`EmployeeSummaryResource` aniden los datos personales (`first_name`, `last_name`, `email`, `phone`, `phone_country`) bajo una clave `user`, para que la respuesta refleje honestamente que `Employee` no es dueño de esos datos — `User` sí.

---

## ✅ Backend Tasks

- [x] 🔨 `EmployeeResource` — nest `first_name/last_name/email/phone/phone_country` under `user` object, update Swagger schema
- [x] 🔨 `EmployeeSummaryResource` — nest `first_name/last_name` under `user` object, update Swagger schema
- [x] 🧪 Update `EmployeeCrudTest`, `EmploymentPeriodApiTest`, `TodayAttendanceApiTest` assertions to the new nested shape

## ✅ Frontend Tasks

- [x] 📝 `Employee` type (`src/types/employee.ts`) — nest personal fields under `user`
- [x] 📝 `TodayAttendanceEmployee` type (`src/types/attendance.ts`) — nest under `user`
- [x] 📝 `ManualOvertimeMovementEmployee` / `RegisterVacationRequestEmployee` local shapes — nest under `user`
- [x] 🔨 Update ~16 consumer components/pages reading `employee.first_name` etc. directly to read `employee.user.first_name`
- [x] 🧪 Update affected Vitest specs (`employee-detail-view`, `ManualOvertimeMovementDialog`, `RegisterVacationRequestDialog`, `employee-hooks`)

---

## 🎯 Acceptance Criteria

- [x] `EmployeeResource`/`EmployeeSummaryResource` nest first_name/last_name/email/phone/phone_country under a `user` key
- [x] All frontend consumers and their tests updated to the new nested shape — no code reads `employee.first_name` etc. directly anymore
- [x] TypeScript types updated to match

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

## 📊 Retrospective
- **Actual total:** 1h 42m (102 min)
- **vs optimistic:** −1h 18m
- **vs pessimistic:** −4h 18m

**Justification:**

The change was mechanically traceable: two backend resources plus a fixed, greppable set of frontend call sites reading the flattened fields. Most of the time went into exhaustively locating every consumer (components, hooks, local prop-shape types, and test fixtures) via targeted grep sweeps and `tsc --noEmit` rather than into design decisions — the nesting shape itself was a direct translation of the issue's proposal. No unplanned rework was needed within the tracked session; the estimate padding (3h–6h) assumed more hidden call sites or ambiguity in the target shape than were actually present.
