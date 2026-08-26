# Purchase Receipts

Issue `#432` is the acquisition-cost authority Supplier Offerings (`#431`) explicitly defer to. A
Receipt records the actual commercial transaction — supplier, presentation, paid/received/bonus
packages, discounts, allocated expenses, non-recoverable taxes — and posting it is the only path
that mutates Stock's weighted-average cost for a purchase.

## Model

```text
Supplier 1 ── * Receipt 1 ── * ReceiptLine * ── 1 VariantPurchasePresentation
```

- `Receipt` (header): public ULID, `supplier`, `destination_location`, `reference`, `receipt_date`,
  `notes`, and a `DRAFT → POSTED → REVERSED` lifecycle (`status` plus `posted_at`/`posted_by_user_id`
  and `reversed_at`/`reversed_by_user_id`/`reversal_reason`).
- `ReceiptLine`: snapshots everything needed to reproduce cost, immutably, once posted —
  `presentation_factor` (the Purchase Presentation Template's `base_unit_quantity` at the time this
  line was created, independent of later template changes), `ordered_packages`,
  `received_packages` (total physical packages received, bonus packages already included),
  `bonus_packages` (the free subset of `received_packages`), `gross_amount`, `discounts`,
  `allocated_expenses`, `non_recoverable_taxes`, and the two computed, stored fields
  `net_acquisition_amount` and `base_units_received`/`effective_unit_cost`.

## Cost calculation

```text
net_acquisition_amount = gross_amount − discounts + allocated_expenses + non_recoverable_taxes
base_units_received    = received_packages × presentation_factor
effective_unit_cost    = net_acquisition_amount / base_units_received
```

`gross_amount` covers only the *paid* portion of `received_packages` — bonus packages are physically
received (they inflate `base_units_received`) but never add to `net_acquisition_amount`. That
asymmetry is what makes bonus packages lower `effective_unit_cost` without touching
`presentation_factor`. These fields are computed once, while the Receipt is a draft, and are never
recomputed after posting — the stored values *are* the audit evidence.

## Posting

Posting a Receipt (`ReceiptService::postReceipt`) is atomic per line: it locks the Receipt header row
for the duration of the transaction (closing the same duplicate/concurrent-posting gap #430 closed
for Stock itself), then for every line calls the existing `StockMutationService::receiveInto()` —
the exact lock/race-recovery pattern #430 introduced for Stock — and writes immutable
`StockMovement`/`StockMovementLine` evidence (`reason: PURCHASE_RECEIPT`, linked back to the Receipt
via `related_id`/`related_type`). Reversing a posted Receipt (`reverseReceipt`) decreases Stock by
the same base units through Stock's own guarded `decreaseOnHand()`; if consumption has since dropped
on-hand below what the receipt added, reversal is rejected (`ReceiptReversalBoundaryException`)
rather than driving Stock negative.

Acquisition cost lands on `Stock.weighted_avg_cost`, never on `ItemVariant` — the issue is explicit
that cost "must not be entered on Product or Variant". `#434` unified this: `OpeningBalanceService`
now blends into the same per-location `Stock.weighted_avg_cost` (via `Stock::applyWeightedAverageCost()`
and the shared `WeightedAverageCostCalculator`) instead of writing `ItemVariant.avg_unit_cost` —
see `inventory-architecture.en.md` § "Weighted-average cost" for the full unification.

## API and authorization

Authenticated endpoints live below `/api/v1/inventory/receipts`, plus `{receipt}/post` and
`{receipt}/reverse` action endpoints. Public ULIDs are the only external identifiers.

- `receipts.view`: list/show Receipts.
- `receipts.manage`: create/update/delete a draft, post, and reverse.

**As-built (`#433`):** the UI's own header/line lookups the Receipt form needs — `GET
/inventory/suppliers`, `GET /inventory/suppliers/{supplier}/offerings`, `GET
/inventory-locations`, `GET /inventory/products`, `GET /inventory/products/{product}/variants`,
and `GET .../variants/{variant}/purchase-presentations` — now also accept `receipts.manage` as an
alternative to their own view permission (`suppliers.view`, `inventory_locations.view`,
`items.view`), the same way `suppliers.manage` was already widened onto the product/variant/
presentation list endpoints for the Supplier Offering cascade (`#505`). Without this, a role
holding only `receipts.manage` could open the Receipt create form but every one of its selects
would fail authorization and come back empty.

Editing or deleting is only allowed while a Receipt is still a draft; posting/reversing a Receipt
that isn't in the expected state returns `409`, never a silent no-op.
