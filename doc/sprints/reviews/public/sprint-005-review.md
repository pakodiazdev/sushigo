---
sprint: "005"
visibility: public
review_type: engineering-review
review_origin: contemporaneous-review-summary-verified-against-repo
review_date: 2026-08-26
reviewed_head: 28e87f8ea9355eb73f9ba677751144afec2cfd67
---

# Sprint 005 — Purchasing, Cost & Pricing

## Executive summary

Sprint 005 turned the catalog into an operational commercial chain:

```text
Product → Variant → Purchase Presentation
        → Supplier Offering
        → Purchase Receipt
        → Stock / Weighted Average Cost

Variant → Price List → Branch / Operating Unit → Resolved Sale Price
```

This is the most important product-domain expansion since the inventory redesign because catalog
identity now supports real purchase evidence, acquisition cost and context-aware selling price.

**Project checkpoint: ~9.0/10.**  
**Sprint review: ~9.2/10.**

## Major outcomes

- Suppliers and reference-only offerings (`#431`).
- Immutable Purchase Receipt lifecycle: DRAFT → POSTED → REVERSED (`#432`).
- Purchase receiving UI with live effective-cost preview (`#433`).
- one location-scoped weighted-average cost source using BCMath internally (`#434`).
- effective-dated Price Lists with Branch / Operating Unit resolution (`#435`).
- full pricing management UI and resolution preview (`#436`).
- deterministic purchasing/pricing operational seed story (`#437`).
- Inventory public-ID rollout (`#399`) delivered opportunistically.
- API/package licensing identity was corrected in nearby opportunistic work.

## Delivery evidence

| Metric | Result |
|---|---:|
| Planned scope | 7 Issues |
| Delivered | 7/7 |
| Planned effort | 36–67 h |
| Directly tracked formal effort | ~34h19m |
| Reconstructed wall-clock from logged sessions | ~24h20m |
| Reconstructed parallelization | ~1.41× |

> The tracked figure is a lower bound. `#399` had no session log and multiple Issue retrospectives
> explicitly note review/hardening work outside their recorded Sessions.

## Strong architectural signals

1. **Quotation ≠ cost.** Supplier quotes remain mutable reference data.
2. **Purchase evidence owns acquisition cost.** Receipt lines snapshot the commercial facts that
   produced the cost.
3. **Cost is location-scoped.** Stock valuation is no longer treated as one global Variant value.
4. **Price ≠ Product attribute.** Effective-dated price lists resolve by operational context.
5. **Feature-oriented frontend structure is now real.** `features/purchasing` and
   `features/pricing` are clear verticals.

## Material review findings

### High — receipt reversal valuation
Receipt reversal currently removes received quantity but intentionally leaves
`weighted_avg_cost` unchanged. That can misstate inventory valuation after reversal. Sprint 006's
movement/reversal work should define the correct cost-reconciliation semantics.

### Medium — decimal boundaries
The weighted-average blend uses BCMath, but Receipt DTOs/calculations still cross PHP `float`
boundaries for monetary values. This is acceptable as transitional debt, not full exact-decimal
end-to-end arithmetic.

### High — horizontal authorization still pending
Global capability checks do not by themselves prove that a user is authorized for a specific
Operating Unit. `#440` remains a critical Sprint 006 boundary.

### Low — documentation drift
OpenAPI still contains some legacy integer-ID descriptions even where controllers resolve public
IDs. The root README also contains manually maintained metrics that age quickly.

## Next checkpoint

Sprint 006 should complete Inventory by focusing on:

- immutable/compensating Stock Movement semantics;
- receipt reversal cost correctness;
- Operating Unit horizontal authorization;
- location-specific replenishment;
- final Inventory navigation;
- evidence-backed removal of legacy fields.

## Material engineering findings

### High — Purchase Receipt reversal can leave inventory valuation inconsistent

**What was found.** `ReceiptService::reverseReceipt()` decreases the received quantity but
intentionally leaves `weighted_avg_cost` unchanged.

**Why it matters.** Quantity can return to a previous state while valuation does not.

**Risk example.**

```text
Initial: 100 units @ $10
Receive: 100 units @ $20
Weighted average: 200 units @ $15

Reverse receipt:
Quantity → 100
weighted_avg_cost → still $15
```

The resulting valuation is $1,500 instead of the original $1,000.

**Where.**
- `code/api/app/Services/Inventory/ReceiptService.php`
- method `reverseReceipt()`
- follow-up target: #438

**Risk.** Margin, valuation and later reporting can consume an inconsistent cost.

**Status.** Open; should be addressed explicitly in Sprint 006.

---

### High — Horizontal Operating Unit authorization is still incomplete

**What was found.** Global permissions answer whether a user has a capability, but do not by
themselves prove membership in the specific Operating Unit being accessed.

**Risk example.**

```text
user has receipts.manage for Unit A
→ submits destination_location public_id belonging to Unit B
```

That must fail.

**Where.**
- #440
- current global permission policies and Inventory routes

**Risk.** Cross-unit reads or mutations through direct IDs or filters.

**Status.** Open / Sprint 006 critical.

---

### Medium — Receipt monetary arithmetic still crosses PHP float boundaries

**What was found.** `ReceiptLineData` stores amounts such as `grossAmount`, discounts and allocated
expenses as `float`, and `ReceiptService::createLine()` performs arithmetic before persistence.

**Why it matters.** The project uses DECIMAL columns and BCMath for weighted-average blending, but
the complete money path is not exact-decimal end to end.

**Where.**
- `code/api/app/DataTransferObjects/Inventory/ReceiptLineData.php`
- `code/api/app/Services/Inventory/ReceiptService.php`

**Risk.** Small floating-point errors may propagate as the project adds Orders, discounts, taxes and
margin calculations.

**Status.** Open technical debt; should be solved before the financial surface expands substantially.

---

### Medium — Reference-data routes are accumulating workflow-specific OR permissions

**What was found.** Product/Variant/Presentation listing routes accept combinations such as:

```text
items.view | suppliers.manage | receipts.manage
```

because purchasing workflows need lookup data without granting full catalog-management permission.

**Why it matters.** The rule is valid today, but Orders, transfers and purchase orders may keep
extending the same OR-list.

**Where.**
- `code/api/routes/api/product-catalog.php`

**Risk.** Lookup access and catalog-management authorization become increasingly coupled.

**Status.** Emerging pattern; no immediate refactor required. Re-evaluate when another major
consumer appears.

---

### Low / forward-looking — Single-Variant price resolution may not be the final POS hot path

**What was found.** `PriceResolutionService::resolve()` is designed cleanly for one Variant and one
context.

**Why it matters.** A POS/menu with many Variants may otherwise repeat context and assignment lookup
work N times.

**Where.**
- `code/api/app/Services/Pricing/PriceResolutionService.php`

**Risk.** Avoidable query amplification in a future high-frequency path.

**Status.** Not a current defect. Measure at Orders/POS design time and consider `resolveMany()` or
a context-resolved menu endpoint.

---

### Low — OpenAPI still contains legacy integer-ID descriptions after the public-ID rollout

**What was found.** `ShowProductController` receives a string and resolves `public_id`, while the
OpenAPI path parameter is still documented as an integer.

**Why it matters.** Runtime works, but generated clients may consume the wrong contract.

**Where.**
- `code/api/app/Http/Controllers/Api/V1/Inventory/Product/ShowProductController.php`

**Status.** Open documentation debt.

## Source of truth

- [`doc/sprints/sprint-005-purchasing-cost-and-pricing.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-005-purchasing-cost-and-pricing.md)
- Current reviewed head: [`28e87f8e`](https://github.com/pakodiazdev/sushigo/commit/28e87f8ea9355eb73f9ba677751144afec2cfd67)
