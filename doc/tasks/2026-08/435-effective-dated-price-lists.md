# ✨ Build effective-dated Product price lists by branch or operating context

**Labels:** enhancement, backend, sprint-5, investment: product

## Description

Implement the authoritative sale-price domain for Product Variants, with effective dates and branch or approved operating-context assignment.

## Reason

Sale price varies by branch and over time. ItemVariant.sale_price cannot represent operational expenses, local strategy or temporary event pricing.

## Objective

Resolve a Variant's sale price from authorized, effective price-list evidence without falling back to a catalog field.

## ✅ Technical Tasks

- [x] Finalize Branch versus Operating Unit assignment and precedence rules.
- [x] Add price lists, Variant price entries, context assignment, priority, validity and active state using exact monetary storage.
- [x] Implement deterministic price resolution and conflict/overlap validation.
- [x] Build CRUD/resolution APIs, permissions, resources, Swagger and tests.
- [x] Do not require Redis or a Variant.sale_price fallback in the first slice.
- [x] Document how future channel/customer/promotion pricing may extend without changing this base contract.

## 🎯 Acceptance Criteria

- [x] The same Variant can resolve to different prices in two branches/contexts.
- [x] Effective ranges and priority produce one deterministic result or an explicit no-price result.
- [x] Product and Variant forms do not regain a default sale-price field.
- [x] Authorization prevents cross-context price management.

## 🔗 References

- Depends on #424
- Supersedes the ProductWizard/fallback assumptions in closed issue #7

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h` · **Pessimistic:** `11h` · **Tracked:** `4h 45m`

### 📅 Sessions
```json
[
  { "date": "2026-08-24", "start": "19:58", "end": "20:40" },
  { "date": "2026-08-24", "start": "20:40", "end": "23:59" },
  { "date": "2026-08-25", "start": "00:00", "end": "00:44" }
]
```

## 📊 Retrospective
- **Actual total:** 4h 45m (42m + 199m + 44m)
- **vs optimistic:** −1h 15m
- **vs pessimistic:** −6h 15m

**Justification:** The initial TDD implementation (schema, resolution service, CRUD/resolution APIs,
policies, permissions, architecture docs, 36 Feature tests) landed quickly, well within the
optimistic estimate. The remaining time was almost entirely automated-review response cycles that
weren't part of the original scope estimate: three successive rounds of Copilot/Codex review each
surfaced genuine concurrency and edge-case bugs the initial pass missed — unlocked parent-row races
in the overlap guards, a soft-deleted `PriceList`/`ItemVariant` reference crashing validation instead
of returning a 422, a raw string date comparison that didn't sort correctly for non-ISO input, and
`Carbon::now()` bypassing this codebase's mandatory `ApplicationClock` business-timezone contract.
Each finding was fixed with its own regression test rather than patched superficially, which is real,
justified rework, not scope creep — every one of them was a legitimate correctness or race-safety
defect. A SonarCloud pass and a `/rebase-main` onto two new `main` commits closed out the branch.
Despite that additional review-response work, the total still finished comfortably under both
estimates.

