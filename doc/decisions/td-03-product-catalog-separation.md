# TD-03 · Product catalog splits identity from packaging, cost, and price

## Decision

The Product inventory vertical (`Item`/`ItemVariant` scoped to `type = PRODUCTO`) is redesigned
around four separate write surfaces instead of the current single `ProductWizard`:

1. **Catalog identity** — Product (`Item`) and Variant (`ItemVariant`), holding only what
   identifies a thing: name, brand, category, SKU, barcode, base unit of measure.
2. **Commercial packaging** — a new `PurchasePresentationTemplate` /
   `VariantPurchasePresentation` pair, replacing ad-hoc writes to the global `uom_conversions`
   table for product packaging.
3. **Acquisition cost** — produced transactionally by purchase receipts (Milestone B), never a
   permanent field on Variant.
4. **Branch sale price** — produced by effective-dated price lists (Milestone B), never a
   permanent field on Variant.

Catalog create/update requests never accept cost, sale price, opening stock, location, or UOM
conversion factors. Full design, ERD, API contract, and migration sequencing:
[Product Catalog — Target Architecture](../architecture/product-catalog/product-catalog-architecture.en.md).

## Justification

**Why split now instead of extending the wizard?** The current wizard's four steps already write
to `Item`, `ItemVariant` (including `sale_price`/`min_stock`/`max_stock`), the global
`uom_conversions` table, and `/inventory/opening-balance` — four different domains in one form.
Every new field request (a package barcode, a supplier cost) would have nowhere principled to go
without this split, and would keep getting bolted onto `ItemVariant` by default, growing the same
problem it's meant to fix.

**Why not reuse the global `UomConversion` table for product packaging?**
`App\Services\Inventory\Concerns\ConvertsUomQuantities` resolves conversions by UOM pair only, with
no scoping to a specific Item or Variant — a `Box → Piece` row would silently apply to *every*
Variant using those two units, even though a Coca-Cola box and a napkin box hold different
quantities. `VariantPurchasePresentation` scopes the factor to one Variant; `UomConversion` remains
reserved for genuine physical dimensional equivalences (`kg → g`) on Insumos.

**Why keep `items`/`item_variants` as the internal tables instead of a new `products` table?** A
parallel table would fork the catalog mid-migration and duplicate media integration, permissions,
and test infrastructure that already work. "Product" stays a UI/API vocabulary scoped to
`type = PRODUCTO`; the internal model name doesn't change.

**Why deprecate `Item.sku` instead of dropping it immediately?** Existing rows and read paths still
reference it. Dropping it is the last step of the migration sequence (Milestone C, `#442`), gated
behind every replacement write path landing first — not a same-PR deletion. `ItemVariant.code`
becomes the documented, authoritative SKU going forward.

**Why is Brand optional but InventoryCategory required?** Not every product line has a distinct
brand worth filtering by, so a mandatory Brand would force placeholder data. Every product needs a
category for navigation and reporting, and there is no meaningful "uncategorized" state the UI
should render around.

**Known, accepted limitation:** cost and stock columns (`last_unit_cost`, `avg_unit_cost`,
`sale_price`, `min_stock`, `max_stock`) remain on `item_variants` through Milestone A and most of
Milestone B — only the *write path used by the new Product UI* stops touching them. They are not
dropped until `#442`, after `#434` (single cost source of truth) and `#439` (per-location
thresholds) land.

## When to revisit

If a future catalog needs structured, filterable Variant attributes (e.g. querying "all 600 ml
variants across every brand"), revisit the decision to keep Variant attributes as a single free-text
`description` field rather than a generic attribute engine — see
[Product Catalog — Target Architecture](../architecture/product-catalog/product-catalog-architecture.en.md)
§3.5. If a real product needs a one-off commercial package that doesn't fit any reusable
`PurchasePresentationTemplate`, revisit the "reusable templates only" constraint from that
document's §8.3.
