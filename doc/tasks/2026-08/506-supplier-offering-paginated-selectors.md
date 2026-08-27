# 🔍 Supplier offering form's product/variant selectors cap out at 100 records

**Labels:** sprint-6, investment: product-engineering

## Description
The offering-create cascade in `use-supplier-offering-form.ts` fetches Products and Variants with
`per_page: 100` and reads only that single page into the native `<select>` options. Once the active
catalog holds more than 100 products, or a product has more than 100 variants, the later records can
never be selected when creating a supplier offering.

## Reason
Flagged during PR #496 review (chatgpt-codex-connector), see
https://github.com/pakodiazdev/sushigo/pull/496#discussion_r3849253448. The correct fix is a
searchable/paginated combobox replacing the current native `<select>`, which is a UI component
change bigger than a one-line fetch tweak, so it was deferred out of that reactive PR-comment pass
rather than shipped as a partial workaround.

## Objective
The offering-create cascade lets a user find and select any active product/variant/purchase
presentation regardless of how large the catalog grows, without loading the entire catalog into the
browser on every keystroke.

## ✅ Technical Tasks
- [x] 📂 Design the replacement selector (searchable/paginated combobox vs. server-side
      autocomplete) for Producto → Variante → Presentación de compra
- [x] 🔧 Implement it in `use-supplier-offering-form.ts` / `supplier-offering-form.tsx`
- [x] 🧪 Add coverage for catalogs exceeding a single page

## 🎯 Acceptance Criteria
- [x] A product/variant beyond the first 100 active records can still be selected when creating a
      supplier offering
- [x] The selector remains usable (no full-catalog fetch on load) as the catalog grows

## 🔗 References
- PR #496 (workspace `sushigo-a`, branch `feature/431-supplier-offerings`) — review thread:
  https://github.com/pakodiazdev/sushigo/pull/496#discussion_r3849253448
- `code/webapp/src/features/purchasing/suppliers/hooks/use-supplier-offering-form.ts`
- `code/webapp/src/features/purchasing/suppliers/components/supplier-offering-form.tsx`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `10h` · **Tracked:** `27m`

### 📅 Sessions
```json
[
  { "date": "2026-08-26", "start": "21:13", "end": "21:40" }
]
```

## 📊 Retrospective
- **Actual total:** 27m (27m)
- **vs optimistic:** −3h 33m
- **vs pessimistic:** −9h 33m

**Justification:**
The estimate anticipated building a full searchable/paginated combobox component from scratch. In
practice the pattern was already solved and reviewed elsewhere in the codebase — `VariantPicker` /
`useVariantSearch` in `src/features/pricing/price-lists` — so the fix reduced to porting that
`SearchInput` + native `<select>` + debounced `per_page: 20` query approach into the offering form
and adding a matching `search` filter to `GET /inventory/products/{id}/variants` (the products
endpoint already supported `search`). No new dependency or combobox component was needed, which is
what collapsed the frontend effort.

The tracked total reflects only the initial implementation session (2026-08-26 21:13–21:40). The
subsequent work — the PR #523 review-response cycle (commit 2026-08-26 23:54: validation on the new
params, server-side `is_active` filtering before pagination, OpenAPI path-param correction, only
clearing a dropped selection on a *successful* search, `SearchInput` aria-label passthrough) and a
follow-up fix (commit 2026-08-27 09:37: reset `variantSearch` on product change) plus this
finish-pr pass — was carried out without open work sessions, so the Sessions array understates the
real effort. A realistic actual, counting those cycles, lands closer to the optimistic estimate
than to zero, but only the 27-minute session is time-tracked evidence.

