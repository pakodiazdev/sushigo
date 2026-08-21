# ✨ Model reusable Purchase Presentations and assign them to Product Variants

**Labels:** enhancement, backend, sprint-4, investment: product

## Description

Add reusable commercial package templates such as Unit, Pack x6, Box x12 and Box x24, plus their assignment to Product Variants.

## Reason

A Box does not have one universal UOM factor. Product packaging must not abuse global physical conversions such as kg↔g or l↔ml.

## Objective

Express how each Variant is purchased and normalized to its base inventory unit, without storing supplier price or transaction cost.

## ✅ Technical Tasks

- [x] Add PurchasePresentationTemplate with public ID, code, name, package type, base-unit quantity, compatible dimension and active state.
- [x] Add VariantPurchasePresentation with public ID, Variant, template, package barcode, default flag, active state and metadata.
- [x] Enforce one default active presentation per Variant, unique assignments and barcode rules.
- [x] Validate template compatibility with the Variant base-UOM dimension.
- [x] Build template and Variant-assignment APIs, permissions, resources, Swagger and tests.
- [x] Deactivate historically referenced templates/assignments instead of hard-deleting them.

## 🎯 Acceptance Criteria

- [x] Unit/Pack/Box templates are reusable across compatible Variants.
- [x] Ambiguous Box → Unit global conversion is not introduced.
- [x] A Variant cannot have duplicate/incompatible assignments or multiple active defaults.
- [x] No purchase price, supplier quotation or receipt data is stored in these entities.

## 🔗 References

- Depends on #424

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `4h31m`

### 📅 Sessions
```json
[
  { "date": "2026-08-20", "start": "15:50", "end": "20:21" }
]
```

## 📊 Retrospective

**Tracked:** `4h31m` (1 session, 2026-08-20 15:50–20:21) vs. **Optimistic** `5h` / **Pessimistic** `9h` — landed just under the optimistic estimate.

This issue built directly on top of an already-detailed, pre-existing design
(`doc/architecture/product-catalog/product-catalog-architecture.en.md` §3.2–§3.4, §6, produced by
the earlier design-only issue #421) that had already resolved the hardest question — how
`compatible_dimension_uom_id` prevents the ambiguous Box↔Unit conversion the issue exists to avoid —
before implementation started, so almost no time went into re-deriving the design itself. Time went
instead into: TDD implementation of two new tables/models/services/CRUD API pairs with permissions,
FormRequests, Resources and Swagger (the bulk of the tracked time); a Copilot review round (4 threads,
one real fix — barcode case-normalization consistency with `ItemVariant`); and three Codex review
cycles (7 findings total, all genuine — a `template_id` field that required the internal numeric ID
instead of the `public_id` every other endpoint actually returns, a race-condition gap in the
one-default-per-Variant locking when a Variant had zero prior presentations, a decimal-scale string
comparison that misread a normal API round-trip as a change, and a duplicate-assignment check that
needed to be re-verified after acquiring the row lock, not just before). No business-rule disputes
arose in either review — every automated finding was a genuine defect worth fixing, not a
disagreement with the issue's intent. Two of the three Codex cycles were interrupted by unrelated
session/infra hiccups (a usage-limit reset and a machine sleep event) that required resuming the
review subagent mid-loop rather than restarting it — this cost wall-clock time on the Sessions entry
but no rework, since the resumed agent picked up from its own saved context each time.




