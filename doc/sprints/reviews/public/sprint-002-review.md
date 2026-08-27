---
sprint: "002"
visibility: public
review_type: retrospective
review_origin: reconstructed-from-sprint-evidence-and-later-review-checkpoint
review_date: 2026-08-26
---

# Sprint 002 — Platillos Catalog & Platform Hardening

## Executive summary

Sprint 002 added the first substantial menu/catalog vertical while simultaneously hardening the
platform. It shipped a reusable media system, Platillos domain/UI, attendance correctness fixes and
a critical public-repository secret remediation.

The most important engineering lesson came from a failed approach: Attendance Today's animation
work accumulated 26+ review fixes because the frontend guessed mutation outcomes and polled to
confirm them. The implementation was abandoned and rebuilt around the backend's confirmed mutation
response. That root-cause correction became stronger evidence than merely landing the original UI
effect.

## Delivered architecture

- reusable media upload/ownership foundation;
- Dishes/categories/extras backend and UI;
- realistic seed data;
- central ApplicationClock usage;
- DataGrid consolidation;
- removal of committed `APP_KEY` material from repository configuration.

## Delivery evidence

| Metric | Result |
|---|---:|
| Planned scope | 14 Issues |
| Delivered | 14/14 |
| Planned effort | 36–72 h |
| Tracked formal effort | ~159.9 h across 13/14 tracked Issues |
| Full person-hours | 170.8 h |
| Wall-clock | 92.51 h |
| Parallelization | 1.85× |
| Peak concurrent sessions | 5 |

### Important interpretation

The high tracked total is not clean "developer effort": several long sessions included automated
CI/review waiting. Sprint 002 demonstrated why future analytics must distinguish active engineering
attention from pipeline wall time.

## Review checkpoint

A later project review placed engineering maturity around **8.2/10**, up from an earlier ~7.7
checkpoint. This score is subjective and is retained only to show review trend.

## Findings carried forward

- deployed `APP_KEY` rotation could not be proven from repository evidence;
- review loops could become disproportionately expensive;
- public presentation/metadata still lagged behind internal engineering quality;
- security and authorization needed continued attention.

## Material engineering findings

### Attendance Today was reconstructing state already confirmed by the backend

**What was found.** The original animation/state approach accumulated repeated review fixes because
the client mutated attendance and then tried to infer or poll the resulting state, even though the
backend response already contained the confirmed `AttendanceRecord`.

**Why it matters.** Reconstructing an already-authoritative result creates duplicated state machines,
race windows and transient UI inconsistencies.

**Before.**

```text
mutation
→ infer expected result
→ poll/refetch
→ animate guessed state
```

**After.**

```text
mutation
→ consume confirmed AttendanceRecord
→ write cache
→ background invalidation
→ render/animate confirmed state
```

**Where.**
- `code/webapp/src/pages/attendance/-use-today-attendance-page.ts`
- `code/webapp/src/services/__tests__/attendance-hooks.test.ts`
- `code/webapp/src/services/__tests__/attendance-hooks-day-status.test.ts`
- Sprint 002 retrospective / #357 → #410 / PR #411

**Status.** Resolved architecturally.

---

### Review and CI waiting distorted the meaning of Tracked hours

**What was found.** Long-running Issues combined implementation time, automated review loops and CI
waiting into the same session totals.

**Why it matters.** `Tracked` cannot safely be interpreted as human-attention time.

**Risk.** Productivity comparisons can look worse or better than reality if pipeline wait is counted
as active engineering labor.

**Where.**
- `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md`, time-tracking sections.

**Status.** Mitigated through later workflow changes; the metric distinction remains important.

## Source of truth

- [`doc/sprints/sprint-002-platillos-catalog-platform-hardening.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-002-platillos-catalog-platform-hardening.md)
