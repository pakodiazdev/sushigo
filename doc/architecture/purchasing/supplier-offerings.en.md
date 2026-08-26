# Supplier Offerings

Issue `#431` introduces the purchasing catalog boundary consumed by Purchase Receipts. It records
who can supply a Variant Purchase Presentation and under which reference commercial terms. It does
not record inventory, accounting evidence, or authoritative acquisition cost.

## Model

```text
Supplier 1 ── * SupplierOffering * ── 1 VariantPurchasePresentation
```

- `Supplier` owns a public ULID, normalized unique code, contact data, and active state.
- `SupplierOffering` owns a public ULID, supplier code, reference quote/currency, validity range,
  minimum order quantity, lead time, and active state.
- One supplier has at most one current offering per Presentation. Different suppliers can quote
  different terms for the same Presentation.
- Both records use soft deletion. Normal operational retirement uses `is_active=false`, preserving
  references for future receipt history.

## Cost boundary

`quoted_price` is vendor catalog/reference data. It can prefill or inform a future receiving flow,
but it must never mutate Variant cost, Stock weighted-average cost, or financial records. Purchase
Receipt posting (`#432`) snapshots the actual transaction price, promotion, expenses, and currency;
that immutable evidence is the acquisition-cost authority.

## API and authorization

Authenticated endpoints live below `/api/v1/inventory/suppliers`. Offerings are nested below
`/{supplier}/offerings`, and scoped route binding prevents an Offering from being accessed through
another Supplier. Public ULIDs are the only external identifiers.

- `suppliers.view`: list/show Suppliers and Offerings.
- `suppliers.manage`: create, update, deactivate, and soft-delete Suppliers and Offerings.

**As-built (`#433`):** `GET /inventory/suppliers` and `GET
/inventory/suppliers/{supplier}/offerings` also accept `receipts.manage` — the Purchase Receipt
form needs to list Suppliers and their Offerings for a user authorized to create Receipts but not
the Supplier catalog itself; see `doc/architecture/purchasing/purchase-receipts.en.md`.

The SushiGo Admin page `/inventario/proveedores` applies the same boundary and guides users through
Product → Variant → Purchase Presentation when creating an Offering.
