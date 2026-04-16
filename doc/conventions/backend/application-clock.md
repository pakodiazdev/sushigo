# Backend Application Clock Convention

## Goal

Ensure all business-time logic in API uses the Application Clock source of truth, not machine time directly.

## Core Rule

- Business logic must read current time via injected `ApplicationClock`.

## Allowed vs Forbidden

Allowed:

- `ApplicationClock->nowUtc()` for business instants.
- `ApplicationClock->todayInBusinessTz()` for "today" logic.
- `now()` for technical/infrastructure timestamps only (`created_at`, audit infra, cache TTL, logs).

Forbidden (in business rules):

- direct `now()`.
- direct `Carbon::now()`.
- direct `new DateTimeImmutable('now')`.

## Required Injection Pattern

Actions/Services that compare with current time must inject clock dependency.

```php
public function __construct(
    private readonly ApplicationClock $clock,
) {}

$now = $this->clock->nowUtc();
```

## Field Semantics

- Business instants (check-in/out, decisions, approvals): use Application Clock.
- Technical timestamps (`created_at`, `updated_at`, migration defaults): system clock.

## Test Rule

- Keep `X-Test-Time` behavior for deterministic request tests.
- `ApplicationClock` implementation must respect `Carbon::getTestNow()` when present.

## PR Checklist

- Any new "current time" decision goes through `ApplicationClock`.
- No new business-path usage of `now()` / `Carbon::now()`.
- Tests cover system mode and simulated mode behavior when relevant.
