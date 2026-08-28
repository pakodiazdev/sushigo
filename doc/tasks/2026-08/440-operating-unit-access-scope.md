# 🔒 Enforce Operating Unit access across Inventory locations and stock actions

**Labels:** backend, sprint-6, investment: product-engineering

## Description

Combine global Inventory permissions with active Operating Unit membership for all scoped Inventory data and mutations.

## Reason

Global capabilities alone do not prevent a user from reading or mutating another branch/event unit by guessing IDs or changing filters.

## Objective

Enforce horizontal authorization consistently across locations, Stock, movements, receipts and operational queries.

## ✅ Technical Tasks

- [x] Define super-admin/admin bypass and active operating_unit_users membership rules.
- [x] Centralize accessible Operating Unit/Location scopes.
- [x] Apply scope to list/show/mutation FormRequests, policies and services.
- [x] Validate both source and destination for movements/transfers.
- [ ] Apply the contract to receipts and stock filters as their issues land.
- [x] Add horizontal-access attack, inactive-membership and bypass tests.

## 🎯 Acceptance Criteria

- [x] A capable user cannot access another Operating Unit without active membership.
- [x] Filtering or direct public IDs cannot bypass the scope.
- [x] Cross-unit movements validate both ends under an explicit rule.
- [x] Super-admin/admin behavior is documented and tested rather than implicit.

## 🔗 References

- Policy correction: #400
- Coordinate with receipt #432 and price context #435

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `3h52m`

### 📅 Sessions
```json
[
  { "date": "2026-08-27", "start": "12:02", "end": "12:28" },
  { "date": "2026-08-27", "start": "14:50", "end": "18:16" }
]
```

## 📊 Retrospective

- **Actual total:** 3h 52m (232m)
  - 2026-08-27 12:02–12:28 — 26m: `/issue-no-review` build — `OperatingUnitScope` + `ChecksOperatingUnitAccess` / `AuthorizesLocationOperatingUnitAccess` concerns, policy + controller + FormRequest enforcement across Inventory Locations, stock queries and stock movements, TDD (`OperatingUnitScopeTest`, `OperatingUnitAccessTest`, extended `InventoryLocationPolicyTest`), architecture doc §3.11 (en + es), PR opened, CI green, squash.
  - 2026-08-27 14:50–18:16 — 3h 26m: review-response iteration — Codex P1 (per-location replenishment-policy endpoints were unscoped; added `assertCanAccessLocation` to all four controllers + 403/insider tests + doc update), one flaky-CI investigation (`unique_stock_per_location` collision poisoning shard 1/4's transaction and knocking out an unrelated payroll assertion — cleared on re-run), a SonarCloud pass (3× `php:S4144` identical-method-body smells → extracted a `canManage()` helper), an inline-FQCN cleanup in the new unit test, and three `main` rebases as sibling PRs merged underneath.
- **vs optimistic (5h):** −1h 08m
- **vs pessimistic (10h):** −6h 08m

**Justification:**
The core enforcement landed fast because the codebase already had a one-grain-coarser precedent
(`ChecksBranchAccess` / `ScopesToUserBranches`) to mirror at the Operating Unit level, so the design
question was settled before implementation started. The bulk of tracked time was the
review-iteration tail, not the build: the Codex finding was legitimate and widened the scope to a
sub-resource (`/inventory-locations/{id}/replenishment-policies`) the first pass had missed, which
meant four more controllers, six more test cases and a doc edit; the SonarCloud `S4144` smells were
a direct consequence of every mutating policy ability sharing one rule (fixed by extracting the
shared method); and a flaky shard failure unrelated to this PR cost an investigation + CI re-run
round trip. Three rebases onto a fast-moving `main` added waiting time but no conflicts. Still
comfortably inside the pessimistic estimate.





