# 🧾 Route confirmed Purchase Receipts into eligible receiving Locations

**Labels:** enhancement, backend, frontend, investment: product, sprint-7

# 🧾 Route confirmed Purchase Receipts into eligible receiving Locations

## Description

Harden the existing Purchase Receipt vertical so a draft records an explicit, accessible receiving destination and posting is the precise moment inventory enters that Location. Filter the UI to eligible destinations, enforce the same rule server-side both when saving and when posting, and automatically establish the Variant-to-Location assignment for each successfully posted line.

## Reason

The Receipt UI currently labels and accepts a generic `destination_location_id`; validation only proves the public ID exists. A caller can submit an inactive, non-receiving, or cross-Operating-Unit Location directly even if the scoped selector would never show it. The workflow also does not state explicitly that saving `DRAFT` is non-mutating while confirmation (`POSTED`) creates or increments Stock.

## Objective

Make a confirmed Purchase Receipt the safe, auditable boundary that places supplier inventory into a valid receiving Location, with no Stock side effects while the document remains a draft.

## Dependencies

- Depends on #568 for `InventoryLocation.can_receive_purchases` and filtered Location queries.
- Depends on #567 for centralized, source-line-idempotent entry posting.
- Depends on #569 for explicit Variant-to-Location assignments.

## Domain decisions

- `POST /inventory/receipts` and `PUT` save commercial evidence as `DRAFT`; neither changes Stock, cost, assignments, or movements.
- `POST /inventory/receipts/{receipt}/post` is the only inventory-entry boundary.
- A valid destination is non-deleted, active, receiving-capable, and inside the caller's `OperatingUnitScope`.
- Destination eligibility is checked when saving and checked again under lock when posting because Location state may change while the Receipt is a draft.
- Posting a purchase is sufficient evidence that each received Variant is managed at the destination, so the assignment is ensured idempotently in the same transaction.
- Receipt reversal compensates Stock and movements but does not remove the assortment assignment.

## ✅ Technical Tasks

### Backend validation and authorization

- [x] 🛡️ Make Receipt FormRequests require `receipts.manage` and authorize `destination_location_id` through `OperatingUnitScope` rather than relying only on route middleware and a scoped selector.
- [x] ✅ Validate that the selected Location is active and `can_receive_purchases`; return field-level `422` errors when saving an invalid draft.
- [x] 🔐 Revalidate and lock the destination in `ReceiptService::postReceipt()`; return a stable `409` if a formerly valid destination became inactive/ineligible.
- [x] 🔐 Preserve Receipt-header locking and reject duplicate/concurrent posts without side effects.
- [x] 📍 Ensure each posted line's Variant-to-Location assignment in the same transaction.
- [x] 🧠 Route each line through #567's posting service and source-line identity.
- [x] 📦 Include enough destination context (`type`, Operating Unit, receiving capability) in `ReceiptResource` for an unambiguous detail view.

### Webapp workflow

- [x] 🏭 Rename the field to operational language such as "Almacén / ubicación receptora".
- [x] 🔎 Request only active, receiving-capable Locations and group or label them by Operating Unit.
- [x] 💬 State clearly that creating/updating a draft does not alter inventory and that confirmation applies quantity and effective cost.
- [x] 🔄 Invalidate Receipt, Stock, assignment, and relevant dashboard queries after posting/reversal.
- [x] ♿ Preserve accessible confirmation, loading, conflict, and validation feedback.

### Tests and docs

- [x] 🧪 Prove draft create/update/delete writes no Stock, movement, cost, or assignment.
- [x] 🧪 Cover inactive, non-receiving, soft-deleted, unknown, and cross-unit destinations on create/update and post.
- [x] 🧪 Cover a Location becoming ineligible after draft creation.
- [x] 🧪 Prove post creates/increments the exact destination Stock, assignment, weighted-average cost, and one movement per source line exactly once.
- [x] 🧪 Preserve reversal-boundary and immutable-evidence tests.
- [x] 🧪 Add frontend service/component/page tests and restore/update the Purchase Receipt Cypress path when stable.
- [x] 📖 Update bilingual Purchase Receipt and Inventory architecture documentation.

## 🎯 Acceptance Criteria

- [x] Only active, receiving-capable, accessible Locations can be saved or posted as Receipt destinations.
- [x] A Receipt in `DRAFT` never changes inventory.
- [x] Confirming a Receipt creates/increments Stock in the exact selected destination and records immutable evidence.
- [x] Every posted line is idempotent and establishes its destination assignment.
- [x] Direct API calls cannot bypass Operating Unit scope or destination capability.
- [x] A destination disabled after draft creation blocks posting with `409` and rolls back all lines.
- [x] The UI names the destination as an operational receiving Location and explains the confirmation boundary.

## Parallelization and ownership

- **Sprint 7 lane:** Vertical D, starts after #567, #568, and #569.
- **Can run in parallel with:** Opening Balance UI, internal Transfers, and assignment-aware Stock projection after the foundations merge.
- **Primary ownership:** Receipt FormRequests/service/resource/tests and `features/purchasing/receipts` frontend.
- **Avoid touching:** Stock list/dashboard controllers and the Opening Balance component.

## Out of scope

- Auto-posting a newly created Receipt.
- Purchase Orders, quality inspection, lots, expiry dates, or put-away tasks.
- A separate `Warehouse` table.
- Internal transfer implementation.

## 🔗 References

- #432 and #433 — current Purchase Receipt API and UI.
- #440 — Operating Unit access contract.
- #567, #568, #569 — Sprint 7 foundations.
- `doc/architecture/purchasing/purchase-receipts.en.md`
- `doc/architecture/purchasing/purchase-receipts.es.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `52m`

### 📅 Sessions
```json
[
  { "date": "2026-09-05", "start": "21:32", "end": "22:24" }
]
```

## 🤔 Assumptions

- **`receipts.manage` in `authorize()` is additive defense-in-depth.** The route
  middleware (`permission:receipts.manage`) already enforces it; the architecture doc
  (`purchase-receipts.en.md` § "API and authorization") confirms `receipts.manage` governs
  create/update/delete/post/reverse. Adding it to `ReceiptRequest::authorize()` closes the
  "reaches the FormRequest without route middleware" path the issue calls out.
- **Post-time destination ineligibility reuses `ReceiptDestinationUnavailableException` → HTTP
  409.** The exception and its 409 mapping in `PostReceiptController` already exist for the
  soft-deleted case; the architecture doc only specifies "409 if it changed afterward", so no
  new exception type or sub-code is introduced.
- **Variant-to-Location assignment is ensured via a shared service** (`VariantLocationAssignmentEnsurer`)
  extracted from the existing inline `assignOrRecover`/`insertOrRecoverLive` in
  `AssignVariantToLocationController` (#569); that controller is refactored to consume the same
  action so the race-recovery behaviour stays identical and un-duplicated.
- **The `purchase-receipts.cy.ts` Cypress spec stays quarantined.** It is blocked on #548
  (native `<option>` visibility assertion bug, tracked from #490), not on this issue — the
  issue's "restore … when stable" precondition is unmet. The happy path is covered by the
  Vitest component/hook suites instead.

## 📊 Retrospective
- **Actual total:** 0h 52m (52m)
- **vs optimistic:** −4h 08m
- **vs pessimistic:** −8h 08m

**Justification:**
The implementation stayed well below the estimate because the receiving-capability, shared entry-posting, and assignment foundations were already available to compose. Automated review exposed additional concurrency and archived-row edge cases; centralizing assignment enforcement in the shared Stock mutation path resolved those follow-up findings without expanding the product scope, while focused regression coverage verified the unified lock order. The Cypress path remains quarantined under #548 because its stated stability precondition is still unmet, with the shipped frontend behavior covered by component and hook tests.
