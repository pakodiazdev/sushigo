# 📅 Task #329: Auto-calculate Current Week for Payroll Close and Gate "Confirmar cierre" Until Sunday 19:00

## 📖 Story

**English:**
As a Manager or Admin, I need the payroll close page to show the current week automatically, calculate the preview without any extra click, and only allow closing once the week is actually over (Sunday ≥ 19:00), so that I can't accidentally close a partial or wrong period.

**Español:**
Como Manager o Admin, necesito que la página de cierre de nómina muestre la semana actual automáticamente, calcule el preview sin un clic extra, y solo permita cerrar una vez que la semana realmente terminó (domingo ≥ 19:00), para no cerrar accidentalmente un periodo parcial o incorrecto.

---

## 🔎 Current State (code audit, confirmed against `origin/main`)

- `close.tsx` renders `period-start`/`period-end` as editable date inputs; `pendingRange` defaults to `currentWeekRange()` (`code/webapp/src/lib/week.ts`) but the user can change it to any arbitrary range before hitting "Calcular preview"
- "Confirmar cierre" (`<Button variant="success" onClick={openConfirm}>`) has no disabled state and no time gate at all today
- `lib/week.ts` already has everything needed to compute/format the current week: `currentWeekRange()`, `weekRangeContaining()`, `formatWeekLabel()`, `formatWeekTitle()` — good building blocks for a read-only week display
- Backend: `ConfirmClosePayPeriodRequest` → `BasePayPeriodRangeRequest::rules()` only validates `period_end >= period_start` — no day-of-week check, no full-week enforcement, no time-of-week gate. `ConfirmCloseController` accepts whatever `period_start`/`period_end` the client sends
- **Timezone risk**: the frontend timezone helper (`getFrontendTimezone()` in `lib/timezone.ts`) resolves to the **browser's** timezone, not a fixed business timezone — a purely client-side "Sunday 19:00" check would be inconsistent across devices and trivially bypassable. The backend already has the correct source of truth: `ApplicationClock::nowInBusinessTz()` / `todayInBusinessTz()` (`America/Mexico_City`), already used for equivalent guards elsewhere (e.g. `AttendancePolicy`, `CurrentScheduleController`)

---

## ✅ Backend Tasks

- [x] 🔧 Add validation in `BasePayPeriodRangeRequest`/`ConfirmClosePayPeriodRequest`: `period_start` must be a Monday and `period_end` must be the following Sunday (full week, no partial ranges)
- [x] 🔧 Add a gate in `ConfirmCloseController` (or its `FormRequest`): reject the close with 422/403 unless `ApplicationClock::nowInBusinessTz()` is Sunday ≥ 19:00 for the period being closed
- [x] 🧪 Feature tests: close rejected before Sunday 19:00, allowed at/after; close rejected for a non-Mon–Sun range
- [x] 🐛 Require `date_format:Y-m-d` (not `date`) on `period_start`/`period_end` — rejects ambiguous datetimes with UTC offsets (PR review follow-up)

## ✅ Frontend Tasks

- [x] 📱 Replace the two date inputs in `close.tsx` with a read-only current-week display (reuse `formatWeekLabel`/`formatWeekTitle` from `lib/week.ts`) — no manual editing, since periods are always the current week for now
- [x] 📱 Remove the "Calcular preview" button — fetch the preview automatically for the current week as soon as the page mounts, since there's nothing left to select
- [x] 📱 Disable "Confirmar cierre" until the gate opens; add a "?" icon (à la existing `InfoTooltip`, `code/webapp/src/components/ui/info-tooltip.tsx`, but click-to-open rather than hover) next to the disabled button that opens a `Dialog` explaining: periods are weekly Mon–Sun, and a period can only be closed once the week is over (Sunday ≥ 19:00)

---

## 🎯 Acceptance Criteria

- [x] The close page shows the current week (Mon–Sun) automatically, with no date inputs to edit
- [x] The preview loads automatically when the page mounts, for the current week — no button to click
- [x] "Confirmar cierre" is disabled until Sunday ≥ 19:00 in the business timezone (`America/Mexico_City`)
- [x] Clicking the "?" icon opens a dialog explaining the weekly-period and Sunday-19:00 rules
- [x] Backend rejects a close attempt before Sunday 19:00 even if bypassed on the client (422/403)
- [x] Backend rejects a close attempt for a range that isn't a full Monday–Sunday week

---

## 🔗 References

- **Note:** No dependency on #325, #327, or #328 — different page, independent of that work
- Reopen/reclose (`ReopenPayPeriodController`, `ReclosePayPeriodController`) already exist for correcting a period after the fact, so this gate is only about the *initial* close, not a hard irreversible constraint

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `6h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `~4h57m`

### 📅 Sessions
```json
[
  { "date": "2026-07-26", "start": "19:17", "end": "20:14" },
  { "date": "2026-07-26", "start": "20:59", "end": "21:27" },
  { "date": "2026-07-27", "start": "00:35", "end": "00:57" },
  { "date": "2026-07-27", "start": "00:57", "end": "01:15" },
  { "date": "2026-07-27", "start": "01:15", "end": "01:45" },
  { "date": "2026-07-27", "start": "10:14", "end": "10:35" },
  { "date": "2026-07-27", "start": "17:35", "end": "17:50" },
  { "date": "2026-07-27", "start": "17:50", "end": "18:44" },
  { "date": "2026-07-27", "start": "18:44", "end": "19:37" }
]
```

## 📊 Retrospective

- **Actual total:** 4h 57m (57m + 28m + 22m + 18m + 30m + 21m + 15m + 54m + 53m)
- **vs optimistic:** +1h 57m
- **vs pessimistic:** −1h 3m

**Justification:**

Finished under both the optimistic and pessimistic estimates despite absorbing four rounds of
mid-flight scope refinement requested by the user after the initial TDD implementation landed —
none of it was in the original issue scope or estimate: dropping the manual "Calcular preview"
trigger in favor of auto-fetch-on-mount (session 3), extracting the current-week display into a
reusable dark/light-aware `LabeledBadge` component plus two rounds of visual polish (sessions 3–4),
sourcing the close gate and week computation from the real Application Clock instead of the
browser's raw `Date` for consistency with the backend (session 5), and adding a periods-list
redirect plus roll-forward-to-next-period behavior after a successful close (session 5).

The original TDD implementation (session 1) already matched the codebase's established patterns
closely enough (clock-injection FormRequest constructor pattern from `CheckInRequest`, Cypress
dual-clock pattern from `attendance-close-day-overtime.cy.ts`, `ApplicationClockState` simulation
support) that only 1 of 3 automated review findings required an actual code change (the
`date_format:Y-m-d` tightening) — the other 2 were verified as false positives and closed with a
justification instead, which kept the review-response cycle unusually short for this repo (compare
task #074's retrospective, where the review-response cycle roughly doubled the implementation
estimate). The Devin/DeepWiki automated review run at PR-finish time reported 0 bugs and 13/13
checks green.

**What went well:** every backend change was verified against the real PHPUnit suite (not just the
touched test files — the full `AttendancePayroll` suite, 729+ tests) and every frontend change was
verified against the real dev-lab E2E stack (not just Vitest) before being reported as done, which
caught the `closeDevDebugger()` timing race and the `cy.clock()` reset-on-reload issue during
Cypress iteration rather than after merge.

**What to improve next time:** the original estimate (3h–6h) was scoped against the issue text as
written, not against the likely follow-on refinement a feature like this attracts once the user
sees it running — for a payroll UX change with this much surface area (week computation, gate
logic, redirect behavior), budgeting for at least one round of "now that I see it working, let's
also…" follow-up would make the estimate's lower bound more realistic without needing to inflate
the pessimistic end.

Two short follow-up sessions closed the PR out after the above was written: `/sonar-review`
(session 6) found and fixed 2 new-code smells in `LabeledBadge` (`typescript:S4782` redundant
optional-`undefined` type, `typescript:S6759` non-readonly props) — both quality-gate-passing but
worth zeroing out — and `/finish-pr` (session 7) ran the pre-merge readiness check (CI, review
threads, Devin/DeepWiki bug scan — 0 bugs, 1 non-blocking "Investigate" flag) and the merge-prep
bookkeeping below.

A genuine bug was then reported against the just-merged-ready PR (session 8): the "oldest unclosed
week" target was derived from `latest('period_start')`, which the out-of-order-closing feature
(added earlier in this same PR) could make wrong — closing a newer overdue week first made the
algorithm think everything up to it was caught up, permanently hiding an older still-open week
with no UI path left to reach it. Fixed with a new `GET /pay-periods/next-unclosed` endpoint
(`FindOldestUnclosedPayPeriodAction`) that walks every week from the branch's first `PayPeriod`
forward via a Postgres `generate_series` gap-search instead of assuming a contiguous "latest
period + 1" chain, replacing the frontend's client-side derivation entirely. Covered by 6 new
PHPUnit tests (including the exact regression scenario) and a new Cypress E2E test that closes a
second overdue week out of order and confirms the first is still targeted on revisit. Even with
this real fix included, total tracked time stayed under the pessimistic estimate — this is the
kind of correctness bug that's easy to miss without deliberately reasoning through what a newly
added "close out of order" capability does to an algorithm that assumed strictly sequential
closing.

A second review comment landed immediately after (session 9): the overdue banner ("Este periodo
está vencido... Puedes cerrarlo directamente") stayed visible even after browsing forward to the
actual current week, contradicting the disabled "Confirmar cierre" button and its "Disponible a
partir del domingo 19:00 hrs." caption right below it — because the banner was gated on `isOverdue`
(whether *anything* is overdue, which never changes while browsing) instead of whether the
*currently displayed* week is itself one of the overdue ones. Fixed by adding a dedicated
`isViewingOverdueWeek` flag (`clampedOffset < maxViewOffset`) to gate the banner, leaving
`isOverdue` governing only the nav arrows' visibility as before. Two new Vitest tests plus a
Cypress assertion (added to the existing "peek at current week" E2E test) cover it. The E2E rerun
hit real Docker OOM flakiness (`Exited (137)` on the E2E API container, consistent with earlier
infra flakiness in this same PR) on the first two attempts — confirmed as infra, not logic, since
the Vitest suite was already green — and passed clean 8/8 on the third attempt.
