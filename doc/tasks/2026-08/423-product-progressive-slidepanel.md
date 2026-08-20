# ✨ Replace the Product wizard with progressive create-and-detail SlidePanel

**Labels:** enhancement, frontend, sprint-4, investment: product

## Description

Replace the four-step ProductWizard with a short Product form that transitions to the saved Product detail inside the same SlidePanel.

## Reason

The wizard couples independent operations and can leave partial configuration when a later step fails. Product identity must be saved first and enriched progressively.

## Objective

Deliver a responsive, accessible Product list and create/edit/detail SlidePanel for the catalog contract from the Product backend issue.

## ✅ Technical Tasks

- [x] Build Product-only list/search and Brand/Category/status filters.
- [x] Build React Hook Form + Zod create/edit UI for catalog identity and media only.
- [x] Keep the SlidePanel open after create and transition to the persisted detail state.
- [x] Show general information, images and Variant count/empty state.
- [x] Handle loading, validation, API errors, focus restoration, keyboard navigation, responsive layout and dark mode.
- [x] Add component tests and one Product-creation happy-path E2E.

## 🎯 Acceptance Criteria

- [x] Creating a Product never asks for Variant, cost, price, UOM, stock or opening balance.
- [x] Successful create changes the same panel to the saved Product detail without navigation.
- [x] List and detail refresh from canonical API data after create/update.
- [ ] Relevant frontend quality gates and the E2E scenario pass.

## 🔗 References

- Depends on #422
- Reuse media uploader from #378

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `6h35m`

### 📅 Sessions
```json
[
  { "date": "2026-08-19", "start": "17:21", "end": "22:19" },
  { "date": "2026-08-20", "start": "13:40", "end": "15:17" }
]
```

## 📊 Retrospective
- **Actual total:** 6h35m across two sessions — 4h58m (implementation, PR, CI, Copilot review,
  squash, Codex review across 3 cycles) + 1h37m (a second session resolving further review
  feedback that arrived after the first close-out)
- **vs optimistic:** +1h35m
- **vs pessimistic:** -2h25m

**Justification:** The core implementation (types, service layer, ProductForm/ProductDetails,
useProductsList's create→detail→edit panel-mode state machine, tests, docs) landed inside the
optimistic estimate — issue #422's already-shipped catalog contract and the architecture doc's own
UX flow (§5) left almost nothing to re-derive. CI passed clean on the first push. Copilot's first
review caught one real gap (focus restoration only worked for the New Product button, not row
clicks, because DataGrid rows weren't keyboard-focusable) and the fix extended the shared DataGrid
component safely (backward-compatible). The Codex loop ran its full 3-cycle cap and found 6 more
genuine defects an initial TDD pass missed: inactive brand/category assignments rendering blank in
the edit picker, pagination not resetting on filter change, an is_active badge that didn't account
for an inactive/deleted category (the backend's own warnings mechanism), pagination stranding the
user after deleting the last row on a page, list-filter catalogs excluding inactive
brands/categories a Product could still be assigned to, and — the most consequential — the New
Product/Edit/Delete buttons having no client-side permission gate at all, which the PR's own
Assumptions section had explicitly (and, it turned out, wrongly) called out as matching existing
convention; Codex's finding was right and the fix added `CanAccess` gates using the repo's existing
component. That first session's close-out (Sessions row 1, issue Done, archive, sprint row) turned
out to be premature: a second wave of feedback landed on the still-open PR afterward — a code
review flagging that the new page's hook wasn't co-located with its page (moved to
`pages/inventory/`) and that closing the detail panel briefly flashed a blank "New Product" form
mid-animation (fixed by no longer resetting panel state on close, only on the next open); a
SonarCloud pass surfacing 6 residual code smells once the quality gate itself already passed (a
nested ternary, four `useState` naming-convention smells, and one literal-duplicate function pair,
all cleaned up); and two more open Codex review threads — the category picker excluding inactive-
but-not-deleted categories the backend actually allows (unlike brand_id, which genuinely is
active-only), and a failed product-list fetch silently rendering as an empty catalog instead of
surfacing an error. None of the review cycles across either session raised a genuine business-rule
dispute — every finding was a real, fixable defect. The one item this work could not close itself:
the Cypress E2E spec was written (`products-catalog.cy.ts`) but never executed from either session,
since both ran from an isolated git worktree whose live dev-lab webapp/API servers point at a
different checkout — running it requires a human with the branch checked out into the actual
`sushigo-b` workspace, per the PR's own Manual Testing section. That's the one Acceptance Criteria
box left unticked; every other frontend quality gate (ESLint, TypeScript, Vitest, SonarCloud
quality gate at 0 new smells) is green as of the second session's final push.

