# ✨ Build the Platillos (dishes) backend domain: categories, dishes, extras

## Description

New backend domain for the public-facing menu catalog: "Platillos" (dishes) — what the restaurant
offers, organized into categories, each with a base price and optional extras (e.g. "elige tu
salsa"). This is a catalog for what's sold and displayed, deliberately **not** linked to any
ingredient/recipe costing (no Insumo consumption, no cost-of-goods calculation) — out of scope for
this phase.

## Reason

The current `/productos` page is an empty stub ("Página en construcción") — the real, functioning
resale-product catalog already lives under Inventory (`Item`/`ItemVariant`), so "Productos" as a
concept was always meant to be something else: the menu of prepared dishes the restaurant serves,
which is a fundamentally different concern (no stock quantity, no recipe cost yet, needs a public
API surface eventually) from resale inventory. The category structure below is modeled on the
restaurant's real live menu (sushigo-romita.com/menu) rather than invented.

## Objective

- `dish_categories` — menu sections (Rollos, Onigiris, Yakionigiris, Sushiball, Ramen, Alitas,
  Boneless, Dumplings, Paquetes, and any future ones), each with a display `position` and
  `is_active`
- `dishes` — belongs to a category, has `name`, `description`, `base_price`, `is_active` (whether
  it's currently being offered — gates both admin and future public visibility), `position` for
  ordering within its category, and photos via the existing polymorphic `MediaAttachment` pattern
  (see the upload-system issue — `Dish` gets `mediaAttachments()`/`primaryMediaGallery()` the same
  way `Item` already does)
- `dish_extra_groups` — belongs to a dish (**not** shared/reusable across dishes in this version —
  each dish defines its own groups even if named the same as another dish's), has a `name` (e.g.
  "Elige tu salsa"), `is_required`, and `selection_type` (`SINGLE`/`MULTIPLE`)
- `dish_extra_options` — belongs to a group, has `name`, `price_delta` (added to the dish's
  `base_price` when selected), `is_active`, `position`
- Full CRUD endpoints for all four, gated by their own permission set (`dishes.view`/
  `dishes.create`/`dishes.update`/`dishes.delete`), independent of `items.*`
- Swagger docs generated for all new endpoints

## ✅ Technical Tasks

- [x] 🗂️ Migrations: `dish_categories`, `dishes`, `dish_extra_groups`, `dish_extra_options`
- [x] 🔧 Models + relations (`Dish belongsTo DishCategory`, `hasMany DishExtraGroup`, `DishExtraGroup
      hasMany DishExtraOption`), `Dish` gets the same media relations as `Item`
- [x] 🔧 Single Action Controllers under `app/Http/Controllers/Api/V1/Dishes/` (per this project's
      SAC convention) for categories, dishes, extra groups, extra options
- [x] 🔧 FormRequests with accessor methods (no data transformation in controllers, per CLAUDE.md's
      FormRequest/Controller/Service convention)
- [x] 🔒 New permissions (`dishes.view`/`create`/`update`/`delete`) added to seeders
- [x] 📚 Add a "Menu / Dishes" domain entry to `CLAUDE.md`'s domain-model section (currently only
      lists Inventory, Cash, Attendance/Payroll, Access Control) if this becomes a fifth live domain
- [x] 🧪 PHPUnit Feature tests: happy path + authorization for all endpoints, plus a test asserting
      extras' `price_delta` correctly reflects in whatever "total price" computation is exposed

## 🔗 References

- Real menu category source: sushigo-romita.com/menu
- Depends on #377 (upload-system backend, for the media relations) — not a hard blocker for the
  tables/CRUD themselves, but photos won't work until that lands
- `code/api/app/Models/Item.php` — pattern reference for `mediaAttachments()`/`primaryMediaGallery()`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `12h15m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:47", "end": "17:09" },
  { "date": "2026-08-04", "start": "10:15", "end": "11:29" },
  { "date": "2026-08-04", "start": "17:20", "end": "17:40" },
  { "date": "2026-08-04", "start": "18:00", "end": "20:00" },
  { "date": "2026-08-04", "start": "20:15", "end": "20:35" },
  { "date": "2026-08-04", "start": "21:00", "end": "21:40" },
  { "date": "2026-08-04", "start": "22:00", "end": "23:59" },
  { "date": "2026-08-05", "start": "00:00", "end": "00:20" }
]
```

## 📊 Retrospective
- **Actual total:** 12h 15m (735m)
- **vs optimistic:** +7h 15m
- **vs pessimistic:** +2h 15m

**Justification:** The first session covered the initial build (migrations, models, SAC
controllers, FormRequests, permissions, routes, Swagger, and the full PHPUnit suite) plus the
first review-response cycle for cascading soft-delete correctness. Five further rounds of external
review and quality gating followed before merge, none of which changed the feature's scope but
each requiring real rework: (2) a second Copilot review round asked for per-entity subfolders
(`Dish/`, `DishCategory/`, `DishExtra/`) and ULID `public_id`s replacing internal FKs on the API
surface — a structural change across all 4 tables plus every FormRequest and test; (3)
`/pr-comments` removed a Cypress spec out of scope for a backend-only PR; (4) `/sonar-review` fixed
4 SonarCloud code smells and required a mid-flight rebase after a GitHub Actions webhook anomaly;
(5) a user-reported N+1 query bug (missing eager-loaded inverse relations on the nested extra-group/
option resources) required fixes across 7 controllers plus two new query-count regression tests,
alongside further SonarCloud duplication cleanup (a `ResolvesPublicIdReferences`/
`NormalizesDishData` trait extraction) that surfaced a second, unrelated pre-existing duplication
block in the Dev/Production `PermissionSeeder`s; (6) a user-reported ordering bug (dish list sorted
by the category's internal id instead of its configured `position`) required rejoining the query
and re-deriving the regression test, since the original test's fixture data happened to make id
order and position order coincide; (7) a 28-item automated-review flag investigation triaged every
flag against the current code (most were stale, describing pre-refactor file paths/behavior already
superseded by rounds 2/5/6), fixed three small real gaps found along the way (an implicit trait
constant dependency, non-deterministic `extraGroups()` ordering, a test using `syncPermissions`
instead of `givePermissionTo`), and — per an explicit product decision — filtered inactive extra
options out of nested dish/group payloads to match `Dish::totalPriceFor()`'s pricing scope, across
8 controllers with 2 new regression tests. The total lands above the pessimistic estimate:
unlike the earlier rounds (structural rework with a known shape), rounds 5–7 were genuine
defect-finding cycles on a brand-new domain's query/ordering/consistency behavior — the kind of
work an estimate for "build the CRUD" doesn't anticipate, by design.

## 💸 Token & Cost

### 📅 Runs
```json
[
  {
    "date": "2026-08-01",
    "command": "/issue",
    "model": "claude-sonnet-5",
    "input_tokens": 710,
    "output_tokens": 165000,
    "cache_read_tokens": 98300000,
    "cache_write_tokens": 1500000,
    "estimated_cost_usd": 41.13
  },
  {
    "date": "2026-08-01",
    "command": "/issue",
    "model": "claude-haiku-4-5",
    "input_tokens": 519,
    "output_tokens": 16,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "estimated_cost_usd": 0.0006
  },
  {
    "date": "2026-08-04",
    "command": "manual session (review response, /pr-comments, /sonar-review, /finish-pr, ordering fix, 28-flag triage)",
    "model": "claude-sonnet-5",
    "input_tokens": 24500,
    "output_tokens": 188800,
    "cache_read_tokens": 157600000,
    "cache_write_tokens": 1100000,
    "estimated_cost_usd": 56.66
  },
  {
    "date": "2026-08-04",
    "command": "manual session (review response, /pr-comments, /sonar-review, /finish-pr, ordering fix, 28-flag triage)",
    "model": "claude-haiku-4-5",
    "input_tokens": 522,
    "output_tokens": 13,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "estimated_cost_usd": 0.0006
  }
]
```

### 📊 Totals
- **Input:** 26,251 tokens · **Output:** ~353,829 tokens · **Cache read:** ~255.9M tokens · **Cache write:** ~2.6M tokens
- **Estimated cost:** ~$97.79
- Session 2 above (API duration 53m 4s, wall 7h 30m 20s, 543 lines added / 183 removed) covers sessions 2–7 from the Sessions table collectively — it was a single continuous Claude Code conversation spanning the review-response, `/pr-comments`, `/sonar-review`, `/finish-pr`, ordering-bug-fix, and 28-flag-triage rounds — not one figure per session.


