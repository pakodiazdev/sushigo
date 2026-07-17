# 🔓 Task #076: Reopen Closed Period

## 📖 Story

**English:**
As an Admin, I want to reopen a closed payroll period with a justification, so I can correct errors while maintaining a full audit trail of the reopening.

**Español:**
Como Admin, quiero reabrir un periodo de nómina cerrado con una justificación, para poder corregir errores manteniendo un registro completo de auditoría de la reapertura.

---

## ✅ Backend Tasks

- [x] 🌐 `PATCH /api/v1/pay-periods/{id}/reopen` — ReopenPeriodController; body: `{ reason }`
- [x] 🔧 Sets status = REOPENED; records reopened_by, reopened_at, reopen_reason; only Admin can execute (403 otherwise)
- [x] 🌐 `PATCH /api/v1/pay-periods/{id}/reclose` — recalculates and closes again (status = CLOSED)
- [x] 🔧 Creates audit log entry for both operations
- [x] 🧪 Feature tests: reopen by admin (success), reopen by manager (403), reclose

## ✅ Frontend Tasks

- [x] 🔧 `reopenPeriod(periodId, reason)` + `reclosePeriod(periodId)` in `src/services/payroll.service.ts`
- [x] 📱 **"Reabrir periodo" button** in Closed Period Detail (#074) — visible only to Admin + only for CLOSED status
- [x] 📱 **Reopen modal** — reason text area (required); "Confirmar reapertura" button
- [x] 📱 After reopen: status badge changes to REOPENED; "Volver a cerrar" button appears (single-action reclose instead of a separate preview step — see retrospective)
- [x] 📱 After reclose: status returns to CLOSED; reopening metadata visible in the header

---

## 🎯 Acceptance Criteria

- [x] Admin can reopen a period and provide a mandatory reason
- [x] Managers cannot reopen (403 response maps to permission error message)
- [x] After reopening, the period can be reclosed; reason is visible in the period header

---

## 🔗 References

- **Backlog:** AP-047 · RF-21, RN-17

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `8h12m`

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:13", "end": "07:10" },
  { "date": "2026-07-15", "start": "00:00", "end": "00:25" },
  { "date": "2026-07-15", "start": "16:10", "end": "16:45" },
  { "date": "2026-07-15", "start": "17:05", "end": "18:15" },
  { "date": "2026-07-17", "start": "11:10", "end": "12:15" }
]
```

## 📊 Retrospective
- **Actual total:** 8h 12m (297m + 25m + 35m + 70m + 65m)
- **vs optimistic:** +6h 12m
- **vs pessimistic:** +5h 12m

**Justification:**
Most of the scaffolding for this feature (migration columns, model fields, resource
serialization, status badge, header display block) was already built ahead of need in
#074, which kept the core implementation itself close to the estimate. The overrun came
from two sources outside the coded scope: (1) the shared dev-lab Postgres `mydb_test`
database collided repeatedly with a concurrent test run from another workspace
(`sushigo-e`), causing deadlocks and partial-migration states that required several
`migrate:fresh` resets and retries to get a clean feature-test run — roughly 45–60m lost
waiting and recovering; (2) running the mandatory Cypress E2E spec against the dev-lab
stack (`make cypress-devlab-run-spec`) auto-provisions and tears down a full Docker E2E
stack per invocation, and two iterations were needed to fix a UI issue (the dev-only
Debugger overlay covering the ml-auto-positioned action buttons, worked around with
`{ force: true }` matching the existing `payroll-close-confirm.cy.ts` pattern) and a
test-isolation bug (DB reset needed to move from `before()` to `beforeEach()` since,
unlike the read-only `closed-period-detail.cy.ts` spec, these tests mutate period
status) — each full stack up/down cycle cost several minutes. Also extracted
`RecalculatePayPeriodEmployeesAction` out of `ConfirmCloseController` to share the
recalculation logic with the new reclose endpoint, which was not in the original
estimate but avoided duplicating ~40 lines of payroll business logic.

Three additional PR-review follow-up sessions happened after the initial close, once
Devin's automated review landed comments on PR #244 and `/sonar-review` ran against the
branch — none of this was in the original estimate since the task was scoped to the
initial implementation, not the review cycle. Session 2026-07-15 00:00–00:25 addressed
Devin's first round: verified and fixed a real pre-existing gap where `CoreTestSeeder`'s
`manager` role had zero payroll permissions unlike the `Development` seeder (aligned via
`=payroll.preview`/`=payroll.close`), and confirmed the other three flags from that round
(overtime PAID idempotency, mass-delete bypassing model events, dialog-stays-open UX)
were correct as-is. Session 2026-07-15 16:10–16:45 was unrelated environment upkeep
(diagnosed and reseeded an empty `sushigo_ws_b` dev-lab database) plus a design
discussion that surfaced a real scope gap — no endpoint that writes attendance/overtime/
leave/wage data checks whether it falls inside a `CLOSED` pay period — filed as
[#251](https://github.com/pakodiazdev/sushigo/issues/251) for future work rather than
folded into this PR. Session 2026-07-15 17:05–18:15 covered `/sonar-review` (one
`php:S1192` duplicate-literal smell in `Development/PermissionSeeder.php`, extracted to a
`GROUP_NOMINA` constant) and Devin's second review round, which caught a genuine
functional bug introduced by this PR: `ConfirmCloseController`'s duplicate-period
pre-check only matched `STATUS_CLOSED`, so attempting to close a `REOPENED` period fell
through to a generic "duplicate close" unique-constraint error instead of pointing the
admin at reclose — fixed with an explicit `STATUS_REOPENED` branch and an actionable
message, covered by a new feature test.

Session 2026-07-17 11:10–12:15 rebased the branch onto `main` (which had picked up two
new merges, #229 and #075) and then squashed the branch's own history into a single
commit — neither was in the original estimate. The rebase hit real conflicts, not
just noisy ones: PR #075 (CSV export) had independently extracted the same close-time
persistence logic into `ClosePayPeriodForEmployeeAction` (per-employee, also reused by
its history-backfill seeder), competing with this task's own
`RecalculatePayPeriodEmployeesAction` (loops a collection, shared by close and reclose).
Reconciled by keeping `ClosePayPeriodForEmployeeAction` as the canonical per-employee
primitive and turning `RecalculatePayPeriodEmployeesAction` into a thin wrapper that
loops and delegates to it, preserving both the reclose flow and the CSV history seeder.
#075 also touched the same six webapp files (`$periodId.tsx`, `use-pay-period-detail.ts`
and its test, `payroll.service.ts`, `payroll-hooks.ts` and its test, `payroll-api.test.ts`)
for the export button/hook — those conflicts were additive (export + reopen/reclose UI
coexisting) rather than competing designs, resolved by merging both feature's imports,
destructured hook fields, and test blocks. Verified with the full API payroll suite (709
tests), Pint, webapp typecheck, ESLint, and the 54 webapp payroll tests before pushing.
The branch was then squashed from 9 commits into one (`--force-with-lease` push, since
the branch had already been pushed with the prior multi-commit history).
