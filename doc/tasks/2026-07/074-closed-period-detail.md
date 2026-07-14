# 📄 Task #074: View Closed Period Detail

## 📖 Story

**English:**
As a Manager or Admin, I want to view the frozen results of a closed payroll period, including each employee's breakdown and daily evidence, so I have the official record for payments.

**Español:**
Como Manager o Admin, quiero ver los resultados congelados de un periodo de nómina cerrado, incluyendo el desglose por empleado y la evidencia diaria, para tener el registro oficial de pagos.

---

## ✅ Backend Tasks

- [x] 🌐 `GET /api/v1/pay-periods/{payPeriod}` — ShowPayPeriodController; returns PayPeriod + all PayPeriodEmployees + their PayPeriodLines
- [x] 🌐 `GET /api/v1/pay-periods?branch_id=&status=&period_start=&period_end=` — list periods (with pagination)
- [x] 🧪 Feature tests: get detail, list with status/date-range filters, 403, 404, 422

## ✅ Frontend Tasks

- [x] 📂 Create routes `src/pages/attendance/payroll/index.tsx` (list) + `src/pages/attendance/payroll/$periodId.tsx` (detail)
- [x] 🔧 `getPayPeriods(filters)` + `getPayPeriodDetail(periodId)` in `src/services/payroll.service.ts`
- [x] 📱 **Periods list page** — table: period range, status badge, closed_by, closed_at, total employees; row click opens detail
- [x] 📱 **Closed period detail** — same layout as preview (#072) but read-only; header shows status, closed_by, closed_at
- [x] 📱 **Daily evidence expandable** per employee with all PayPeriodLines
- [x] 🔧 `usePayPeriods(filters)` + `usePayPeriodDetail(periodId)` hooks

---

## 🎯 Acceptance Criteria

- [x] Manager can navigate to a closed period and see the frozen breakdown
- [x] All amounts match what was shown in the preview at close time
- [x] Status badge clearly shows CLOSED / REOPENED

---

## 🔗 References

- **Backlog:** AP-061 · RF-20

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `~5h40m`

### 📅 Sessions
```json
[
  { "date": "2026-07-12", "start": "17:13", "end": "19:41" },
  { "date": "2026-07-13", "start": "23:58", "end": "00:55" },
  { "date": "2026-07-13", "start": "18:25", "end": "19:05" },
  { "date": "2026-07-13", "start": "20:20", "end": "21:55" }
]
```

---

## 📊 Retrospective

**Estimated:** 2h–4h · **Tracked:** ~5h40m · **Variance:** +1h40m over pessimistic

**Session 1 (2026-07-12, 2h28m) — implementation:**
Scope matched the issue text closely — the preview page (`payroll/close.tsx`, #072/#073) and the audit log module's paginated-list pattern (`ListAuditLogsRequest`/`ListAuditLogsController`, `AuditLogPanel`) were directly reusable as templates for both the backend list/detail endpoints and the frontend list/detail pages, so no design exploration was needed. The one open design decision (reuse `payroll.preview` permission vs. add a new `payroll.view`, and whether the list needed a date-range filter) was resolved with the user up front before implementation started. Verified end-to-end against real seeded data via curl (no browser extension available) and against a dedicated E2E Docker stack (`make e2e WORKSPACE=sushigo-b`) with a new `PayrollClosedPeriodSeeder` + Cypress spec — all 3 new E2E tests plus the 2 pre-existing payroll specs passed clean on the first run. PR #236 opened at the end of this session.

**Session 2 (2026-07-13, ~57m) — first PR review round + SonarCloud:**
Copilot flagged 2 real issues on the PR: `PayPeriodLineResource` threw a 500 on a null `date` (the column is nullable but the resource called `toDateString()` unconditionally), and `GET /pay-periods` without `branch_id` silently returned periods across all branches (every other pay-period endpoint already required it). Both fixed with regression tests. Immediately followed by `/sonar-review`: webapp quality gate failed on duplication (15.8%, the `EmployeeDetailRow`/`EmployeePreviewRow` table markup was copy-pasted between the preview and detail pages) and coverage (57.1%, two new files untested). Extracted the shared markup into `-employee-pay-row.tsx` and added tests for the previously-uncovered service functions and badge component.

**Session 3 (2026-07-13, ~40m) — missing nav link, found via user report:**
User reported `/attendance/payroll` gave a 404 despite the route existing — the page had been built and tested but never wired into the sidebar (`Sidebar.tsx` only had a link to `/attendance/payroll/close`, not the new list page). Added the missing entry. The reported "404" was actually a stale Vite dev-server state after several `routeTree.gen.ts`-affecting edits earlier in the session — a known class of issue in this repo (see #084's retrospective) — resolved with `overmind restart vite`, no code change needed for that half of the report.

**Session 4 (2026-07-13, ~1h35m) — rebase, two review tools, PR-thread response:**
Rebased onto `main` twice (issues #070/#071 landed upstream); both rebases were conflict-free except one additive conflict in `TestReset.php`'s seeder-group registry, resolved by keeping both sides' new entries. Two rounds of Devin-review findings addressed (5 total): a stale periods-list cache after confirming a close, a page-reset race condition in the list-filter hook, the `per_page` default living in the controller instead of the FormRequest (a direct CLAUDE.md convention violation), an unused `branch` eager-load, and a documentation comment for a non-obvious dual-path field. Then processed 6 open GitHub review threads (Copilot): two duplicate reports of a React key collision (same concept+date lines overwrote each other), two seeder guard gaps, one seeded-data inconsistency (evidence line amount didn't match the frozen total), and one OpenAPI schema mismatch. While verifying the seeder-guard fix live against the dev DB, caught a self-introduced bug: `RuntimeException` needs an explicit `use` import — PHP resolves unqualified class names against the current namespace, not the global one, contrary to an assumption carried in from an earlier fix. Closed with a second `/sonar-review` pass (3+3 new code smells: generic-exception rule on the API side, asymmetric `useState` naming on the webapp side).

**What went well:** every fix across all four sessions was verified against real running instances before committing — curl against the live API, a rebuilt E2E Docker stack for Cypress, and direct dev-DB manipulation to force both the guard-fires and guard-passes paths of the seeder — rather than trusting the diff alone. This caught two real bugs (the missing exception import, the seeded-data inconsistency) that unit tests alone would not have.

**What to improve next time:** the original 2h–4h estimate only covered a from-scratch implementation against an already-shipped preview/list pattern — it never budgeted for the review-response cycle (Copilot + Devin + two SonarCloud passes) that a moderately-sized PR against an actively-developing `main` attracts. For a task of this shape, ~2× the implementation estimate is a more realistic total, matching the pattern already noted in #084's retrospective for the same class of overrun (rebase cost + PR-review-response cycle on a change with real reviewer engagement).
