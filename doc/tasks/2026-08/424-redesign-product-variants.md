# ✨ Redesign Product Variants around SKU, barcode and base inventory unit

**Labels:** enhancement, backend, sprint-4, investment: product

## Description

Redesign the Product-scoped Variant API around inventory identity: SKU, barcodes, base UOM, lot/expiration behavior and active state.

## Reason

The current Variant contract mixes catalog identity with acquisition cost, default sale price and global replenishment settings that belong to later operational domains.

**Investment Type note:** classified `investment: product` rather than `product-engineering`. Although
framed as a "redesign," this isn't correctness-driven cleanup of an existing contract (the
`product-engineering` case) — it defines the new Variant domain model's identity contract that the
embedded Product UI (#423) directly consumes, matching the `product` row's own example ("a new
Variant or Purchase Presentation domain model") in `doc/conventions/tasks.md` → "Investment Type".

## Objective

Provide a Product-scoped, authorized Variant contract that the embedded Product UI can use without writing costs, prices or opening stock.

## ✅ Technical Tasks

- [x] Implement Product-scoped list/create/show/update/deactivate behavior.
- [x] Treat code consistently as Variant SKU and preserve optional unit barcode.
- [x] Keep base UOM, description, lot/expiration configuration and active state.
- [x] Remove cost, sale price, min/max stock, opening balance and location from the new write contract.
- [x] Keep legacy database columns temporarily until replacement domains and migration cleanup land.
- [x] Validate the parent is a Product and enforce exact Variant permissions.
- [x] Coordinate public-ID strategy with #399; add Swagger and feature/authorization tests.

## 🎯 Acceptance Criteria

- [x] New Variant writes cannot set acquisition cost, sale price, stock thresholds or balances.
- [x] Every Variant endpoint is Product-scoped and rejects invalid/non-Product parents.
- [x] SKU/barcode uniqueness and base-UOM validation are tested.
- [x] No incompatible public-ID convention is introduced alongside #399.

## 🔗 References

- Depends on #422
- Coordinate with #399

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `6h37m`

### 📅 Sessions
```json
[
  { "date": "2026-08-19", "start": "17:23", "end": "22:52" },
  { "date": "2026-08-20", "start": "14:10", "end": "15:18" }
]
```

## 📊 Retrospective
- **Actual total:** 6h 37m (397m)
- **vs optimistic:** +3h 37m
- **vs pessimistic:** +37m

**Justification:** Came in under the pessimistic estimate but well over optimistic, mainly for
reasons outside straight implementation time. First, #422 turned out not to introduce a separate
`Product`/`Variant` model as the issue's own body implied — "Product" is `Item` filtered to
`type=PRODUCTO`, and `ItemVariant` already *is* the Variant model — so a full codebase exploration
pass (existing `Product` controller/request/resource family, the accepted
`product-catalog-architecture.en.md` design doc, legacy `ItemVariant` write contract, permission
model) was needed before any code could be written, to avoid inventing a parallel convention. Second,
the automated review cycle surfaced two real, non-trivial defects that both required genuine fixes
and their own squash+push+CI cycles: Codex's post-squash review (arriving just outside the review
subagent's polling window, requiring a manual follow-up check) flagged that `ListVariantsController`
cast `per_page` straight into `paginate()` with no validation — confirmed via a live reproduction that
`per_page=0` throws an uncaught `DivisionByZeroError` (500) once any row exists. Then the
close-out phase's own best-effort final Codex check (this pipeline's substitute for Devin/DeepWiki)
found a second, more subtle one: `UpdateVariantRequest` allowed changing a variant's base `uom_id`
even after it already had stock or movement history, which would silently reinterpret existing
`on_hand` quantities in the new unit — fixed by rejecting a genuine UOM change once stock/history
exists, while still allowing a no-op resend of the current value. Copilot's own review (3 threads: an
inline FQCN, a missing Swagger property, two misleadingly-named tests) was handled in the first pass
with no extra cycles. Two separate `api-tests` CI runs also failed on an unrelated pre-existing flaky
test in the Payroll domain (`ReclosePayPeriodApiTest`/`ConfirmCloseApiTest`, both asserting
`PayPeriodLine::count() > 0`), confirmed unrelated to this PR's diff and cleared on a plain re-run
both times — no code changes needed for those, just re-run time.

**2026-08-20 follow-up session (+1h08m, 5h29m → 6h37m):** the PR sat open awaiting merge after the
first close-out, and a further review pass on the already-closed issue's PR found two more real
defects, both fixed with regression tests and re-validated end-to-end (push → CI → SonarCloud
re-scan). First, `CreateVariantRequest`/`UpdateVariantRequest::prepareForValidation()` called
`strtoupper()` directly on request input under this file's `declare(strict_types=1)` — a client
sending `code`/`barcode` as a bare JSON number (not a quoted string) threw an unhandled `TypeError`
before validation ever ran, returning a 500 instead of a 201/422; fixed by casting to `(string)`
first (a cast, unaffected by `strict_types`, unlike a function-call argument). Second, a leftover
inline `\App\Models\StockMovement::create(...)` FQCN in `ProductVariantCrudTest.php` violated the
repo's mandatory no-inline-FQCN rule despite the file already importing three sibling models —
fixed by adding the import. A separate `/sonar-review` pass then caught one SonarCloud code smell
(`php:S1192`, the literal `"/{variantId}"` duplicated 3× in `routes/api/product-catalog.php`),
fixed by extracting `RouteParams::VARIANT_ID` following the existing `RouteParams::ID` precedent —
bringing new_code_smells from 1 to 0 and the quality gate to a clean pass. This session came in
`37m` over the pessimistic estimate: the original estimate didn't anticipate a second review round
happening on an issue already marked closed, and this pass also included an unrelated architectural
side-discussion (public_id/ULID exposure for `Item`/`ItemVariant`) that was resolved by updating
#399's scope rather than expanding #424 — captured in #399, not billed as implementation time here
beyond the housekeeping to record it.







