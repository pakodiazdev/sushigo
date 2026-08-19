# ✨ Build the Product catalog contract with brands and inventory categories

**Labels:** enhancement, backend, sprint-4, investment: product

## Description

Implement the catalog-only backend contract for resale Products over the shared Item model, with normalized Brand and Inventory Category catalogs.

## Reason

Product creation should describe what the product is, without asking for Variant, cost, sale price, stock, location or UOM data. The current Item contract still exposes the older generic Inventory design.

## Objective

Provide authorized, tested Product/Brand/Category APIs that support the first progressive Product UI while keeping the migration incremental.

## ✅ Technical Tasks

- [x] Keep Item/items internally for now and scope the Product boundary to type PRODUCTO.
- [x] Add soft-deletable Brand and InventoryCategory models with public IDs, active state, CRUD/deactivation APIs and permissions.
- [x] Associate Product with optional Brand and required Inventory Category.
- [x] Make Item SKU nullable/deprecated for Products; Variant SKU becomes the inventory identifier.
- [x] Limit Product writes to name, brand, category, description, media and active state.
- [x] Preserve media ownership and the dedicated items.manage-media permission.
- [x] Add migrations, resources, FormRequests, Swagger and feature/authorization tests.

## 🎯 Acceptance Criteria

- [x] Product create/update cannot write cost, price, UOM, stock, opening balance or location.
- [x] Product listing is always scoped to PRODUCTO and supports brand/category/status/search filters.
- [x] Brand and Inventory Category lifecycle and uniqueness rules are covered by tests.
- [x] Existing media upload/ownership behavior remains green.

## 🔗 References

- Depends on #421
- Authorization policies: #400
- Media backend/frontend: #377 and #378

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `21h16m`

### 📅 Sessions
```json
[
  { "date": "2026-08-18", "start": "18:51", "end": "23:22" },
  { "date": "2026-08-19", "start": "00:00", "end": "12:47" },
  { "date": "2026-08-19", "start": "12:47", "end": "16:45" }
]
```

## 📊 Retrospective
- **Actual total:** 21h16m (4h31m + 12h47m + 3h58m — three sessions, the second and third continuing the same unbroken pipeline run across midnight and into the afternoon)
- **vs optimistic:** +16h16m
- **vs pessimistic:** +12h16m

**Justification:** The core implementation itself finished in the first ~4.5h, well inside the
optimistic estimate — issue #421's own architecture doc
(`doc/architecture/product-catalog/product-catalog-architecture.en.md`) already resolved almost
every design decision (schema, API contract, lifecycle rules, permission model), so no time was
spent re-deriving design from scratch. The overrun came entirely from the automated-review
close-out tail, which turned out far more extensive than typical: Copilot's first pass caught real
soft-delete/photo_url gaps; the Devin/DeepWiki loop ran many cycles and kept finding genuine
defects an initial TDD pass missed — soft-delete-aware uniqueness needing a partial DB index,
`withTrashed()` on Brand/InventoryCategory relations, a delete-endpoint guard gap next to the
deactivate guard, a no-op-deactivation false positive, thin 403/401 permission-test coverage, a
seeded-test-environment permission gap that would have broken the PR's own Manual Testing
instructions, and — found only in the very last review round — `UpdateProductRequest` still
rejecting a no-op re-save of a Product whose brand/category had since been *soft-deleted* (an
earlier fix only covered the *inactive* case), which also uncovered a second bug in
`productData()` that would have silently nulled the FK on save once that validation gap closed.
The loop also correctly identified three points where a stricter reading would diverge from the
issue's literal text and logged them as business-rule disputes rather than "fixing" them by
guessing. Three concrete process incidents extended this further and are worth recording plainly:
(1) a review subagent hit its context/session limit mid-fix and had to be resumed directly, with
its half-finished change completed by hand; (2) a second, independently-dispatched subagent
continued running in the background well after it was believed stopped, and concurrently `git
stash`ed an in-progress uncommitted edit on the same file the orchestrator was actively rewriting —
correctly preserved, not lost, but only recovered by noticing and reconciling the stash by hand;
(3) moving the GitHub Project item to "Done" (a documented, intended step) triggered that project's
own built-in "Done → close issue" automation, closing this issue before the PR was actually
merged — a real process gap in the `finish-pr` procedure's assumption that only a PR merge closes
the issue, caught and corrected (`gh issue reopen`) before it could mislead anyone checking issue
state. Separately, one CI run stalled in GitHub's own runner queue for 15+ minutes (`webapp-lint`
stuck `queued`) and needed an empty retrigger commit to clear — infrastructure noise, not a code or
process defect. None of the overrun came from misunderstanding the issue or the design; all of it
came from the review loop being unusually productive at finding real bugs, plus the operational
overhead of running that loop across a session-limit boundary.

The third session covers work run manually after the pipeline's own automated close-out, at the
user's explicit request: three genuine business-rule disputes the pipeline had logged as "Needs
Human Judgment" were resolved with real decisions (allow inactive-category assignment with a
`warnings` note and active-filter exclusion; delete legacy null-category orphans; keep the
delete-block but name the blocking count in the response) rather than left open, then `/pr-comments`
found and fixed 4 more genuine defects from a Codex review pass that ran after the PR had already
gone green once (soft-deleted-category and no-category Products still reading as active, a
non-string `brand_id`/`inventory_category_id` risking a 500, orphaned `media_attachments` rows from
the cleanup migration), and `/sonar-review` cleared 3 `php:S1142` code smells (too many return
statements) introduced by that same round of fixes. This is a second, real instance of the same
pattern already named above — automated review continuing to find genuine defects well after the
initial implementation felt complete — not scope creep or a misunderstanding of the issue.



