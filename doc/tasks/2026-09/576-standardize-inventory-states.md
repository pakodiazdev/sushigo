# 🎛️ Standardize Inventory loading, empty, error states and Spanish copy

**Labels:** frontend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Complete #441 Technical Task 4 by standardizing Inventory list/detail loading, empty, error, and
permission states and finishing the Spanish terminology sweep across the canonical
`/inventario/*` route tree.

This is an explicit Sprint 6 review follow-up recorded in the Sprint 6 Known Limitations and §17.
#441 extracted `InventoryListLayout`, `CrudSlidePanels`, and `StatusFilterSelect`, but deliberately
left this behavioral/UI consistency work unfinished.

## Objective

Every Inventory screen must communicate its state consistently and accessibly instead of rendering
an empty table, stale data, an English fallback, or an ambiguous toast when the underlying query is
loading, empty, denied, or failed.

## Scope

- Audit canonical Inventory pages and the shared screens they delegate to: Productos, Insumos,
  Variantes, Ubicaciones, Existencias, Proveedores, Recepciones, Listas de precios, Apertura,
  Transferencias, and Movimientos when their Sprint 7 Issues land.
- Define one shared state contract for initial loading, background refresh, empty-unfiltered,
  empty-filtered, recoverable error/retry, `403`, and unavailable/deleted detail.
- Extend shared list/detail scaffolding instead of copying state markup into every route.
- Preserve the prior successful result during background refetch where appropriate; do not replace
  usable data with a full-page spinner.
- Provide contextual empty-state actions only when the user has the matching manage permission.
- Normalize visible labels, helper text, validation fallbacks, toasts, table headings, and empty/error
  copy to consistent Spanish while keeping domain identifiers/API enums unchanged.
- Ensure focus, live-region announcements, contrast, keyboard retry/actions, and responsive layout.

## Tests

- Shared component tests for every state and action/permission combination.
- Representative route tests proving query state is wired correctly and stale data is not shown for
  a changed Operating Unit/filter.
- Regression tests for `403`, failed initial load, failed background refetch, empty search, deleted
  selected record, and retry success.
- Focused Cypress coverage across at least one catalog list, Existencias, and one document list.
- ESLint, TypeScript, Vitest, and affected Inventory Cypress specs green.

## Acceptance Criteria

- [x] Every canonical Inventory screen has explicit loading, empty, error, and permission behavior.
- [x] Shared components own the common presentation and accessibility contract.
- [x] Empty and error states are distinguishable and offer only authorized recovery/actions.
- [ ] No user-facing Inventory fallback introduced by the audited surfaces remains unintentionally
      in English. — the audited *screen chrome* (titles, columns, filters, toasts, empty/error/nested-
      section copy) is fully Spanish; the deep CRUD form fields (ProductForm, VariantForm,
      PurchasePresentationForm/TemplateManager, SupplierForm, SupplierOfferingForm, ReceiptForm/
      ReceiptLineFields, PriceListForm, AssignmentForm, VariantPriceForm, StockTransferForm) were
      deliberately left in English — see `## 🤔 Assumptions` on the PR and follow-up #624.
- [x] Background refresh does not unnecessarily discard valid visible data.
- [x] Component, route, accessibility, and focused E2E tests cover the standardized behavior.

## Dependencies and Parallelization

- Starts after Sprint 7 routes #570–#574 stabilize; may be implemented page-family by page-family in
  parallel when shared component ownership is agreed first.
- Does not own route code splitting; that is a separate backlog Issue.

## Out of Scope

- Redesigning Inventory information architecture or business workflows.
- New domain capabilities, design-system rebranding, or translation infrastructure for the whole app.

## Investment Type

`investment: product-engineering`

## Time

- **Optimistic:** `5h`
- **Pessimistic:** `10h`
- **Tracked:** `7h44m`

```json
[
  { "date": "2026-09-12", "start": "16:37", "end": "18:53" },
  { "date": "2026-09-12", "start": "18:53", "end": "23:59" },
  { "date": "2026-09-13", "start": "00:00", "end": "00:22" }
]
```

## 📊 Retrospective
- **Actual total:** 7h 44m (2h16m + 5h06m + 0h22m — three sessions, the second and third split
  across the midnight boundary per `doc/conventions/tasks.md`'s "sessions accumulate across days"
  rule)
- **vs optimistic:** +2h 44m
- **vs pessimistic:** -2h 16m

**Justification:**
The first session (16:37–18:53) covered the actual scope as estimated: the shared
`DataGrid`/`DetailStatus` state-contract primitives, wiring all ten canonical Inventory screens
onto it, the Spanish copy sweep, updating the Cypress specs it touched, and opening the PR —
landing close to the optimistic end. Every hour after that was PR-review response, not new scope,
driven by Codex review findings on PR #625/#576 across several rounds, each a real, verifiable
defect rather than a business-rule dispute: `InventoryListLayout`'s filtered-empty state leaking the
unfiltered description, `DataGrid` fabricating a blocking error over still-usable cached rows on a
background refetch failure, Existencias rendering fabricated zero totals and hiding its Location
Detail View card the same way, Insumos/Variantes/Ubicaciones never resetting `currentPage` on a
filter change, and — the largest single round — eight list screens and three detail panels
(Existencias, Receipts, Transfers) treating a `403` as a retryable transient error instead of an
unconditional access-revoked block, plus a follow-up to classify a `404` on the same detail queries
as `not-found` rather than retryable. Each round required reading the flagged code, confirming the
defect against actual `TanStack Query` cache-retention behavior, fixing it with a regression test,
and re-running the full suite before the next round could be trusted. None of the findings disputed
what the feature should do — every one was a real correctness gap the review caught that the
original implementation missed — which is why the total lands well under the pessimistic estimate
despite five additional review-response rounds: each fix was narrow and mechanical once identified.




