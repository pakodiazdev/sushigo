# ✨ Build Suppliers and their purchasable Variant Presentations

**Labels:** enhancement, backend, frontend, sprint-5, investment: product

## Description

Create the Supplier catalog and associate each Supplier with the Variant Purchase Presentations it can sell.

## Reason

Purchase cost varies by supplier and package. A reusable package definition alone cannot identify supplier codes, quotation/reference prices, minimum quantities or lead times.

## Objective

Deliver a minimal full-stack Supplier catalog and purchasable-offering model ready for purchase receiving.

## ✅ Technical Tasks

- [x] Design Supplier lifecycle, public ID, contact/reference data, active state and permissions.
- [x] Associate Supplier with VariantPurchasePresentation.
- [x] Store supplier code, current quotation/reference price, currency, validity, minimum quantity, lead time and active state.
- [x] Build CRUD/list/filter APIs, resources, Swagger and authorization tests.
- [x] Build minimal Supplier and offering management UI with validation and tests.
- [x] Keep quotation data separate from authoritative receipt cost.

## 🎯 Acceptance Criteria

- [x] A Supplier can offer the same Variant in one or more configured Purchase Presentations.
- [x] Two Suppliers can quote different prices for the same presentation.
- [x] Deactivation preserves historical references.
- [x] No quotation is treated as a posted acquisition cost.

## 🔗 References

- Depends on #426 and #427

## 🤔 Assumptions

- Supplier and Supplier Offering use public ULIDs at every external boundary, consistent with #399.
- `suppliers.view` grants read-only catalog access; `suppliers.manage` governs lifecycle and offering changes.
- Supplier codes are normalized to uppercase and unique among non-deleted records.
- A quotation is mutable reference data. Purchase Receipt posting in #432 will snapshot actual transaction cost and remains authoritative.
- Operational retirement uses `is_active=false`; soft deletion exists for CRUD completeness while retaining database references.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `1h 3m`

### 📅 Sessions
```json
[
  { "date": "2026-08-23", "start": "12:26", "end": "13:29" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 3m (63m)
- **vs optimistic:** −3h 57m
- **vs pessimistic:** −7h 57m

**Justification:**
The single tracked session covers the initial full-stack build (models, migrations, scoped APIs,
permissions, OpenAPI docs, and the Supplier/Offering management UI). The bulk of the elapsed work
after that — the `src/features/purchasing/suppliers/` domain-oriented migration, the Spanish
`/inventario/proveedores` route, and several `/pr-comments` rounds hardening TOCTOU races on
Supplier/SupplierOffering create and update, decimal/integer column-boundary validation, inactive
variant/product/presentation checks, empty-string-to-null normalization across four FormRequests,
and null-safe UI fallback labels — happened as review-response cycles driven directly by
`/pr-comments` outside a `/start-issue`-tracked work session, so it is not reflected in the
`Sessions` array above. The recorded `Tracked` value therefore understates total effort; the shipped
scope substantially exceeds what the original estimate and the single session cover.


