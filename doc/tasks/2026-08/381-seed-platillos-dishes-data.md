# 🌱 Seed Platillos (dishes) data — Testing/Fakes/Development

## Description

Seed data for the Platillos domain, following this project's three-tier seeder convention
(`Testing/`, `Fakes/`, `Development/` — see CLAUDE.md's Test Data Seeders section).

## Reason

The dishes domain needs believable data from day one to actually demo — an empty catalog doesn't
show the feature. This project's own convention already separates deterministic test fixtures from
volume factories from a rich development experience; dishes need all three, not an afterthought
bolted onto the backend issue.

## Objective

- `Testing/` — a handful of deterministic dishes (at least one per extras configuration shape:
  no extras, single-required group, multiple-optional group) so PHPUnit/Cypress can assert exact
  values
- `Fakes/` — factories for volume (pagination testing across many dishes/categories)
- `Development/` — the real one: dish categories matching the restaurant's actual live menu
  (Rollos, Onigiris, Yakionigiris, Sushiball, Ramen, Alitas, Boneless, Dumplings, Paquetes), a
  reasonable spread of dishes per category with realistic names/descriptions/prices, and at least
  a few dishes with populated extras groups (e.g. a Ramen with a spice-level group, a Roll with a
  sauce choice) so the extras UI has something real to show immediately after seeding

## 🔗 References

- Seeder convention: `CLAUDE.md` → "Test Data Seeders"
- Depends on #379 (dishes backend domain — needs the tables/models to exist first)
- Category source: sushigo-romita.com/menu

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `37h 7m`

### 📅 Sessions
```json
[
  { "date": "2026-08-05", "start": "21:25", "end": "10:20" },
  { "date": "2026-08-06", "start": "10:20", "end": "10:32" }
]
```

## 📊 Retrospective
- **Actual total:** 37h 7m (775m + 1452m)
- **vs optimistic:** +35h 7m
- **vs pessimistic:** +33h 7m

**Justification:**
The core seeder implementation (Testing/Fakes/Development tiers) landed close to the original
estimate on the first pass, but the tracked wall-clock span grew well beyond that across two
sessions, almost entirely from asynchronous review/CI cycles rather than continuous engineering
time:

- SonarCloud's quality gate failed on new-code duplication (23.9% vs. a 3% threshold), caused by
  ~30 nearly-identical array-literal dish entries in `DishSeeder` and repeated insert-row shapes in
  `DishesTestSeeder`. Both had to be refactored into per-category methods and row-builder helpers —
  unplanned rework not contemplated by the estimate.
- Copilot's review flagged a pre-existing backslash-prefixed-FQCN convention violation in
  `DevelopmentSeeder.php` that this PR's diff happened to touch — fixed alongside the seeder
  registration it was already editing.
- Devin/DeepWiki's review (first round) surfaced a genuine correctness bug: `updateOrCreate()`'s
  default query scope excludes soft-deleted rows, so re-running the Development seeders after an
  admin soft-deletes a category/dish would have inserted a duplicate instead of updating the
  trashed row. Fixing this required `withTrashed()` on four call sites plus regression tests.
- A second, independent review pass (human-run code review) caught that the first fix, while
  preventing duplicates, never actually restored the trashed row — leaving it soft-deleted with
  contradictory fresh attribute values, and silently dropping every dish under a soft-deleted
  category from re-seeding. This required a proper fix (a `RestoresTrashedOnUpsert` trait that
  restores matched trashed rows) plus new regression tests proving restoration, not just
  non-duplication.
- That same review pass, independently corroborated by Devin/DeepWiki citing the same CLAUDE.md
  rule, found the live menu catalog (9 categories, 36 dishes) hardcoded directly in the seeder
  classes instead of `config/seeders.php` as the project's seeder convention requires — moved to
  config as compact positional tuples (to avoid reintroducing the duplication problem) with the
  seeders reading from it.
- A follow-up Devin/DeepWiki round on the corrected code found two more minor, worthwhile cleanups
  (raw `'SINGLE'`/`'MULTIPLE'` string literals instead of model constants; extras-group tests
  matching "any dish with an extra group" instead of the specific seeded dish by name).
- A GitHub Actions **platform-wide partial outage** occurred mid-run, causing several CI jobs to
  fail with "runner not acquired" and two workflow runs to get stuck in a zombie queued state even
  after the outage cleared on GitHub's status page — required re-running jobs and amending the
  commit (same content, new SHA) to force fresh runs once GitHub recovered.
- A `/rebase-main` was needed after an unrelated Issue (`#382`) merged to `main` first, conflicting
  on the shared sprint-progress summary lines — resolved by combining both completions into one
  "9/14" progress line instead of the two separate "8/14" lines.
- Every one of the above required a full round-trip through the CI gate, and the Copilot/Devin
  polling windows (up to ~10 minutes each, several rounds) — plus the two sessions' gap while
  waiting on asynchronous review — account for nearly all of the wall-clock time beyond the
  estimate; the actual engineering/typing time across both sessions was a small fraction of the
  tracked total.




