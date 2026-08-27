# 🔨 Consolidate Inventory navigation, stock views and operational workflows

**Labels:** frontend, 🔨 technical-debt, sprint-6, investment: product-engineering

## Description

Rebuild Inventory navigation and screens around the final Product, Location, Stock, Receipt and Pricing concepts.

## Reason

The current frontend has overlapping Product/Item/Variant/Stock Dashboard routes and TypeScript StockMovement shapes that already disagree with backend enums and field names.

## Objective

Provide one coherent operational information architecture and remove duplicated/stale user paths after the replacement verticals land.

## ✅ Technical Tasks

- [x] Audit and consolidate Product, global Variant, Locations, Stock Dashboard, receiving and Pricing navigation.
- [x] Define clear route ownership for Catalog, Locations, Stock, Receipts and Pricing.
- [x] Align API clients and TypeScript types with canonical backend contracts.
- [ ] Standardize DataGrid/detail SlidePanel patterns, filters, loading/empty/error states and Spanish terminology.
- [x] Remove redirect loops, unreachable pages and duplicate actions.
- [ ] Add route/component tests and route-level lazy loading where valuable.

## 🎯 Acceptance Criteria

- [x] Each Inventory concept has one discoverable entry point and no duplicate mutation UI.
- [x] Frontend Stock/Movement types match backend fields and enum values.
- [x] Navigation preserves permissions and operating-unit scope.
- [x] All replacement workflows remain covered after obsolete routes are removed.

## 🔗 References

- Depends on #429, #433, #436, #438 and #439

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `3h6m`

### 📅 Sessions
```json
[
  { "date": "2026-08-27", "start": "11:46", "end": "14:30" },
  { "date": "2026-08-27", "start": "16:35", "end": "16:57" }
]
```

## 📊 Retrospective

- **Actual total:** 3h 6m (186m) across two sessions — 2h 44m implementation + CI + SonarCloud
  duplication cleanup (11:46–14:30), then 22m automated-review response + close-out (16:35–16:57,
  driven by `/pr-comments` and `/finish-pr` rather than `/start-issue`, so its boundaries are
  approximate).
- **vs optimistic (5h):** −1h 54m
- **vs pessimistic (10h):** −6h 54m

**Justification:**
The issue arrived as a design brief with no concrete IA spec — `#421`'s architecture doc only
covers the Product SlidePanel flow, not the section-wide route/nav/type consolidation this issue
asks for — so the route tree, sidebar grouping, redirect-vs-delete policy, and Spanish segment
names were all decided during the run and recorded under `## 🤔 Assumptions` on the PR. Despite
that, the mechanical core (move five route files to `/inventario/*`, add redirect stubs, restructure
the sidebar, realign the `StockMovement`/`StockMovementLine` types with the post-#438 model) tracked
close to the optimistic estimate because the exploration phase had already mapped every consumer.

Most of the overrun past raw implementation was SonarCloud duplication debt surfaced *by* the work,
not by new code: renaming `items.tsx`/`item-variants.tsx`/`locations.tsx` into
`insumos`/`variantes`/`ubicaciones` made ~250 lines "new" to Sonar's PR analysis, and the ~85%
structural duplication those three list screens have always shared of each other tripped the 3%
new-code-duplication gate (peaked at 5.6%). Clearing it required three real extractions —
`CrudSlidePanels`, `StatusFilterSelect`, `InventoryListLayout` — which double as a down payment on
Technical Task 4 (standardize the DataGrid/SlidePanel patterns); that box is left unchecked because
the loading/empty/error-state and full Spanish-copy parts of TT4 were deliberately deferred, along
with TT6's route-level lazy loading (the app does no route code-splitting anywhere, so adding it to
two pages would be inconsistent churn). The follow-up window covered two genuine review findings:
(1) a Codex catch that the new `inventory-navigation` E2E selected sidebar links by text, and
`Productos` also names the unrelated top-level Dishes link, so the lookup was ambiguous — fixed by
selecting every submenu link by exact `href`; and (2) the section-landing redirect (`/inventario`
and legacy `/inventory[/]`) pointed unconditionally at `/inventario/existencias`, which a user
holding only `items.view` cannot open — fixed with a `redirectToFirstAllowed` guard that lands them
on the catalog instead, matching the old card-grid landing's permission floor. Cypress E2E was not
run locally (workspace-a E2E stack down; cross-workspace test-DB collision risk per project
convention), and CI does not gate on Cypress here.






