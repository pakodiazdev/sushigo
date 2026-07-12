# 🔍 Task #084: View Attendance Audit Log

## 📖 Story

**English:**
As an Admin, I want to query the change history of an attendance record or employee, so I can audit all modifications with before/after values, the user who made the change, and their justification.

**Español:**
Como Admin, quiero consultar el historial de cambios de un registro de asistencia o empleado, para auditar todas las modificaciones con valores antes/después, el usuario que hizo el cambio y su justificación.

---

## ✅ Backend Tasks

- [x] 🌐 `GET /api/v1/audit-logs?auditable_type=&auditable_id=` — list changes for a specific record
- [x] 🌐 `GET /api/v1/audit-logs?employee_id=&date_from=&date_to=` — changes by employee and date range
- [x] 🔧 Response: action (CREATE|UPDATE|DELETE), old_values, new_values (diff only), user (name), created_at, reason (nullable)
- [x] 🔧 Pagination (`per_page` + `page`)
- [x] 🔧 Add `Auditable` trait to `App\Models\Employee` — without this, employee-filtered results are always empty
- [x] 🧪 Feature tests: filter by record, filter by employee/range
- [x] 🚀 Index `attendance_audit_logs.created_at` — every list query orders (`latest()`) or range-filters (`date_from`/`date_to`) by it; added after PR review flagged the gap
- [x] 🔨 Move `auditable_type`/`auditable_id`/`employee_id` → model resolution into `ListAuditLogsRequest` accessors (`auditableRecord()`, `employee()`), matching the FormRequest/Controller responsibility convention
- [x] 🔨 Resolve `auditable_type` via an explicit `match` in the FormRequest instead of dynamic `$modelClass::query()`, so an unhandled type fails loudly at one spot instead of as an obscure query error
- [x] 🐛 Keep a terminated (soft-deleted) employee's own audit trail reachable — dropped `whereNull('deleted_at')` from the `employee_id` exists rule, resolve `Employee` via `withTrashed()` in both accessors, and eager-load the `auditable` morphTo with `withTrashed()` (otherwise `auditable_id` resolves to `null` as if the record were gone)

## ✅ Frontend Tasks

- [x] 📂 Create route `src/pages/attendance/audit.tsx` — standalone search page (filters: employee, date range, record)
- [x] 📝 Add `AttendanceAuditLog`, `AuditAction` types to `src/types/attendance-payroll.ts`
- [x] 🔧 `getAuditLogs(filters)` in `src/services/audit.service.ts`
- [x] 🔧 `useAuditLog(filters)` hook
- [x] 📱 **Reusable `AuditLogPanel` component** (table + diff rendering), used in 3 places:
  - `attendance/audit.tsx` — free search, no default filters
  - `employees.tsx` row action → slide-over/dialog pre-filtered by `employee_id` (no new Employee Detail route/tabs)
  - `attendance` index row action → dialog pre-filtered by `auditable_type`/`auditable_id` (shown on any row with an attendance record, not gated on "has edits" — that would require an extra backend flag out of scope here)
- [x] 📱 Table columns: date/time, action badge (CREATE/UPDATE/DELETE), user, changed fields (before → after), reason
- [x] 📱 "Changed fields" renders as a diff: `check_in: 08:15 → 08:05 (reason: Corrección de horario)`
- [x] 📱 Pagination controls in `AuditLogPanel` (prev/next, "Página X de Y · N registros") — the backend paginated from day one, but nothing surfaced page 2+ until PR review caught it
- [x] 🚀 Debounce the free-text employee-ID filter (300ms) in `useAuditLogPage` — otherwise every keystroke fired a request (and a 422 flash on partial ULIDs)
- [x] 🔨 Extract `useAuditLogPage` hook (`employeeId`/`dateFrom`/`dateTo` state + derived filters) out of `audit.tsx`, per the 3+ `useState` custom-hook convention
- [x] 🎨 Unify the Employees list row-action buttons (Ver resumen semanal / Ver detalle / Ver auditoría) to a consistent `outline` variant
- [x] 🌱 `AttendanceAuditLogSeeder` (dev-only) — 5 realistic scenarios (UPDATE check-in/check-out correction, UPDATE status change, CREATE, DELETE) anchored to real `Attendance` rows from `AttendanceHistorySeeder`, dates always relative to `now()` so demo data never goes stale

---

## 🎯 Acceptance Criteria

- [x] Admin can see all changes made to an attendance record with timestamps and users
- [x] Diff shows only the modified fields (not the entire record)
- [x] reason field is shown when present (Admin historical edits from #085)
- [x] A terminated (soft-deleted) employee's own audit history stays reachable — not part of the original criteria text, but a natural reading of "all changes," and confirmed as a real gap during PR review (compliance/dispute review is arguably *more* relevant post-termination than while active)

---

## 🔗 References

- **Backlog:** AP-065, AP-068 · RF-19, RF-50

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `~11h51m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:18", "end": "08:55" },
  { "date": "2026-07-11", "start": "22:45", "end": "23:59" },
  { "date": "2026-07-12", "start": "00:00", "end": "02:20" },
  { "date": "2026-07-12", "start": "12:00", "end": "13:40" }
]
```

---

## 📊 Retrospective

**Estimated:** 2h–3h · **Tracked:** ~11h51m · **Variance:** well over pessimistic (+8h51m)

**Session 1 (2026-07-03, 6h37m) — original implementation:**
- Scope grew beyond the issue text once exploration revealed neither an Employee Detail page nor an attendance record detail page existed yet — required a UX negotiation with the user (resolved as: reusable `AuditLogPanel` + slide-over dialogs from the existing Employee list and Attendance cards, instead of new detail pages) before implementation could start.
- Adding `Auditable` to `Employee` broke 4 pre-existing tests (`AuditableTraitTest`, `AttendanceAuditLogTest`) that implicitly assumed only `Attendance` was audited — required tracing factory `afterCreating` side effects and adding `AttendanceAuditLog::truncate()` calls to fixture setup.
- The dev-lab's shared test database collided repeatedly with concurrent `php artisan test` runs from other active workspaces, causing deadlocks and cross-contaminated assertions — worked around locally, not a repo change.
- What went well: the underlying audit infrastructure (`attendance_audit_logs` table, `AttendanceAuditLog` model, `Auditable` trait) was already built by #027/#029, so the backend was a clean read-layer addition with no migrations needed. `SlidePanel` and the existing action-button patterns were directly reusable. Full regression suites passed clean on the first run after fixing fixture noise; Cypress E2E happy path passed on the first try.

**Sessions 2–3 (2026-07-11/12, ~5h14m) — rebase, hardening, and four rounds of PR review:**
- **61-commit rebase (~40m):** the branch had gone stale against `main` (`payroll.close`, `overtime.manage`, `vacation-requests.*`, and a weekly-summary UI refactor had all landed in the meantime). Conflicts spanned three permission seeders and four webapp files (`employee-columns.tsx`, `employees.tsx`, `attendance/index.tsx`, `attendance-payroll.ts` types) — each required merging *both* sides' additions rather than picking one, since main had added unrelated features in the same lines this branch touched.
- **Stale dev environment after the rebase (~20m):** the running Vite dev server had `routeTree.gen.ts` open under its file-watcher when the rebase's `git rm` deleted it (main had stopped tracking the generated file); the router plugin crashed on `ENOENT` and never recovered on its own — fixed with `overmind restart vite`. Separately, the workspace's Postgres schema was stale relative to the rebased-in migrations (`leave_dates`, `overtime_lft_tiers`, etc.), causing `GET /attendances/today` to 500 with "Undefined table" until `migrate:fresh --seed` re-ran.
- **`/sonar-review` (~20m):** 4 `rand()` → `random_int()` vulnerabilities in the dev seeder, 3 code smells (implicit object stringification, `String.raw` for FQCN constants), and a webapp coverage gap (74.3% → 81.3%) closed with targeted tests for the dialog/button click paths that were only exercised at 0–50% coverage.
- **Four rounds of substantive automated PR review (~2h30m total):** (1) a missing index on `attendance_audit_logs.created_at` — every list query orders or range-filters by it, and it only had the unrelated `(auditable_type, auditable_id)` composite; (2) pagination controls entirely missing from the UI despite the backend always paginating, plus a debounce gap on the free-text employee filter; (3) the controller resolving `public_id`s and doing dynamic `$modelClass::query()` directly instead of using FormRequest accessors, per the project's stated convention; (4) soft-deleted employees becoming unreachable via both the `employee_id` filter *and* the record-mode lookup — the second-order bug being that even after relaxing the filter, the `auditable` morphTo relation still silently excluded trashed employees, making `auditable_id` resolve to `null` for their own audit entries as if the record had vanished.
- What went well: every review-driven fix was verified against the live dev API (not just PHPUnit) before committing — e.g. curling `/audit-logs?page=2`, confirming a 422 on an invalid `auditable_type`, and confirming a terminated employee's `auditable_id` resolves correctly post-fix. This caught the `MorphTo::withTrashed()` interaction with `Attendance` (no `SoftDeletes`) before it shipped, by reading Laravel's own source to confirm the `hasMacro()` guard makes it a safe no-op per morph type. Full regression stayed green throughout: 936/936 PHPUnit, 3237/3237 Vitest, by the end of the fourth review round.

**Takeaway for future estimates:** the original 2h–3h estimate only ever covered a from-scratch read-layer over already-built audit infrastructure — it never budgeted for a long-lived branch's rebase cost or for the PR-review-response cycle on a change that touches a shared model (`Employee`). Those two categories (~1h + ~2h30m here) are worth estimating as a separate line item on any task that (a) sits open across a `main` release cutoff, or (b) adds an existing cross-cutting trait/behavior to a model used elsewhere in the app.
