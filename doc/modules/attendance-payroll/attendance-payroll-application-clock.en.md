# Attendance/Payroll + Application Clock (EN)

## Goal

Define how the attendance/payroll module adopts the application source-of-truth clock.

## Impacted Flows

- Check-in (`check_in`).
- Lunch start/return (`lunch_start`, `lunch_end`).
- Check-out and overtime (`check_out`, `overtime_minutes`).
- Bulk close-day (`close_day`).
- "Today"-dependent leave and summary evaluations.

## Module Rule

- Any comparison against "current time" must use `ApplicationClock`.
- Technical framework timestamps remain on system time.

## Suggested Layer Changes

Backend:

- Inject `ApplicationClock` in attendance actions with time-based rules.
- Replace business-path `Carbon::now()`/`now()` with `ApplicationClock->nowUtc()`.
- Keep timezone-aware payload parsing and UTC persistence.

Frontend:

- Replace local `Date`-based "now/today" business computations.
- Consume `nowUtcIso` + `businessDate` from the shared clock store.
- Resolve parse/render timezone through a centralized service (browser timezone by default).
- Keep `Date` usage for rendering/formatting persisted timestamps only.

## Module Acceptance Criteria

- Individual check-in/out and close-day behave consistently in `system` and `simulated` modes.
- Overtime decisions are not affected by client/server clock drift.
- E2E can reproduce day-boundary scenarios without real waiting.

## References

- `doc/architecture/application-clock/application-clock.en.md`
- `doc/conventions/backend/application-clock.md`
- `doc/conventions/frontend/application-clock.md`
