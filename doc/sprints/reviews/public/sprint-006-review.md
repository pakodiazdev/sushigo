---
sprint: "006"
visibility: public
review_type: engineering-review
review_origin: post-sprint-review-verified-against-repo
review_date: 2026-08-30
reviewed_head: cf5c7e444dd5d259ebb50c2f59843af4f3deb6a1
---

# Sprint 006 — Stock Integrity & Inventory Completion

## Executive summary

Sprint 006 closed the Product Inventory reconstruction by making Stock evidence immutable,
replenishment location-specific, Inventory access horizontally scoped, navigation coherent, and
legacy cost/price fields removable through reconciliation rather than assumption.

The sprint delivered less visible product surface than Sprint 005, but materially improved the
trustworthiness of every later receiving, transfer, count and valuation workflow.

```text
Capability permission + Operating Unit membership
                         ↓
Location-scoped Stock → immutable movement evidence → compensating reversal
                         ↓
             location-specific replenishment
```

**Project checkpoint: ~9.1/10.**

**Sprint review: ~9.0/10.**

These scores are subjective review checkpoints, not project KPIs or certifications.

## Major outcomes

- A single-line `StockMovement` contract with positive quantities and database-backed reversal
  uniqueness (`#438`).
- Posted movements and lines became append-only evidence; corrections use causally linked
  compensating movements.
- Replenishment thresholds moved from global Variant fields to Location + Variant policies
  (`#439`).
- `OperatingUnitScope` became the shared horizontal authorization boundary for delivered Inventory
  locations, Stock queries, Opening Balance, Stock Out and replenishment policies (`#440`).
- Inventory navigation converged on one canonical Spanish `/inventario/*` route tree (`#441`).
- Superseded Variant cost/price columns were archived internally, removed from every consumer and
  dropped with a tested rollback path (`#442`).

## Delivery evidence

| Metric | Result |
|---|---:|
| Planned scope | 5 Issues |
| Delivered | 5/5 |
| Planned effort | 24–48 h |
| Formal tracked effort | 12h05m |
| Opportunistic tracked effort | 3h14m |
| Total tracked effort | 15h19m |
| Reconstructed wall-clock | ~11h36m |
| Reconstructed parallelization | ~1.32× |

The formal work finished well below the optimistic estimate. That result is credible because the
sprint reused architecture established during Sprints 4–5 and sequenced destructive cleanup last;
it should not be generalized into an expectation that future transaction workflows will also land
at half their optimistic estimate.

## Verification performed for this review

- 66 focused API tests passed across Stock Movement contracts/reversal, Operating Unit access,
  replenishment policy, legacy-threshold migration and legacy-field removal.
- 34 focused frontend tests passed across Inventory types, shared panels and replenishment UI.
- The API run emitted only the existing PHP 8.5 `ReflectionMethod::setAccessible()` deprecation
  from Collision.
- The frontend run passed but emitted TanStack Router warnings for helper/test modules located
  inside `src/pages`, including `pages/inventario/use-products-list.ts`.

## Strong architectural signals

1. **Posted evidence is corrected, not rewritten.** Reversal is modeled as an append-only,
   linked compensation and guarded by both locks and uniqueness.
2. **Authorization has two dimensions.** A permission answers *what* a user may do;
   `OperatingUnitScope` answers *where*.
3. **Operational policy follows custody.** Reorder thresholds belong to Location + Variant, not
   globally to catalog identity.
4. **Deletion followed evidence.** #442 archived exact legacy financial values and tested the
   migration round trip before removing columns.
5. **Frontend consolidation reduced competing workflows.** Canonical routes and shared list
   scaffolding made the remaining UI debt explicit instead of hiding it in duplicate screens.

## Previous-review disposition

| Sprint 005 finding | Sprint 006 result |
|---|---|
| Horizontal Operating Unit authorization | Shared boundary delivered by #440 for the audited surfaces; Receipt destination and movement-ledger consumers continue in Sprint 7 #572/#574 |
| Immutable Stock correction | Quantity compensation and causal linkage delivered by #438 |
| Receipt reversal valuation | Still open; quantity is corrected but weighted-average valuation requires Sprint 8 #579 |
| Exact-decimal money boundary | Still open; Sprint 8 #415 implements TD-05 |
| Workflow-specific lookup OR permissions | Still open; Sprint 8 #580 |
| OpenAPI public-ID drift | Still open; Sprint 8 #581 |

## Material engineering findings

### Medium — unresolved legacy thresholds were logged but not durably preserved

**What was found.** `LegacyThresholdMigrator` deliberately does not place a global legacy threshold
when a Variant has zero or multiple Stock locations. It returns the unresolved values and writes a
warning. The enclosing migration then drops `item_variants.min_stock` and `max_stock`.

**Why it matters.** Logging is useful diagnostic evidence, but it is not a durable reconciliation
or rollback source. If production contains an unresolved non-zero pair and logs are unavailable or
expire, the original values cannot be recovered exactly after the columns are dropped. The
migration's `down()` can reconstruct only from policies that were actually created.

**Where.**

- `code/api/app/Services/Inventory/LegacyThresholdMigrator.php`
- `code/api/database/migrations/2026_08_26_210500_move_variant_stock_thresholds_to_location_policies.php`

**Disposition.** No incorrect target Location should be invented. Before this pattern is reused in
a production migration, choose one durable strategy: block on unresolved rows, archive them in a
reconciliation table, or require an explicit operator mapping. Audit whether any real environment
already applied #439 with unresolved rows. This review did not create a new issue because impact
depends on deployment data and log retention.

---

### Medium — Stock Movement still persists duplicated Variant and base quantity

**What was found.** The normalized header owns `item_variant_id` and `qty`, while
`StockMovementLine` repeats `item_variant_id` and `base_qty`. Model guards keep them aligned and a
unique index enforces one line, but raw database writers can still create disagreement because
cross-table equality is not a database constraint.

**Risk.** Duplicate sources increase every writer, serializer and migration's change surface and
make movement-ledger semantics harder to explain.

**Disposition.** Sprint 8 [#575](https://github.com/pakodiazdev/sushigo/issues/575) owns reconciled
removal after Sprint 7 finalizes posting, Transfer and ledger contracts.

---

### Medium — the API test database can still produce a misleading failure cascade

**What was found.** Sprint 6 execution observed an initial `unique_stock_per_location` collision
that left a PostgreSQL transaction aborted; later Payroll tests then appeared to fail until retry.

**Why it matters.** A green retry does not prove isolation. Secondary failures can hide the real
Inventory producer and waste review time on the wrong module.

**Disposition.** Sprint 8 [#578](https://github.com/pakodiazdev/sushigo/issues/578) owns first-failure
capture, factory/seed diagnosis, shard/workspace database isolation and fail-fast reporting.

---

### Medium — Inventory E2E evidence and shared screen states remain incomplete

**What was found.** #441 established the canonical routes, but its navigation Cypress path remains
quarantined and loading/empty/error/permission behavior was explicitly deferred. A written or
skipped E2E spec is not an executed regression gate.

**Disposition.** Sprint 7 #544 restores navigation E2E. Sprint 8
[#576](https://github.com/pakodiazdev/sushigo/issues/576) standardizes user-visible states and
Spanish copy.

---

### Low — route generation scans helper and test files as candidate routes

**What was found.** Focused Vitest execution emits repeated TanStack Router warnings because
non-route helpers and tests live under `src/pages`. Sprint 6 contributes
`src/pages/inventario/use-products-list.ts` and its test to this pattern.

**Risk.** Current builds pass, but persistent warning noise can hide a real missing-route export and
weakens the intended boundary between thin route adapters and feature code.

**Disposition.** Fold the Inventory-specific cleanup and a reusable placement/ignore convention
into Sprint 8 [#577](https://github.com/pakodiazdev/sushigo/issues/577), which already owns
route-level structure and code splitting.

---

### High / inherited — Receipt reversal valuation remains inconsistent

Sprint 6 correctly delivered immutable quantity compensation, but it did not and could not infer a
historically correct weighted-average cost after intervening consumption or purchases. The original
Sprint 5 finding therefore remains open rather than being credited as resolved by #438.

**Disposition.** Sprint 8 [#579](https://github.com/pakodiazdev/sushigo/issues/579) owns the value
ledger/snapshot decision and reconciliation tests.

## Follow-up disposition summary

| Finding | Disposition |
|---|---|
| Ambiguous legacy thresholds not durably archived | Audit deployment evidence; file remediation if unresolved real rows existed |
| Redundant movement-line Variant/base quantity | Sprint 8 #575 |
| Shared Inventory UI states/copy | Sprint 8 #576 |
| Route helper warnings and lazy boundaries | Sprint 8 #577 |
| API transaction poisoning / DB isolation | Sprint 8 #578 |
| Receipt reversal valuation | Sprint 8 #579 |
| Navigation E2E quarantine | Sprint 7 #544 |

## Next checkpoint

Sprint 7 should prove that the Sprint 6 foundations survive new writers and readers:

- one idempotent inbound posting boundary;
- receiving-capable and Operating-Unit-scoped destinations;
- explicit managed assortment independent from Stock rows;
- reachable Opening Balance;
- atomic internal Transfers;
- a read-only, scoped movement ledger;
- restored Cypress evidence for the affected Inventory flows.

## Source of truth

- [`doc/sprints/sprint-006-stock-integrity-and-inventory-completion.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-006-stock-integrity-and-inventory-completion.md)
- Reviewed head: [`cf5c7e44`](https://github.com/pakodiazdev/sushigo/commit/cf5c7e444dd5d259ebb50c2f59843af4f3deb6a1)
