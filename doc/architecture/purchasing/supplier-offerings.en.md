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

## Sequential code suggestion (`#497`)

`GET /inventory/suppliers/next-code` (`suppliers.manage`) proposes the next unused
`<prefix><zero-padded number>` Supplier code — `PROV-` / 3 digits by default, overridable via
`config/suppliers.php` (`SUPPLIER_CODE_PREFIX`, `SUPPLIER_CODE_PADDING`). The maximum numeric
suffix is computed in SQL (`App\Support\SequentialCodeGenerator`); soft-deleted Suppliers count as
occupied, so a historical code is never re-proposed even though the partial unique index on
`(code) where deleted_at is null` would technically permit its reuse.

The suggestion is a convenience, not a reservation — no lease row, no lock held across requests.
The partial unique index stays the sole authority. On a create-time race, `POST
/inventory/suppliers` catches the unique violation and returns `422` with the standard
`errors.code` field error plus `rejected_code` and a freshly recomputed `suggested_code`; it never
silently retries. The `useSuggestedCode` hook + `/inventario/proveedores` create form prefill the
suggestion in create mode only, offer an explicit refresh, and — on a collision — replace an
untouched suggestion in place (requiring another submit) while leaving a manually typed code
untouched behind an explicit "use this instead" action. This is the reusable pattern later
sequential-code entities such as Cash Registers (`#498`) adopt.
