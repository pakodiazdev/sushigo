# 🧠 Centralize idempotent Inventory entry posting

**Labels:** backend, 🔨 technical-debt, investment: product-engineering, sprint-7

# 🧠 Centralize idempotent Inventory entry posting

## Description

Introduce one domain service that atomically posts inbound inventory evidence and its Stock projection. Purchase Receipts and Opening Balances currently share `StockMutationService`, but each independently orchestrates Stock mutation, weighted-average cost, `StockMovement`, and `StockMovementLine` creation in a different order.

The new posting boundary must accept a normalized base quantity and source identity, lock or create the destination Stock safely, blend cost when supplied, and append the immutable movement evidence as one transactionally consistent operation.

## Reason

The current duplication makes future entry paths (supplier returns, imports, corrections) vulnerable to missing evidence, divergent cost behavior, or replaying the same source line. Receipt-header locking prevents today's normal double-post, but it is not a reusable idempotency contract for queue retries, imports, or other source documents.

## Objective

Make all inbound inventory writers use one tested posting primitive with explicit source-line idempotency, preserving the existing Stock concurrency invariants and immutable movement contract.

## Domain decisions

- `StockMovement` is the append-only audit ledger; `Stock` is the current-balance projection optimized for reads.
- The operation receives quantities already normalized to the Variant's base UOM; document-specific conversion remains with the calling workflow.
- A business document owns the outer transaction and lifecycle; the posting service does not independently mark a Receipt `POSTED`.
- Source identity is explicit per document line. Extend the current `related_type` / `related_id` contract with a source-line key (for example `related_line_id`) rather than hiding identity inside `meta`.
- A database uniqueness rule is the final idempotency backstop. Replaying the same source + line + reason must return/reject deterministically without incrementing Stock twice.
- Existing immutable reversal rules from #438 remain authoritative.

## ✅ Technical Tasks

### Contract and migration

- [x] 🗃️ Add the minimum source-line identity column/index needed to distinguish multiple lines from one source document.
- [x] 🔒 Add a partial or equivalent unique database constraint for live posted source-line movements, preserving null source support for manual movements.
- [x] 🔄 Provide a reversible migration and prove existing Receipt movements remain valid.

### Domain service

- [x] 🧠 Add a typed DTO/value object for a normalized inbound posting command.
- [x] ⚙️ Add `InventoryEntryPostingService` under `app/Services/Inventory`.
- [x] 🔐 Reuse `StockMutationService::receiveInto()` for first-row race recovery and locked increments.
- [x] 💰 Reuse `Stock::applyWeightedAverageCost()`; a null cost means no blend, while explicit zero remains a real cost.
- [x] 📒 Create one normalized `StockMovement` plus its optional single `StockMovementLine`, complying with #438.
- [x] 🔁 Make replay behavior deterministic and test both sequential and concurrent duplicate attempts.

### Adopt existing entry writers

- [x] 🔁 Refactor `OpeningBalanceService` to use the new posting service without changing its HTTP response or UOM conversion rules.
- [x] 🧾 Refactor Receipt posting per line to use the new service while preserving Receipt header locking, effective-cost snapshots, reversal behavior, and final lifecycle update.
- [x] ♻️ Remove only orchestration duplication made obsolete by the new service; do not broaden the issue into Stock Movement schema cleanup.

### Tests and documentation

- [x] 🧪 Unit-test normalized posting, first entry, repeat entry, zero/null cost, and idempotent replay.
- [x] 🧪 Extend Opening Balance, Receipt posting, Receipt reversal, Stock mutation concurrency, and Stock Movement contract tests.
- [x] 🧪 Verify a failure at any step rolls back Stock, cost, movement, line, and document state together.
- [x] 📖 Update bilingual Inventory and Purchase Receipt architecture documents with the ledger/projection boundary and source identity.
- [x] 🧹 Run the full Inventory API regression suite and Pint.

## 🎯 Acceptance Criteria

- [x] Purchase Receipts and Opening Balances use the same inbound posting service.
- [x] A successful inbound posting changes Stock and appends immutable evidence atomically.
- [x] The same source line cannot increment Stock more than once, even when retried.
- [x] Multiple different lines from the same Receipt can post independently.
- [x] Existing first-receipt race recovery and non-negative Stock invariants remain green.
- [x] Receipt reversal remains causally linked and restores Stock at most once.
- [x] No frontend behavior or Location eligibility rule is added in this issue.

## Parallelization and ownership

- **Sprint 7 lane:** Foundation B.
- **Can run in parallel with:** receiving-capable Locations and Variant-to-Location assignments.
- **Primary ownership:** Inventory posting DTO/service, movement source identity migration, `OpeningBalanceService`, backend portion of `ReceiptService`.
- **Coordination boundary:** dependent Receipt, Opening Balance, and Transfer issues must consume this contract after merge rather than independently changing Stock-writing orchestration.

## Out of scope

- Location receiving eligibility.
- Receipt form changes.
- Opening Balance navigation/UI.
- Transfer endpoints/UI.
- Lot/FIFO costing or recomputing weighted-average cost during reversal.
- Removing redundant legacy columns from `stock_movement_lines`.

## 🔗 References

- #430 — concurrent Stock safety.
- #434 — per-Location weighted-average cost.
- #438 — normalized immutable Stock Movement contract and reversals.
- #432 — Purchase Receipt effective-cost posting.
- `app/Services/Inventory/StockMutationService.php`
- `app/Services/Inventory/OpeningBalanceService.php`
- `app/Services/Inventory/ReceiptService.php`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `7h` · **Pessimistic:** `12h` · **Tracked:** `1h 21m`

### 📅 Sessions
```json
[
  { "date": "2026-09-01", "start": "17:58", "end": "18:28" },
  { "date": "2026-09-01", "start": "18:35", "end": "19:26" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 21m (30m + 51m)
- **vs optimistic:** −5h 39m
- **vs pessimistic:** −10h 39m

**Justification:**
Delivered in two sessions, far under even the optimistic estimate. Session 1 (30m) landed the whole primitive — the source-line-identity migration, the `InventoryEntryPostingData`/`InventoryEntryLineData` DTOs, `InventoryEntryPostingService`, and its adoption by `OpeningBalanceService` and `ReceiptService::postReceipt` — because every piece it depends on already existed to copy: `StockMutationService::insertOrRecoverFromRace()` was a ready template for the savepoint/race pattern, `Stock::applyWeightedAverageCost()` and the `#438` immutable-movement contract were reusable as-is, the partial-unique-index idiom was already established elsewhere in `database/migrations/`, and `inventory-architecture.en.md` §3.12 already named the `related_line_id` column and the `InventoryEntryPostingService` class, so there was no design ambiguity to resolve. The 7–12h estimate assumed a human doing that exploration and cross-checking from scratch.

Session 2 (51m) was entirely review-driven rework: three Codex findings over two rounds, each a real correctness gap in the concurrency/rollback edges — (1) the duplicate-movement `INSERT` was not isolated in a savepoint, so a lost uniqueness race aborted the caller's outer transaction and the recovery query failed with `SQLSTATE 25P02`; (2) a partial source-identity triple (`sourceLineId` set, parent fields null) silently bypassed the uniqueness backstop because NULLs don't collide in the partial index, letting concurrent duplicates both increment Stock — fixed by making the DTO's source triple all-or-nothing and tightening the index predicate; (3) migration `down()` dropped `related_line_id` without restoring `meta.receipt_line_id`, which would have left receipts posted under the new schema unreversible after a paired code rollback. All fixed with tests and re-validated through CI.


