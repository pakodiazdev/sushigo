---
sprint: "003"
visibility: public
review_type: engineering-review
review_origin: contemporaneous-review-summary-verified-against-repo
review_date: 2026-08-18
---

# Sprint 003 — Development Platform & Product Reliability

## Executive summary

Sprint 003 balanced two investments: strengthening the multi-workspace development platform and
hardening SushiGo itself. The strongest product evidence was not new UI volume; it was correction
of authorization and stock-integrity risks, plus an implementation-ready Product Inventory design.

## Major outcomes

- Inventory Policies stopped authorizing unconditionally (`#400`).
- Stock mutation became concurrency-safe through row locks, application guards and PostgreSQL
  constraints (`#430`).
- Employee avatars became an end-to-end identity capability.
- Product Inventory architecture (`#421`) established Product → Variant → Purchase Presentation,
  separating catalog identity from transactional cost/price/stock.
- Dev-lab gained Bats CI, status inspection, pgAdmin support, ADRs and workflow reliability work.

## Review assessment

**Project checkpoint: ~8.5/10.**

Strongest evidence:
- transaction boundaries and PostgreSQL failure semantics;
- authorization moved from nominal Policies to real permissions;
- architecture decisions were decomposed into implementation-ready work;
- process tooling itself began receiving concurrency/ownership design.

## Delivery evidence

| Metric | Result |
|---|---:|
| Confirmed planned estimate | 27–53 h |
| Tracked confirmed SushiGo work | 35h15m |
| Known full person-hours | 44h51m |
| Known wall-clock | 28h27m |
| Known parallelization | 1.58× |
| Peak concurrency | 4 |

> Six dev-lab Issues had no session data. These figures are lower bounds and the missing time was
> correctly recorded as a gap instead of reconstructed from PR timestamps.

## Findings carried forward

- Product Inventory architecture still needed implementation proof.
- Horizontal Operating Unit authorization remained unresolved.
- Inventory public IDs were inconsistent.
- Review-agent loops could consume too much attention.
- Product/platform investment should be measured explicitly.
- Public README/package metadata still understated project quality.

## Follow-up impact

These findings directly shaped Sprint 004: Product Inventory implementation, Investment Type
classification, CI observability and continued process hardening.

## Material engineering findings

### Policy classes existed, but authorization had been effectively permissive

**What was found.** The existence of Laravel Policies gave the appearance of authorization coverage,
while some Inventory policy paths had unconditional behavior.

**Why it matters.** A security abstraction is only meaningful if its rules actually deny unauthorized
access.

**Where.**
- `code/api/app/Policies/ItemPolicy.php`
- #400 / PR #445

**Status.** Global permission checks were corrected.

**Remaining risk.** Global capability and horizontal Operating Unit scope are different problems;
the latter remains #440.

---

### Stock mutation had a concurrent overselling window

**What was found.** A read-check-decrement pattern can let two concurrent requests approve the same
available stock.

**Risk example.**

```text
on_hand = 10

R1 reads 10 → wants 7 → allowed
R2 reads 10 → wants 7 → allowed
```

Without serialization, both requests can pass the availability check.

**Why it matters.** Single-request tests can be green while production concurrency still corrupts
inventory.

**Where.**
- `code/api/app/Services/Inventory/StockMutationService.php`
- `code/api/tests/Feature/Inventory/StockMutationServiceTest.php`
- `code/api/tests/Feature/Inventory/StockBalanceInvariantsTest.php`
- #430 / PR #447

**Status.** Foundation resolved using row locks, DB invariants and first-row race recovery.

---

### Product catalog identity was mixed with transactional concepts

**What was found.** The legacy Product wizard mixed identity, UOM conversion, cost, sale price and
opening stock in one creation flow.

**Why it matters.** Independent domains become coupled and multiple sources of truth appear.

**Where.**
- `doc/architecture/product-catalog/product-catalog-architecture.en.md`
- #421 / PR #446

**Resolution.**

```text
Product → Variant → Purchase Presentation
```

was separated from purchasing, cost, pricing and Stock.

**Status.** Design validated by implementation in Sprints 004–005.

## Source of truth

- [`doc/sprints/sprint-003-development-platform-and-product-reliability.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-003-development-platform-and-product-reliability.md)
