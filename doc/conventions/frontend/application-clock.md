# Frontend Application Clock Convention

## Goal

Use backend-provided Application Clock as the source of truth for business-time decisions.

## Core Rule

- Business-state decisions must use the clock store/hook fed by API clock endpoints.
- UI parse/render timezone must come from a centralized timezone service.

## Allowed vs Forbidden

Allowed:

- Read "now" from `useApplicationClock()` (or equivalent shared store).
- Use `new Date(apiTimestamp)` for pure display/formatting of persisted values.
- Resolve timezone from a single service (`getFrontendTimezone()`), defaulting to browser timezone.

Forbidden (in business decision paths):

- `Date.now()` to decide if something is late/active/expired.
- `new Date()` to derive business "today" for API payload defaults.
- Hardcoded timezone offsets for business logic.
- Ad hoc timezone resolution in random components.

## Usage Pattern

```ts
const { nowUtcIso, businessDate } = useApplicationClock();
const timezone = getFrontendTimezone();
```

Use `nowUtcIso`/`businessDate` for:

- default values in time-sensitive forms
- attendance/leave status calculations
- validations depending on current date/time

Use `timezone` for:

- user-visible datetime parse/render
- formatting utilities that need explicit timezone

## Frontend Timezone Service Contract

Create one shared resolver (`src/lib/timezone.ts` or equivalent):

```ts
export function getFrontendTimezone(): string {
  // Future: return user preference when available
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
```

Resolution policy:

1. User-configured timezone (future, not implemented yet).
2. Browser timezone (current default).

## Migration Guideline

When touching a feature that currently depends on local `Date`:

1. Replace business "now" reads with Application Clock.
2. Route parse/render timezone through the shared timezone service.
3. Add/adjust tests with deterministic clock input.

## Test Rule

- Unit/component tests should inject explicit clock values via store mocks.
- E2E can keep `cy.clock()` + `X-Test-Time`, but assertions should validate backend-derived business behavior.

## PR Checklist

- No new `Date.now()` / `new Date()` in business decision code.
- "Today" and "Now" for business behavior come from Application Clock store.
- Timezone for parse/render comes from centralized resolver (browser by default).
- Tests document the expected clock source.
