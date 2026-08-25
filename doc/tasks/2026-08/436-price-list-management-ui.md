# ✨ Add branch-aware Product price-list management UI

**Labels:** enhancement, frontend, sprint-5, investment: product

## Description

Build management UI for effective Product Variant price lists by branch or approved operating context.

## Reason

Operators need to configure and understand local prices without editing Product catalog identity.

## Objective

Provide list/create/edit/detail, Variant assignment, effective ranges, conflict visibility and resolved-price preview.

## ✅ Technical Tasks

- [x] Build price-list DataGrid, filters and create/edit/detail SlidePanels.
- [x] Assign branch/context and Product Variants with effective prices.
- [x] Capture validity and priority using the backend conflict rules.
- [x] Show overlap/conflict errors and preview the resolved price for a context/date.
- [x] Keep all price inputs outside Product and Variant forms.
- [x] Add frontend tests and a price-list happy-path E2E.

## 🎯 Acceptance Criteria

- [x] A user can create two branch-specific prices for one Variant.
- [x] Conflicting ranges are visible and cannot be silently saved.
- [x] Resolved-price preview matches the backend.
- [x] No price-management path depends on the removed ProductWizard.

## 🔗 References

- Depends on #435

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `12h 54m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "01:39", "end": "14:33" }
]
```

## 📊 Retrospective
- **Actual total:** 12h 54m (774m)
- **vs optimistic:** +7h 54m
- **vs pessimistic:** +3h 54m

**Justification:**
The initial build (DataGrid, create/edit/detail SlidePanels, Assignment and Variant Price
management, resolved-price preview, 118 Vitest tests, Cypress happy path) landed close to
estimate. The overrun came from three subsequent review-response cycles that were not
contemplated in the original scope:

1. A first Copilot review round required relocating the entire Pricing UI (types, API client,
   page composition) out of global `src/services/`/`src/types/` folders into the
   domain-oriented `src/features/pricing/price-lists/` structure mandated by
   `doc/conventions/frontend/domain-oriented-structure.md`, switching the browser route to its
   Spanish form, and hardening a flaky Cypress helper.
2. A second automated-review round (`chatgpt-codex-connector`) surfaced four real pagination and
   permission-alignment bugs invisible in local testing with small seed data: the Variant Price
   detail section, the Operating Unit picker, and the Variant-search picker each silently
   truncated to their endpoint's first page once an installation grew past it, and the Variant
   lookup required a permission (`items.view`) the pricing-update permission didn't already
   imply. Fixing these required auditing every paginated list in the feature, not just the one
   flagged.
3. A third `/pr-comments` pass (5 more threads) found that the same class of pagination bug had
   been missed in the Operating Units select's *other* consumer and in the Price Lists search
   itself, plus a genuinely missing delete-and-recreate flow for Assignments that the form's own
   copy already promised users. One flagged thread (a `queryKey` mismatch) was verified as a
   false positive against the installed TanStack Query version rather than "fixed" reflexively.
4. A final SonarCloud cleanup pass removed 3 new code smells (a nested ternary, a nested template
   literal, and a negated-equality comparison) introduced across the fix commits.

Each cycle required re-reading the changed hooks/components for context, writing or updating
tests, and re-verifying the full Pricing suite — the review iteration cost, not the initial
build, accounts for the gap over the pessimistic estimate.

