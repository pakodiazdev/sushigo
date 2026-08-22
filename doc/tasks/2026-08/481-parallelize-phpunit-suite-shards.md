# 🚀 Parallelize API PHPUnit suite across shards to cut CI wall time

**Labels:** investment: dev-platform

## Description

[#477](https://github.com/pakodiazdev/sushigo/issues/477) instrumented the `API Tests (PHPUnit +
Coverage)` workflow with per-test JUnit timing and measured two representative CI runs (same
`ubuntu-latest` runner type, one with `--coverage`, one without). The data shows PHPUnit execution
time (not coverage, not CI setup) is the dominant cost, and that cost is **broadly distributed**
across the 1903-test suite rather than concentrated in a handful of pathological tests. This Issue
proposes splitting the suite into parallel shards — the same pattern `webapp-tests.yml` already
uses (`matrix.shard: [1, 2, 3, 4]` + `vitest run --shard=`) — to cut wall-clock CI time.

## Reason

A ~180s single-process PHPUnit run is the largest remaining piece of `api-tests`' wall time, and
per #477's data it isn't reducible by fixing a few slow tests — the Top 20 slowest tests are only
~17–20% of total test time; the other ~80% is spread over ~1880 tests at sub-second cost each.
Parallelizing is the mechanism that captures a broadly-distributed cost; targeted optimization of
individual tests is not, per #477's own "no split without timing evidence" Acceptance Criterion —
which this Issue's data now satisfies.

## Objective

Reduce `api-tests`' wall-clock CI time by running PHPUnit in N parallel shards (mirroring
`webapp-tests.yml`'s existing matrix pattern), while keeping today's single coverage report and
the SonarCloud Quality Gate contract intact.

## 📊 Measured baseline (from #477, both runs on `ubuntu-latest`, same commit)

| | With coverage | Without coverage |
|---|---|---|
| Tests | 1903 | 1903 |
| Sum of individual test durations | 185.73s | 178.36s |
| `api-tests` job wall time | 3m59s | 3m40s |
| Top 20 slowest tests' contribution | 36.55s (19.7%) | 18.62s (10.4%) |

- Coverage overhead is small (~4% of PHPUnit's own reported time, ~19s of job wall time) — **not**
  the primary cost driver.
- The #1 slowest test in every run (`EnsurePeriodIsEditableActionTest::returns_false_when_a_closed_period_covers_the_date`,
  5.05s with coverage / 1.09s without / 26.81s on a loaded local dev-lab machine) is a measurement
  artifact, not a slow test: it is literally the first test PHPUnit executes, so its reported
  duration includes Laravel's one-time `RefreshDatabase` migration bootstrap for the whole run —
  its sibling tests in the same class run in ~0.2s each. Not a candidate for optimization.
- Positions 2–20 are consistently `Tests\Feature\Console\TestResetCommandTest`,
  `TestResetProductCatalogSeederTest`, and `TestResetDishesSeederTest` — tests of the `test:reset`
  artisan command itself (full table truncation + large seeder runs), exactly the "Initial
  investigation candidates" #477 flagged. These are legitimately expensive integration-style tests
  of a command whose whole job is to do bulk DB work, not accidentally slow.
- The remaining ~80–90% of total test time is spread broadly across the rest of the suite — no
  further small set of tests would meaningfully move the needle if optimized individually.

## ✅ Technical Tasks

- [x] Design a shard count and partition strategy for `code/api/tests/` (start from `webapp-tests.yml`'s 4-shard pattern; PHPUnit's own `--order-by=random` + a shard plugin, or Paratest, are candidates — pick based on what keeps per-shard database isolation correct under `RefreshDatabase`)
- [x] Update `.github/workflows/api-tests.yml`'s `api-tests` job to a `matrix.shard` strategy
- [x] Ensure each shard gets its own isolated Postgres test database (avoid the `SQLSTATE[40P01]` deadlock class of bug already fixed once for dev-lab workspaces, see #268/#84)
- [x] Merge per-shard coverage reports into the single `coverage.xml` `api-sonar` already expects (mirror `webapp-tests.yml`'s "Merge shard reports into final coverage" step)
- [x] Merge per-shard JUnit reports before publishing the #477 slow-test summary, so the Job Summary still reflects the whole suite, not just one shard
- [x] Re-measure wall-clock time after sharding and record the before/after in this Issue's Retrospective

## 🎯 Acceptance Criteria

- [x] `api-tests`' wall-clock time is measurably reduced from the #477 baseline above (final validated run: ~1m47s vs #477's 3m59s baseline, a ~55% reduction — see Retrospective)
- [x] SonarCloud Quality Gate (coverage %, new-code duplication) behaves identically to today — no coverage blind spots introduced by sharding (`api-sonar` + the SonarCloud check both passed on this PR's own run)
- [x] The #477 slow-test Job Summary still reports whole-suite Top 20 + aggregate, not per-shard partial data (`api-junit-merge` succeeded; summed shard test counts = 1903, matching #477's baseline exactly — no tests lost or duplicated by the split)
- [x] No `SQLSTATE[40P01]` or similar concurrent-database errors introduced (each shard runs its own isolated `pgsql` service container; none observed in any shard's logs)

## 🏷️ Investment Type

`investment: dev-platform` — CI performance/observability, not product-domain functionality.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `5h` · **Tracked:** `2h05m`

### 📅 Sessions
```json
[
  { "date": "2026-08-21", "start": "14:45", "end": "16:50" }
]
```

## 📊 Retrospective
- **Actual total:** 2h 05m (single session, 14:45–16:50)
- **vs optimistic:** +5m (over)
- **vs pessimistic:** −2h 55m (under)

**Justification:** Landed close to the optimistic estimate despite hitting two real, live-CI-only
bugs that couldn't have been caught locally (this dev-lab workspace has no PCOV/Xdebug driver, so
coverage collection can only be validated against actual CI). First, `php artisan test --coverage
--coverage-php=...` failed with "Option --coverage-php cannot be used more than once" — Laravel's
`TestCommand` auto-injects its own internal `--coverage-php` when given `--coverage`, silently
dropping coverage while still exiting 1; fixed by invoking `vendor/bin/phpunit` directly for the
shard steps, bypassing the wrapper. Second, a squashed-commit CI run hit a genuinely flaky
pre-existing test (`ConfirmCloseApiTest`, unrelated AttendancePayroll domain code this Issue never
touched) — confirmed flaky by re-running the identical shard/file-set, which passed cleanly.
Neither of these required scope expansion, just diagnosis discipline. A Copilot review cycle
(`/pr-comments`) then found one real efficiency gap: the matrix's `services.pgsql` containers
started for all 4 shards regardless of `paths-filter`, since a step-level `if:` can't stop a job's
own `services:` block from starting — fixed by centralizing path detection into a shared `changes`
pre-job and gating `api-tests`/`api-junit-merge`/`api-coverage-merge`/`api-sonar` at the job level,
plus extracting the timing-script's own unit tests into a standalone non-matrix job. That fix also
happened to reveal the first CI run's ~3m40s/2m37s-slowest-shard timing was mostly runner noise,
not a structural round-robin imbalance — the final validated run landed at ~1m47s (all 4 shards
within a 25s spread), a genuine ~55% reduction from #477's 3m59s baseline, well past the
"measurably reduced" bar. Closing out also surfaced an orphaned branch-protection rule: `main`
required a status check literally named `api-tests`, which stopped existing the moment this Issue
renamed that job to 4 per-shard names — fixed by updating the required-checks list to the 4 shard
names (mirroring how `webapp-tests`' own sharding was already configured), with explicit user
sign-off since it's a shared-infrastructure change outside this PR's diff.

## 🔗 References

- [#477](https://github.com/pakodiazdev/sushigo/issues/477) — the instrumentation and measured data this Issue is based on
- `.github/workflows/webapp-tests.yml` — existing 4-shard Vitest pattern to mirror
- `.github/workflows/api-tests.yml` — workflow to modify






