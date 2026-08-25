# 🔐 Supplier offering form requires items.view even for suppliers.manage-only users

**Labels:** investment: product-engineering

## Description
The offering-create cascade in the Suppliers feature (Producto → Variante → Presentación de compra,
in `use-supplier-offering-form.ts`) calls the shared catalog endpoints
`ListProductsController`, `ListVariantsController`, and `ListVariantPurchasePresentationsController`,
all gated by `items.view`. A user granted `suppliers.manage` (and `suppliers.view`) without
`items.view` can open the offering-create panel, but every selector query 403s and stays empty,
even though creating the offering itself is explicitly authorized by `suppliers.manage`.

## Reason
No currently seeded role reaches this combination (`admin` and `inventory-manager` — the only roles
with `suppliers.manage` — both also get full `items.%`), but `SyncUserDirectPermissionsController`
lets an admin grant permissions directly to any user independent of role, so the gap is reachable in
production. Flagged during PR #496 review (chatgpt-codex-connector), see
https://github.com/pakodiazdev/sushigo/pull/496#discussion_r3849253446 for the original discussion.

## Objective
A user authorized to manage supplier offerings can populate the product/variant/presentation
cascade without needing `items.view`, without loosening the general-purpose catalog endpoints'
authorization for unrelated Inventory consumers.

## ✅ Technical Tasks
- [x] 📂 Decide the approach: a supplier-scoped catalog lookup gated by `suppliers.manage`, vs.
      accepting either `items.view` or `suppliers.manage` on the three existing endpoints
- [x] 🔧 Implement the chosen approach
- [x] 🧪 Add PHPUnit coverage for a user with `suppliers.manage` but not `items.view`

## 🎯 Acceptance Criteria
- [x] A user with `suppliers.manage` and `suppliers.view`, but not `items.view`, can complete the
      product → variant → presentation cascade when creating a supplier offering
- [x] The general catalog endpoints' authorization for non-supplier consumers is unchanged unless
      that broadening is the deliberate chosen approach

## 🔗 References
- PR #496 (workspace `sushigo-a`, branch `feature/431-supplier-offerings`) — review thread:
  https://github.com/pakodiazdev/sushigo/pull/496#discussion_r3849253446
- `code/webapp/src/features/purchasing/suppliers/hooks/use-supplier-offering-form.ts`
- `code/api/routes/api/product-catalog.php`, `code/api/routes/api/items.php`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `6h` · **Tracked:** `9m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "01:33", "end": "01:42" }
]
```

## 📊 Retrospective
- **Actual total:** 9m (single session)
- **vs optimistic:** −1h 51m
- **vs pessimistic:** −5h 51m

**Justification:**

Landed well under the optimistic estimate because the issue's own two suggested approaches pointed
straight at a decision the codebase had already made: `routes/api/employees.php` and
`routes/api/attendance.php` already use Spatie's `permission:X|Y` OR-permission syntax for the exact
same "two different roles need read access for different reasons" situation, so there was no design
work left — just applying the established pattern to the three `.list` routes the offering-create
cascade actually calls, adding one Feature test per route, and updating the architecture doc's
permission table plus the three controllers' Swagger 403 descriptions to match. No automated review
cycles ran in this mode (`/issue-no-review`), so none of the estimate's built-in slack for
review-response rework was consumed.


