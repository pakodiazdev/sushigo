---
sprint: "004"
visibility: public
review_type: engineering-review
review_origin: contemporaneous-review-summary-verified-against-repo
review_date: 2026-08-22
---

# Sprint 004 — Product Catalog Reconstruction

## Executive summary

Sprint 004 validated Sprint 003's architecture in production code. The project moved from a coupled
Product wizard toward a progressive **Product → Variant → Purchase Presentation** vertical and then
removed the legacy Product creation path after the replacement existed.

**Project checkpoint: ~8.8/10.**  
**Sprint review: ~8.9/10.**

## Why this sprint mattered

Before Sprint 004, the Product Inventory design was strong but still a document. After Sprint 004,
the same boundaries survived implementation:

- Product/Variant remain catalog identity.
- Purchase Presentation models commercial packaging.
- cost, price, location and stock remain outside catalog creation.
- nested Product/Variant/Presentation UX became a real progressive workflow.
- legacy write paths were retired after replacement evidence existed.

## Delivery evidence

| Metric | Result |
|---|---:|
| Planned scope | 8 Issues |
| Delivered | 8/8 |
| Planned effort | 32–60 h |
| Formal tracked effort | 56h16m |
| Formal wall-clock | ~42 h |
| Formal parallelization | 1.34× |
| Full measured effort incl. opportunistic | ~63.6 h |
| Full wall-clock | ~46.4 h |
| Full parallelization | ~1.37× |
| Confirmed delivery | 4 active days |

## Additional engineering value

- `Investment Type` became a first-class task dimension.
- PHPUnit timing was measured before optimization.
- API test sharding reduced measured CI wall-clock from ~3m59s to ~1m47s (~55%).
- A branch-protection regression introduced by the sharding change was discovered live and fixed.

## Findings carried forward

- Product/Variant/Presentation Cypress specs were written but not all executed against the full E2E
  stack during their issue sessions.
- Inventory public IDs remained open (`#399`).
- Horizontal authorization remained open (`#440`).
- public package metadata and internal README scaffolds were inconsistent.
- tracking metadata still drifted during parallel close-out.

## Follow-up impact

Sprint 005 closed several of these concerns: public IDs, API package/license metadata and more
real E2E execution. It also used the catalog contract to build suppliers, purchasing, cost and
pricing without reintroducing catalog-level financial fields.

## Material engineering findings

### Locking only child rows does not protect the first concurrent insert

**What was found.** When a Variant has zero Purchase Presentations, locking its child rows locks
nothing. Two concurrent “first” assignments can both pass pre-lock validation.

**Risk example.**

```text
Variant V has 0 presentations

R1 → SELECT children FOR UPDATE → 0 rows
R2 → SELECT children FOR UPDATE → 0 rows
```

There is no serialization.

**Where.**
- `code/api/app/Services/Inventory/VariantPurchasePresentationService.php`
- #426 / PR #472

**Resolution.** The service locks the always-existing parent `ItemVariant` before evaluating child
assignments.

**Engineering takeaway.** Invariants over an initially empty child set often need a stable parent
lock anchor.

---

### Authored E2E coverage is not executed E2E evidence

**What was found.** Several Cypress specs were written but not executed against a live E2E stack
inside the issue workspace.

**Why it matters.**

```text
spec authored
≠ spec executed
≠ spec passed
```

Selectors, routing, seed data or integration failures can remain hidden until a real stack run.

**Where.**
- Sprint 004 execution evidence for #423, #425 and #427.

**Status.** Improved in Sprint 005. Future reviews should keep the three states distinct.

---

### CI sharding improved latency but temporarily broke branch-protection semantics

**What was found.** API test sharding reduced wall-clock substantially, but the required
branch-protection context no longer reported correctly in some PR shapes.

**Why it matters.** A technically green change can become permanently unmergeable when a required
status context is orphaned.

**Where.**
- #477 → #481 → #486

**Status.** Resolved with a stable `api-tests` gate.

**Engineering takeaway.** Workflow changes should be validated against API, web, docs-only and
workflow-only PR scenarios—not just YAML syntax.

## Source of truth

- [`doc/sprints/sprint-004-product-catalog-reconstruction.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-004-product-catalog-reconstruction.md)
