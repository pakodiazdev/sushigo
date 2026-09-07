# 🚚 Implement auditable internal Stock Transfers

**Labels:** feature, backend, frontend, investment: product, sprint-7

## Description

Implement the missing operational workflow for moving managed Variants between Inventory Locations. A Transfer is a draft business document with source, destination, one or more lines, and a `DRAFT → POSTED → REVERSED` lifecycle. Posting atomically decrements the source, increments/creates destination Stock, and writes one immutable `TRANSFER` Stock Movement per line linked to the source document and line.

## Reason

The Stock Movement contract already recognizes `TRANSFER`, and reversal logic understands movements with both source and destination, but there is no API or UI that operators can use. Without transfers, a Receipt can put inventory into storage but the system cannot audibly move it to kitchen, bar, an event, returns, or another accessible unit.

## Objective

Deliver a concurrency-safe, idempotent, reversible, multi-line transfer workflow that preserves one physical balance per Location + Variant and validates both ends through the established Operating Unit and assignment contracts.

## Dependencies

- Depends on #567 for source-line identity/idempotency conventions and shared Stock posting primitives.
- Depends on #569 for destination assortment validation.
- Uses #568's Location capabilities and active-state contract where applicable.

## Domain decisions

- A Transfer is a separate document; a `StockMovement` remains one Variant/quantity ledger entry, not a multi-line document header.
- Saving `DRAFT` changes no Stock.
- Source and destination must be distinct, active, Stock-holding Locations accessible to the caller.
- Every destination Variant must already be assigned. Return `409` with a clear remediation instead of silently expanding assortment during an internal move.
- Posting locks Stock rows in deterministic Location/Variant order to avoid deadlocks.
- Quantity is stored and moved in base UOM; the line snapshots entry UOM, quantity, conversion factor, and base quantity.
- Reversal uses compensating movements and is rejected when destination Stock has fallen below the transferred quantity.

## ✅ Technical Tasks

### Persistence and API

- [x] 🗃️ Add `stock_transfers` and `stock_transfer_lines` with public ULIDs, lifecycle/audit fields, source/destination, UOM snapshots, and document-line uniqueness.
- [x] 🧩 Add models, relationships, factories, DTOs, resources, and explicit business exceptions.
- [x] 🔌 Add authenticated list/show/create/update/delete-draft/post/reverse endpoints using SAC controllers.
- [x] 🛡️ Require `stock.view` for reads and `stock.manage` for writes; assert Operating Unit access independently for source and destination.
- [x] ✅ Validate active, distinct Locations, positive quantities, valid UOM conversion, assigned destination Variant, and sufficient unreserved source quantity.

### Posting and reversal

- [x] 🔐 Lock the Transfer header and all affected Stock rows in deterministic order.
- [x] ➖ Decrease source through guarded `StockMutationService` behavior.
- [x] ➕ Create/increment destination Stock without duplicating the transfer's single ledger movement.
- [x] 📒 Write one immutable `TRANSFER` movement/line per Transfer line with source, destination, source document, and source-line identity.
- [x] 🔁 Make retries and concurrent post requests idempotent.
- [x] ↩️ Reverse through causally linked compensating movements and update the Transfer lifecycle atomically.
- [x] 💰 Preserve destination weighted-average cost consistently with the documented transfer-cost policy; snapshot the source cost used by each line.

### Webapp

- [x] 🖥️ Add `/inventario/transferencias` and the Inventory navigation entry.
- [x] 📝 Provide create/edit draft, source/destination selection, multi-line Variant/UOM/quantity capture, detail, post confirmation, and reverse confirmation.
- [x] 🔎 Filter Locations and Variants by access, active state, assignment, and selected source/destination.
- [ ] 📊 Preview source availability and normalized transfer quantity without treating the preview as authoritative.
- [x] ♿ Cover loading, empty, validation, conflict, focus, and mutation feedback states.

### Tests and docs

- [x] 🧪 Cover CRUD lifecycle, both-end authorization, assignment, conversion, insufficient/reserved Stock, deterministic locking, duplicate post, and rollback.
- [x] 🧪 Cover reversal success, already-reversed conflict, and consumed-destination boundary.
- [x] 🧪 Add frontend unit/integration tests and a focused Cypress happy path.
- [x] 📖 Update bilingual Inventory architecture diagrams and operational flow documentation.

## 🎯 Acceptance Criteria

- [x] Draft Transfers never change Stock.
- [x] Posting moves exactly the normalized quantity from source to destination and writes one immutable movement per line.
- [x] Both ends are active, distinct, accessible, and valid for the assigned Variant.
- [x] Concurrent/retried posts cannot move the same line twice or drive Stock below reserved/zero.
- [x] Reversal restores both balances exactly once or fails atomically at the documented boundary.
- [x] Operators can complete the lifecycle from the canonical Spanish Inventory UI.
- [x] Stock and movement history identify the Transfer and line that caused each change.

## Parallelization and ownership

- **Sprint 7 lane:** Vertical F, starts after #567 and #569; may adopt #568 independently once available.
- **Can run in parallel with:** Receipt hardening, Opening Balance, and Stock projection.
- **Primary ownership:** new Transfer migrations/models/services/controllers/routes/resources/tests and new `features/inventory/transfers` frontend.
- **Avoid touching:** Receipt and Opening Balance feature files; coordinate only on shared Stock services and Sidebar route generation.

## Out of scope

- Purchase Orders, delivery routing, automated put-away, transfer approval chains, and inter-tenant movements.
- Lots, serials, FIFO layers, or transit ownership across calendar days.
- Automatic destination assignment.
- A dedicated `Warehouse` entity.

## 🔗 References

- #430 — Stock concurrency and balance invariants.
- #438 — movement direction, immutability, and reversal.
- #440 — both-end Operating Unit access.
- #567 and #569 — Sprint 7 foundations.
- `app/Services/Inventory/StockMovementReverser.php`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `9h` · **Pessimistic:** `16h` · **Tracked:** `1h 30m`

### 📅 Sessions
```json
[
  { "date": "2026-09-05", "start": "19:42", "end": "21:12" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 30m (90m)
- **vs optimistic:** −7h 30m
- **vs pessimistic:** −14h 30m

**Justification:**
The implementation fit into one concentrated recorded session because it reused the existing Stock mutation, source-line identity, Operating Unit scope, assignment, and reversal contracts instead of introducing parallel domain primitives. Automated feature, Vitest, Cypress, and Sonar feedback made the review-response cycle fast; follow-up review findings expanded the hardening around deterministic locks, numeric boundaries, authorization metadata, pagination, and historical foreign keys without changing the core transfer workflow. The optional non-authoritative availability preview remained explicitly out of scope, avoiding a separate stock-projection UI effort.
