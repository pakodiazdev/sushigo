# 🐛 Employees on vacation or a scheduled rest day today don't appear under "Ausentes"

## Bug description

On Attendance Today, an employee whose **current day** is an approved VACATION or a scheduled rest day (DAY_OFF) should be classified as "Ausente" — per the intent documented at `types/attendance.ts:191-197` (`isAbsentRow`). In practice this only works once an `Attendance` record for today already exists with `day_status = VACATION` / `DAY_OFF`. Net effect: an employee on vacation today, or whose weekly schedule marks today as a rest day, shows up as if they still need to check in (bucket `pending`, visible in "Pendientes"/default view) instead of under "Ausentes".

## Hypothesis

`getAttendancePhase()` (`types/attendance.ts:179`) starts with:
```ts
if (!attendance) return 'pending'
```
When no `Attendance` row exists yet for today — which, per the existing comment on `isAbsentRow` about `SCHEDULED` leaves, is expected for cases where the backend doesn't create one — the row falls through to `'pending'` instead of `'on-leave'`/`'day-off'`. `isAbsentRow` then only has a fallback for `today_leave?.time_mode === 'OPEN_ENDED'`, which covers formal LEAVE but not VACATION or a scheduled weekly rest day — even though `schedule.is_day_off` (`types/attendance.ts:76`) is already available on the row for the rest-day case.

## Reproduction guide

1. Set an employee's day off/vacation for today without letting an `Attendance` record be created yet for that day (i.e. before any check-in-adjacent action touches the row).
2. Open Attendance Today.
3. Observe the employee's card sits under "Pendientes"/default view instead of "Ausentes".

## Expected behavior

An employee whose current day is VACATION or a scheduled rest day (DAY_OFF) always appears in the "Ausentes" bucket/tab, regardless of whether an `Attendance` record has been created yet for today.

## Proposed approach

- Rest day: use `row.schedule?.is_day_off` as a fallback in `isAbsentRow`/`isHiddenFromGrid` when `row.attendance` is null.
- Vacation: no equivalent per-row signal currently exists on `TodayAttendanceRow` when there's no `Attendance` record yet — likely needs a backend addition (e.g. a `today_vacation` flag alongside `today_leave`) so the frontend can classify it without waiting for the `Attendance` row to be created.

## Acceptance Criteria

- [x] An employee on approved vacation today shows under "Ausentes" from the start of the day, with no Attendance record required
- [x] An employee whose schedule marks today as a rest day shows under "Ausentes" from the start of the day
- [x] Existing ABSENCE/LEAVE-with-Attendance-record behavior is unchanged
- [x] PHPUnit/Vitest coverage for both cases

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `5h14m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:49", "end": "17:03" }
]
```

## 📊 Retrospective

**Tracked:** `5h14m` (single session, 11:49–17:03) — within the `3h`–`6h` estimate range, closer to
the pessimistic end.

**What shipped:**
- `today_vacation` (boolean) added to `TodayAttendanceController`'s response, computed from an
  approved `VacationRequest` covering today, independent of the `Attendance` VACATION record.
- `isAbsentRow`/`isHiddenFromGrid` (`types/attendance.ts`) updated so vacation and scheduled-rest-day
  employees count as "Ausente" from the start of the day, without waiting for an `Attendance` row.
- PHPUnit, Vitest, and a new Cypress spec (`attendance-absent-no-record.cy.ts`) covering both cases.

**Why the tracked time landed above the optimistic estimate:**
- **Research before coding (~30–45m):** the issue's own "Proposed approach" assumed VACATION
  "likely" needed a backend flag. Verifying that against the codebase (confirming
  `VacationRequestGuards::createAttendanceRecords()` already eagerly creates the Attendance row at
  approval time) took real investigation before implementation could start — but this preserved
  scope discipline: `today_vacation` was still implemented per the issue's plan, deliberately, as a
  defensive decoupling rather than skipped as "unnecessary."
- **Two Copilot/Devin review cycles, both catching real issues:**
  1. Copilot correctly identified that the first implementation's `today_vacation`/`is_day_off`
     fallbacks fired unconditionally, which could misclassify an actively-working employee (e.g. an
     extra-day negotiation) as absent. Fixed by gating both fallbacks behind `phase === 'pending'`.
  2. Devin correctly flagged that hiding scheduled-rest-day rows from the default grid (to match the
     VACATION/manual-DAY_OFF precedent) would move the live "Registrar entrada" extra-day check-in
     action behind an extra tab switch — a genuine UX/business-rule tradeoff, not a code defect. This
     was the one deliberate pause in the run: the user was asked and chose to keep scheduled-rest-day
     rows visible in the default grid (matching the existing OPEN_ENDED-leave precedent instead),
     while vacation stays hidden (a genuinely terminal state — check-in is blocked backend-side while
     an approved vacation is active).
- **E2E verification against the dev-lab Docker stack:** the workspace's E2E container image hadn't
  been built yet this session, so the first `make e2e` run paid a one-time PHP-from-source Docker
  build cost before Cypress could run. Worth it — it caught two real, unrelated Cypress test-authoring
  bugs (scroll-clipped visibility assertions) that would otherwise have shipped as flaky specs.

**Would do differently next time:** none — the extra time bought two substantively correct review
findings (one code defect, one product decision) rather than review-cycle churn, which is the
outcome this pipeline's Copilot/Devin loops and one-interruption rule are designed to produce.




