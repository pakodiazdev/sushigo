# 💲 Product Pricing — Architecture

**Scope**
The authoritative sale-price domain for Product Variants: effective-dated `PriceList`s, their
assignment to a Branch (or, more specifically, an Operating Unit within it), per-Variant price
entries, deterministic resolution, and the conflict/overlap invariants that keep resolution
unambiguous. Produced by [issue #435](https://github.com/pakodiazdev/sushigo/issues/435).
`ItemVariant.sale_price` is **never** read by any of this — see §5.

This document complements
[Product Inventory — Target Architecture & Migration Plan](../product-catalog/product-catalog-architecture.en.md),
which already anticipated this design (its §7 migration table and §8.1 decisions reference this
issue directly), and [Inventory Architecture & Design](../inventory-architecture.en.md), which owns
`Branch`/`OperatingUnit` themselves.

---

## 1. Domain shape

```
PriceList  ──< PriceListAssignment >── Branch (required) ── OperatingUnit (optional override)
    │
    └──< VariantPrice >── ItemVariant
```

- **`PriceList`** — a named, prioritized container (`code`, `name`, `priority`, `is_active`). Not
  itself tied to any branch — the same list can be assigned to many contexts (e.g. a "Standard"
  list assigned to every branch, or a "Summer Event" list assigned to one temporary
  `OperatingUnit`).
- **`PriceListAssignment`** — attaches a `PriceList` to exactly one context: a `Branch`
  (`branch_id`, always required) or, more specifically, one `OperatingUnit` within that branch
  (`operating_unit_id`, nullable). Carries its own `effective_from`/`effective_to` window and
  `is_active` flag, independent of the `VariantPrice` rows it governs.
- **`VariantPrice`** — the actual price for one `ItemVariant` within one `PriceList`, with its own
  effective window and `is_active` flag. Exact monetary storage: `decimal(15,4)` column +
  Eloquent `decimal:4` cast, the same convention already used by `ItemVariant.sale_price`/
  `last_unit_cost` and `StockMovementLine.sale_price` — no new Money value-object library.

  **As-built versus Sprint 8 target.** The paragraph above records the implementation delivered by
  #435. [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) supersedes it as the
  target contract: a customer-facing `VariantPrice.price` is Money at scale 2 and must not cross a
  binary-float boundary. Unit cost remains a distinct scale-4 rate. Issue #415 owns the compatible
  migration and exact PHP/API/TypeScript representations; until it ships, `decimal(15,4)` remains
  the as-built pricing storage.

## 2. Branch vs. Operating Unit precedence

Every `OperatingUnit` already belongs to exactly one `Branch` (see
`product-catalog-architecture.en.md` §8.1). Branch is the primary attachment target — the common
case is "this list applies to this branch." An Operating-Unit-level assignment is a strictly more
specific override within that same branch (e.g. a temporary `EVENT_TEMP` unit pricing things
differently than its parent branch's day-to-day operation), mirroring the same `branch_id`
(required) + `operating_unit_id` (nullable override) shape `cash_registers` already uses — not a
new polymorphic `context_type`/`context_id` pattern, since none existed for this kind of scoping
anywhere else in the codebase.

## 3. Resolution algorithm

`App\Services\Pricing\PriceResolutionService::resolve(ItemVariant $variant, int $branchId, ?int
$operatingUnitId, ?Carbon $asOf = null): PriceResolutionResult`

1. Default `$asOf` to now; compare on the date grain (`effective_from`/`effective_to` are `date`
   columns).
2. Build up to two ordered candidate tiers, most specific first:
   - **Tier 1** (only when an Operating Unit is given): active assignments for that exact
     `branch_id` + `operating_unit_id`, whose `PriceList` is active, whose window contains `$asOf`.
   - **Tier 2**: active assignments for `branch_id` with `operating_unit_id IS NULL`, same
     active/window filters.
   Within a tier, order by `PriceList.priority` (desc), then assignment `id` (asc) as a defensive
   tiebreak — §4 already forbids a genuine priority tie inside one tier.
3. Walk tier 1's assignments in order, then tier 2's: for each, look up an active `VariantPrice`
   for this Variant in that assignment's `PriceList` whose window contains `$asOf`. **Return the
   first one found.** This is intentional layering — a more specific or higher-priority list that
   simply doesn't price this particular Variant falls through to the next candidate, rather than
   resolving to "no price" prematurely.
4. If no tier yields a price, return an **explicit no-price result** (`resolved: false`) — never an
   exception, never `ItemVariant.sale_price`.

`GET /api/v1/pricing/resolve` exposes this over HTTP and always returns `200`, even when
`resolved: false` — "no configured price for this context" is a valid domain answer, not an error.

## 4. Conflict / overlap invariants

Two services own the write-time guarantees the resolution algorithm above depends on, both
race-safe (`DB::transaction` + `lockForUpdate`, mirroring
`App\Services\Inventory\VariantPurchasePresentationService`'s pattern):

- **`PriceListAssignmentService`** — an `operating_unit_id`, if given, must belong to the given
  `branch_id`. Two **active** assignments to the exact same context (`branch_id` +
  `operating_unit_id`, `NULL` counted as its own value) may never share the same `PriceList`
  priority while their effective windows overlap — that specific combination is the only thing
  that could make step 3 above ambiguous. Different priorities overlapping is fine and expected
  (that's the layering).
- **`VariantPriceService`** — the same `ItemVariant` may never have two **active** `VariantPrice`
  rows in the same `PriceList` with overlapping effective windows — a single list must always give
  one deterministic price for a Variant at a given instant.

Both use a shared interval-overlap predicate (`EvaluatesEffectiveRanges`):
`effective_from <= COALESCE(other.effective_to, sentinel) AND (effective_to IS NULL OR
effective_to >= other.effective_from)`, using a far-future sentinel date instead of a
driver-specific `infinity` literal.

## 5. Never `ItemVariant.sale_price`

`ItemVariant.sale_price` (and `last_unit_cost`/`avg_unit_cost`/`min_stock`/`max_stock`) still exist
as columns — kept until #434 (cost) and #439 (thresholds) land, per
`product-catalog-architecture.en.md` §7 Milestone C — but nothing in this domain reads them. No
Product/Variant form gains a default sale-price field (none exists today on the current
catalog-identity-only contract from #424; this issue doesn't reintroduce one). A regression test
(`PriceResolutionTest::it_never_falls_back_to_item_variant_sale_price`) sets `sale_price` on a
Variant with zero `VariantPrice`/assignment configured and asserts the resolve endpoint still
returns `resolved: false`.

## 6. Authorization

- **`PriceListPolicy`** — flat permission checks (`price_lists.view`/`.create`/`.update`/
  `.delete`). A `PriceList` container isn't itself branch-owned, so no branch scoping applies here.
- **`PriceListAssignmentPolicy`** — the branch-scoped resource, using the same
  `ChecksBranchAccess` trait as `CashRegisterPolicy`: `view`/`update`/`delete` additionally require
  an active `OperatingUnit` assignment in the assignment's own branch. `create` is enforced in the
  `FormRequest` itself (there's no instance yet to check). This is what satisfies the Acceptance
  Criterion "authorization prevents cross-context price management."
- **`VariantPrice` CRUD** has no permission of its own — it's a sub-resource of a `PriceList` the
  caller can already `view`/`update` (the same reasoning `VariantPurchasePresentation` already
  uses for reusing `items.*` rather than minting a new permission namespace).
- `GET /pricing/resolve` only requires `price_lists.view` — the Acceptance Criterion's "management"
  wording is about writes; reading a resolved price for a context doesn't require branch access.

## 7. Future extension points (channel / customer / promotion pricing)

This issue deliberately ships only Branch/OperatingUnit-context pricing — no channel, customer, or
promotion dimensions, and no Redis-backed resolution. The base contract is built so those can layer
on **without changing `PriceList`, `VariantPrice`, or the resolution entry point's signature**:

- A new pricing **dimension** (e.g. sales channel, customer segment) is additional predicate(s) on
  `PriceListAssignment` (or a sibling assignment table following the same shape), not a redesign of
  `PriceList`/`VariantPrice` — the resolution algorithm's tiering (§3) already generalizes to "more
  candidate tiers, most specific first."
- A **promotion** (time-boxed, stackable discount) is naturally another `PriceList` with a higher
  `priority` and a short `effective_from`/`effective_to` window, assigned to the same context as
  the list(s) it temporarily overrides — no schema change required, since §3's fall-through
  behavior already handles "this list doesn't price every Variant."
- A **caching layer**, if resolution volume ever requires one, sits entirely inside
  `PriceResolutionService`'s implementation — the `resolve()` signature and `PriceResolutionResult`
  contract don't need to change for callers.

---

See also: `App\Services\Pricing\PriceResolutionService`,
`App\Services\Pricing\PriceListAssignmentService`, `App\Services\Pricing\VariantPriceService`,
`code/api/tests/Feature/Pricing/`.
