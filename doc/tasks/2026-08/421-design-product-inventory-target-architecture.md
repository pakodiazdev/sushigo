# 📐 Design the Product Inventory target architecture and migration plan

## Description

Audit and finalize the target architecture for the Product inventory vertical before any replacement implementation begins. This is a design-only issue.

## Reason

The current module mixes Product identity, Variants, physical UOM conversions, opening balances, costs and sale prices inside one wizard. Implementing directly would bake unresolved boundaries into new code and make the cleanup unsafe.

## Objective

Produce one reviewed design covering Product → Variant → Purchase Presentation, the progressive SlidePanel flow, API contracts, invariants, public identifiers, and an incremental migration/removal plan.

## ✅ Technical Tasks

- [x] Audit the affected backend schema, APIs, frontend routes/components, seeders, permissions, tests and architecture docs.
- [x] Finalize the domain model, cardinalities, lifecycle rules, SKU/barcode ownership, Brand/Category requirements and first Variant attributes.
- [x] Create the ERD/domain diagram, Product SlidePanel state/wireframe, API contract outline and dependency map.
- [x] Separate catalog, physical UOM conversion, purchases/acquisition cost, stock and branch pricing responsibilities.
- [x] Define migration, compatibility, rollback and legacy-removal sequencing.
- [x] Record accepted decisions in the repository architecture/ADR format and re-scope downstream issues when evidence requires it.

## 🎯 Acceptance Criteria

- [x] Reviewed design, ERD, UI flow, API outline and migration plan exist.
- [x] Every unresolved product decision is either decided or recorded with an explicit blocker/owner.
- [x] No migrations, endpoints, production UI, seeders or legacy deletion are implemented in this issue.
- [x] The implementation backlog and dependency order reflect the approved design.

## 🔗 References

- Existing authorization correction: #400
- Local discovery summary: dev-lab plan/inventory-product-catalog-redesign.md

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `3h45m`

### 📅 Sessions
```json
[
  { "date": "2026-08-12", "start": "20:23", "end": "00:08" }
]
```

## 📊 Retrospective
- **Actual total:** 3h 45m (225m), spanning 2026-08-12 20:23 through 2026-08-13 00:08
- **vs optimistic:** +45m
- **vs pessimistic:** −2h 15m

**Justification:**
The work itself (codebase audit, finalizing the domain model, writing the bilingual
architecture doc, the ADR, and the migration/dependency-map sections) tracked close to the
optimistic estimate. The overrun past optimistic — and most of the wall-clock time — came from
the automated review loop, not the design work itself: Copilot's review caught four real
inaccuracies (a wrong-language cross-doc link, an overstated DB-uniqueness claim, and a wrong
section reference), and Devin's DeepWiki scan ran five full cycles, each surfacing genuine,
verifiable defects rather than false positives — remaining stale Hashids references left behind
by an earlier partial fix, a pre-existing `doc/README.md` duplication with dead `en/`/`es/`
links, and, most substantively, a dead `is_manufactured` field whose footprint turned out to
reach far past the frontend wizard (a shared TypeScript type, five test files, and two backend
controllers, one of which silently returns a permanently-`null` field and the other a no-op
Swagger-documented filter). `/finish-pr`'s own close-out re-validation (post-squash Devin re-scan)
caught three more real inaccuracies the earlier cycles missed (the sale_price/min_stock/max_stock
write gap applies to both Create and Update FormRequests, not create-only; the SKU `code` field
needs the same update-path uniqueness hardening as barcode; and `public_id` route-model-binding was
described as already existing on Item/ItemVariant when it depends on `#399` landing first) plus two
pre-existing broken root-`README.md` links unrelated to this issue but caught while the file was
already open for the sprint-progress update. Two further Devin "Bug" findings on the housekeeping
commit were evaluated and kept as-is — they're explicitly correct per `finish-pr.md`'s own
Completed-cell convention and `doc/conventions/sprints.md` §9's aggregate-totals rule, not defects.
Every review cycle found something real (or correctly deferred to documented convention), so none
of the time was spent chasing false positives — the design's second- and third-order accuracy
simply took more verification passes than the first draft anticipated, well within the pessimistic
estimate.






