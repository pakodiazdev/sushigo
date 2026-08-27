---
sprint: "001"
visibility: public
review_type: retrospective
review_origin: reconstructed-from-sprint-evidence
review_date: 2026-08-26
---

# Sprint 001 — Attendance, Payroll & Quality

## Executive summary

Sprint 001 established the first measurable proof that SushiGo's multi-workspace workflow could
ship a broad backlog safely. Active scope finished in five workdays against a 14-day cadence while
mixing product fixes, payroll integrity, accessibility/reliability cleanup and developer tooling.

## Delivered value

Key outcomes included:

- attendance correction for already-recorded events;
- payroll-close week/gate integrity and skipped-period protection;
- improved absence handling and Attendance Today UX;
- removal of multiple SonarCloud reliability/maintainability findings;
- reusable developer component catalog and task-tracking conventions.

Several post-implementation reviews found real defects that were fixed before merge, including
out-of-order payroll-close gaps, attendance correction edge cases, stale state/race behavior and
accessibility problems.

## Delivery evidence

| Metric | Result |
|---|---:|
| Completed active scope | 25 Issues |
| Formal implementation estimate | 38.5–71.5 h |
| Formal tracked implementation | 45.64 h |
| Full tracked person-hours incl. opportunistic work | 51.13 h |
| Wall-clock | 36.45 h |
| Parallelization | 1.40× |
| Peak concurrent sessions | 5 |
| Active workdays | 5 |

> Person-hours are summed sessions. They are not equivalent to human attention.

## Engineering observations

### Strengths
- Value-first prioritization was explicit.
- Conflict-aware execution enabled safe multi-agent parallel work.
- Review findings produced regression tests instead of one-off patches.
- Estimates landed inside the planned range for completed scope.

### Risks / lessons
- Early time tracking was inconsistent across live Issues and archived task files.
- Review, implementation and documentation time were not yet separable.
- Some browser/E2E verification still required manual follow-up.

## Follow-up signal

Sprint 001 created the foundation for measuring later process improvements instead of relying on
subjective claims about AI speed.

## Material engineering findings

### Payroll close must select the oldest pending period, not derive “latest + 1”

**What was found.** A payroll-close flow can become inconsistent if the next period is inferred from
the latest record instead of querying for the earliest unclosed period.

**Why it matters.** A skipped historical week can remain invisible while later periods continue
closing.

**Risk example.**

```text
Week A → closed
Week B → open
Week C → closed

latest + 1  ❌
oldest unclosed → Week B  ✅
```

**Where.**
- `code/api/app/Http/Controllers/Api/V1/PayPeriods/NextUnclosedPayPeriodController.php`
- `code/api/tests/Feature/AttendancePayroll/NextUnclosedPayPeriodApiTest.php`
- `doc/tasks/2026-07/329-payroll-close-week-gate.md`

**Status.** Resolved and regression-tested.

---

### Attendance corrections must reconcile derived state

**What was found.** Editing a historical attendance time is not isolated CRUD. It may alter overtime,
meal-lateness and other derived state.

**Why it matters.** Correcting one timestamp without reconciling its consequences can leave the
record internally inconsistent.

**Where.**
- `code/webapp/src/components/attendance/AttendanceTimeDialog.tsx`
- `code/webapp/src/components/attendance/use-attendance-time-dialog.ts`
- `doc/tasks/2026-07/328-correct-attendance-event.md`

**Status.** Resolved in the current correction flow.

**Engineering takeaway.** Historical edits should identify and reconcile derived decisions instead
of updating only the edited field.

## Source of truth

- [`doc/sprints/sprint-001-attendance-payroll-quality.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-001-attendance-payroll-quality.md)
