# 📦 Expose an auditable Opening Balance workflow

**Labels:** feature, backend, frontend, investment: product, sprint-7

# 📦 Expose an auditable Opening Balance workflow

## Description

Connect the existing but orphaned Opening Balance form to the canonical `/inventario/existencias` workflow, align it with the centralized posting contract, and make its initialization semantics explicit. An authorized operator must be able to select an accessible active Location and Variant, enter quantity/UOM/cost/reference, and post auditable initial inventory.

## Reason

The API and `OpeningBalanceForm` exist, but no page mounts the component. Operators therefore cannot initialize Stock through the product UI. The current form is also English-only, does not participate in the canonical query invalidation flow, and does not communicate the difference between initial inventory and an ordinary adjustment or purchase receipt.

## Objective

Deliver a discoverable, permission-aware Opening Balance workflow that posts through the same ledger/Stock boundary as other entries and establishes the Variant's Location assignment without pretending a supplier purchase occurred.

## Dependencies

- Depends on #567 for centralized source-identified entry posting.
- Depends on #569 for Variant-to-Location assignment.
- Uses the existing Operating Unit access contract from #440.

## Domain decisions

- Opening Balance is an explicit `OPENING_BALANCE` movement with no source Location; it is not a Receipt.
- Posting is immediate: there is no Opening Balance draft document in Sprint 7.
- The destination must be active and accessible but does not need `can_receive_purchases`, because initialization is not supplier receiving.
- Posting ensures the Variant-to-Location assignment in the same transaction.
- Repeated Opening Balance entries remain auditable additions; corrections use immutable reversal/adjustment semantics rather than editing posted history.
- Quantity is converted to the Variant's base UOM by the existing conversion contract; cost lands only on destination `Stock.weighted_avg_cost`.

## ✅ Technical Tasks

### Backend contract

- [x] 🧠 Complete the #567 adoption in `OpeningBalanceService` and provide stable source identity/reference behavior for manual postings.
- [x] 🛡️ Revalidate active Location state and `OperatingUnitScope` at mutation time.
- [x] 📍 Ensure the Variant-to-Location assignment atomically with the entry.
- [x] 📦 Align response/error handling with current API conventions; do not collapse authorization, validation, and business conflicts into a generic `400`.
- [x] 📖 Reconcile OpenAPI examples with public ULIDs and the normalized Stock Movement response.

### Webapp

- [x] 🔗 Mount `OpeningBalanceForm` from the canonical Existencias page behind `stock.manage`.
- [x] 🌎 Translate all visible copy and validation feedback to Spanish.
- [x] 🔎 Limit Location options to active accessible results and Variant options to valid catalog entries.
- [x] 🧮 Show entry UOM, normalized/base quantity when conversion applies, unit cost, and total value before submit.
- [x] 💬 Explain that this action initializes/adds inventory and writes permanent audit evidence.
- [x] 🔄 Invalidate Stock-by-location, Stock list, assignment, low-stock, and valuation queries after success.
- [x] ♿ Restore focus to the opener and provide accessible loading/success/error behavior.

### Tests and docs

- [x] 🧪 Cover active/inactive/cross-unit Location authorization and public-ID validation.
- [x] 🧪 Prove entry creates/increments Stock, assignment, weighted-average cost, normalized movement, and line atomically.
- [x] 🧪 Preserve UOM conversion, explicit zero cost, missing cost, and concurrency coverage.
- [x] 🧪 Add form/page tests for permissions, conversion preview, submission, errors, and query invalidation.
- [x] 🧪 Add or update a focused Cypress path for opening inventory and seeing it in Existencias.
- [x] 📖 Update bilingual Inventory architecture with the initialization flow and correction rule.

## 🎯 Acceptance Criteria

- [x] A `stock.manage` user can open the balance form from `/inventario/existencias`.
- [x] A user without `stock.manage` can view permitted Stock but cannot see or invoke the mutation.
- [x] Posting writes `OPENING_BALANCE`, Stock, cost, line evidence, and assignment atomically.
- [x] Inactive or inaccessible Locations cannot receive an Opening Balance.
- [x] UOM conversion and cost preview match the backend result.
- [x] The updated balance and valuation appear without a full-page reload.
- [x] Posted history is never edited in place.

## Parallelization and ownership

- **Sprint 7 lane:** Vertical E, starts after #567 and #569.
- **Can run in parallel with:** Receipt hardening, internal Transfers, and Stock projection.
- **Primary ownership:** Opening Balance controller/request/service/response/tests, `opening-balance-form.tsx`, and its integration into Existencias.
- **Coordination boundary:** the Stock projection issue owns broad dashboard query/rendering changes; this issue only adds the action and invalidation.

## Out of scope

- Bulk spreadsheet initialization.
- An initialization-session/approval document.
- Purchase receiving eligibility.
- Editing or deleting posted Stock Movements.
- Lot/FIFO cost layers.

## 🔗 References

- #434 — destination Stock weighted-average cost.
- #438 — immutable movement/reversal contract.
- #440 — Operating Unit access.
- #567 and #569 — Sprint 7 foundations.
- `app/Services/Inventory/OpeningBalanceService.php`
- `webapp/src/components/inventory/opening-balance-form.tsx`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `3h 50m`

### 📅 Sessions
```json
[
  { "date": "2026-09-05", "start": "21:34", "end": "23:49" },
  { "date": "2026-09-07", "start": "20:05", "end": "21:40" }
]
```

## 📊 Retrospective
- **Actual total:** 3h 50m (230m) — session 1: 135m · session 2: 95m
- **vs optimistic:** −1h 10m
- **vs pessimistic:** −5h 10m

**Justification:**
Session 1 landed the whole workflow well under estimate — the existing API and `OpeningBalanceForm` were a strong starting point — with time left over absorbed by automated-review cycles that surfaced preview/posting parity, optional-cost, decimal-boundary, and concurrency gaps. Session 2 was post-review integration work that fell outside the first sitting: `main` had merged #572, which had independently refactored the shared `StockMutationService` / assignment-ensurer surface this branch also touched, so the branch was rebased and the two designs reconciled onto #572's `VariantLocationAssignmentEnsurer` (dropping this branch's parallel `EnsureVariantLocationAssignment`). The same session cleared two Codex findings — rounding the converted unit cost only on persisted values so large balances record the exact immutable total, and comparing the accumulated balance at decimal(15,4) scale so a binary-float sum no longer 422s a value the column stores exactly — each with focused regression coverage. Still comfortably inside the pessimistic bound.


