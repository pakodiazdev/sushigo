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
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `8h56m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:47", "end": "17:09" },
  { "date": "2026-08-04", "start": "10:15", "end": "11:29" },
  { "date": "2026-08-04", "start": "17:20", "end": "17:40" },
  { "date": "2026-08-04", "start": "18:00", "end": "20:00" }
]
```

## 📊 Retrospective
- **Actual total:** 8h 56m (536m)
- **vs optimistic:** +3h 56m
- **vs pessimistic:** −1h 4m

**Justification:** The first session covered the initial build (migrations, models, SAC
controllers, FormRequests, permissions, routes, Swagger, and the full PHPUnit suite) plus the
first review-response cycle for cascading soft-delete correctness. Three further rounds of
external review and quality gating followed before merge, none of which changed the feature's
scope but each requiring real rework: (2) a second Copilot review round asked for per-entity
subfolders (`Dish/`, `DishCategory/`, `DishExtra/`, matching the CashAdjustments domain's existing
convention) and for the internal `dish_id`/`dish_category_id`/`dish_extra_group_id` foreign keys
to stop being exposed over the API in favor of ULID `public_id`s (`HasPublicId`, matching
`Employee`/`VacationRequest`/`CashAdjustment`) — a structural and route-binding change across all
4 tables plus every FormRequest and test; (3) `/pr-comments` addressed one remaining open thread,
removing a Cypress spec that was out of scope for a backend-only PR once a reviewer pointed out
the equivalent coverage already existed in PHPUnit; (4) `/sonar-review` fixed 4 SonarCloud
`php:S1192` code smells (duplicated route-parameter literals) and, separately, had to rebase the
branch onto `main` after a GitHub Actions webhook anomaly failed to trigger CI on the Sonar-fix
push — the rebase itself hit conflicts in `README.md` and the sprint-002 doc (both files' shared
progress-tally lines), resolved by taking the union of completed issues rather than either
branch's stale snapshot. The combined total still lands under the pessimistic estimate, but
meaningfully above optimistic — multi-round review response on a new domain's public API surface
(ULID migration in particular) is real, non-itemized work that the original single-session
estimate didn't anticipate.

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
  }
]
```

### 📊 Totals
- **Input:** 1,229 tokens · **Output:** ~165,016 tokens · **Cache read:** ~98.3M tokens · **Cache write:** ~1.5M tokens
- **Estimated cost:** ~$41.13
- Note: this figure covers only the `/issue` implementation + review cycles from the first session. The three later sessions (subfolder/ULID review response, `/pr-comments`, `/sonar-review` + rebase) ran without token/cost instrumentation, so no figures are recorded for them here.

