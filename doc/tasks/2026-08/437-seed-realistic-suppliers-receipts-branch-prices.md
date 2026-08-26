# 🌱 Seed realistic Suppliers, Receipts, acquisition costs and branch prices

**Labels:** backend, sprint-5, investment: product-engineering

## Description

Create operational Testing/Fakes/Development data separate from the Product catalog seeders.

## Reason

The system needs a believable end-to-end story demonstrating how package, supplier, promotion and branch context affect cost and price.

## Objective

Seed Suppliers, offerings, receipts, effective acquisition costs and differing branch prices in deterministic/config-driven tiers.

## ✅ Technical Tasks

- [x] Create minimal deterministic Testing fixtures and volume Fakes.
- [x] Create Development Suppliers with different presentation quotations.
- [x] Seed a receipt with paid and bonus packages plus an allocated freight/expense example.
- [x] Verify the resulting Stock balance and weighted-average cost.
- [x] Seed at least two branch/context prices for the same Variant.
- [x] Use ApplicationClock/config-driven values and repeatable restore-on-reseed behavior.

## 🎯 Acceptance Criteria

- [x] Development data visibly demonstrates package normalization and effective acquisition cost.
- [x] At least one promotion and one branch-price difference are represented.
- [x] Re-seeding is idempotent and time-stable.
- [x] Operational seeders do not overwrite the reusable catalog definitions.

## 🔗 References

- Depends on #431, #432, #433, #434, #435 and #436

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `2h 38m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "21:00", "end": "22:51" },
  { "date": "2026-08-25", "start": "22:51", "end": "23:38" }
]
```

## 📊 Retrospective

- **Actual total:** 2h 38m (1h 51m + 47m)
- **vs optimistic:** −22m
- **vs pessimistic:** −3h 22m

**Justification:**

Session 1 covered the full implementation: researching the existing purchasing/pricing domain
(#431–#436) and its architecture docs to ground the "branch/context price" and "promotion"
Acceptance Criteria in the actual `PriceListAssignment`/`PriceList` model rather than inventing new
concepts, then building all three Development seeders (Supplier, PurchaseReceipt, Pricing), the
Testing/Fakes counterparts, 16 PHPUnit tests, and verifying the whole thing end-to-end with a real
`migrate:fresh --seed` run. That research paid off — the implementation matched the codebase's
established patterns closely enough that most of session 2 was small, mechanical fixes rather than
rework: 7 Copilot/Codex review threads (5 addressed — `ApplicationClock` instead of `Carbon::now()`
in the Testing seeder, a `withTrashed()` idempotency gap, three unchecked `first()` lookups replaced
with `firstOrFail()`, and an unused config key removed — 1 skipped as matching an existing codebase
precedent) and one SonarCloud code-smell (an over-the-limit return count in
`PurchaseReceiptSeeder::run()`, fixed by extracting three guard-clause helper methods). No scope
changes were requested mid-flight; the time under estimate reflects that the domain groundwork from
#431–#436 was already solid enough that this issue was genuinely "just" data.




