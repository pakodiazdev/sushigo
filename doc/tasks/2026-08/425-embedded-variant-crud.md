# ✨ Add embedded Variant catalog and CRUD to Product detail

**Labels:** enhancement, frontend, sprint-4, investment: product

## Description

Manage a Product's Variants from its Product detail SlidePanel instead of a disconnected global Variant page.

## Reason

The user should continue from Product identity to concrete inventory Variants without selecting the parent again or leaving the Product context.

## Objective

Deliver embedded Variant list/create/edit/detail interactions using the redesigned Variant contract.

## ✅ Technical Tasks

- [x] Show Product-scoped Variant cards/list with SKU, name, barcode, base UOM and status.
- [x] Add nested create/edit/detail interaction while preserving the Product panel state.
- [x] Preselect and lock the parent Product; remove the global Item selector.
- [x] Exclude cost, sale price, min/max stock and opening-balance controls.
- [x] Synchronize Product/Variant query caches after mutations.
- [x] Cover empty/error/loading/focus/responsive states with tests and an E2E Product → first Variant flow.

## 🎯 Acceptance Criteria

- [x] A user can create, view, edit and deactivate Variants without leaving Product detail.
- [x] No obsolete financial or stock fields are rendered or submitted.
- [x] The parent Product cannot be changed from the embedded form.
- [ ] Frontend tests and the end-to-end flow pass.

## 🔗 References

- Depends on #423 and #424

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `3h41m`

### 📅 Sessions
```json
[
  { "date": "2026-08-20", "start": "17:29", "end": "21:10" }
]
```

## 📊 Retrospective
- **Actual total:** 3h41m (one unbroken session: research, TDD implementation, PR, CI, an
  empty Copilot review poll, and a 3-cycle Codex review loop)
- **vs optimistic:** -19m (essentially on the optimistic estimate)
- **vs pessimistic:** -4h19m

**Justification:** This issue depended on #423's Product detail SlidePanel, which hadn't merged
to `main` yet at the time of implementation — this PR was stacked directly on top of
`feature/423-product-progressive-slidepanel` instead of `main`, avoiding redoing that
groundwork; it will need retargeting once #423 merges. The architecture doc (§5.1/§5.2) already
specified the nested-screen design in detail (a page-level mode extending the same panel
instance rather than a second `SlidePanel`), and #423's own hook/component patterns
(`useProductsList`, `ProductForm`/`ProductDetails`) were directly reusable templates for
`useProductVariants`/`VariantForm`/`VariantDetails`, so implementation stayed inside the
optimistic estimate despite the added nested-state complexity. Copilot never posted a review
within its 10-minute poll window (no threads to address). The Codex loop ran its full 3-cycle
cap and found 5 genuine defects an initial TDD pass missed, all around the embedded Variant
query's interaction with the Product it belongs to: a required Base Unit select that could
render with no matching option once a Variant's assigned UOM was deactivated elsewhere (blocking
further edits/deactivation of that Variant); silent truncation past the first 100 Variants
instead of fetching every page; and two separate delete-time races (a state-update-not-yet-
rendered gap, and an already-in-flight fetch not cancelled) that both let a deleted Product's own
Variant query still resolve and surface a spurious "Failed to load variants" toast right after
the delete succeeded. None of the three cycles raised a genuine business-rule dispute — every
finding was a real, fixable defect, and the PR's `## ⚠️ Needs Human Judgment` section stayed
empty. The one item this session could not close itself: the Cypress E2E spec
(`product-variant-catalog.cy.ts`) was written but never executed, for the same reason as #423's
own PR — this pipeline ran from an isolated git worktree with no live dev-lab server pointed at
this branch. That's the one Acceptance Criteria box left unticked.




