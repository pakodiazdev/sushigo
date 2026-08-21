# ⏱️ Instrument API test timings and identify PHPUnit CI bottlenecks

**Labels:** investment: dev-platform

## Description

Instrument the API PHPUnit workflow so CI reports **which individual tests are consuming the most time** instead of exposing only the total workflow duration.

Recent `API Tests (PHPUnit + Coverage)` runs have shown a large difference between executions (roughly ~50s vs ~5m30s depending on the PR/run). Before splitting the suite or adding parallel jobs, collect per-test timing data and separate actual PHPUnit execution time from coverage/setup overhead.

## Reason

The CI feedback loop is a shared dev-platform resource used by every workspace in dev-lab. A ~6x
swing between the fastest and slowest observed run makes it impossible to tell, without data,
whether the slowness is a handful of pathological tests, broadly distributed Feature/Integration
cost, or coverage/setup overhead — and any decision to split or parallelize the suite made without
that evidence risks solving the wrong problem (see the "no split without timing evidence" Acceptance
Criterion below).

## Objective

Make API test performance observable enough to answer, with data:

1. Which individual tests are the slowest?
2. How much of the runtime comes from PHPUnit itself vs coverage/reporting/setup?
3. Are a few integration/database tests dominating runtime, or is the cost distributed across the suite?
4. Would splitting/parallelizing the suite materially improve CI time, or should specific tests be optimized first?

## ✅ Technical Tasks

- [x] Update the API test command to generate a JUnit report, e.g. `--log-junit=test-results.xml`, while preserving the existing coverage output.
- [x] Add a CI step that parses `test-results.xml` and publishes the **Top 20 slowest tests** to the GitHub Actions Job Summary.
- [x] Include, at minimum, test/class name and duration for each reported test.
- [x] Report aggregate timing information when available: total test time, test count, and slow-test contribution to the total.
- [x] Ensure the timing summary is generated with `if: always()` when possible so failed suites still provide diagnostic timing data.
- [x] Upload/preserve the JUnit timing report as a CI artifact for deeper inspection when needed.
- [x] Add a repeatable diagnostic path to compare the suite **with and without coverage** without changing the normal PR validation contract.
- [x] Measure at least one representative full API run and document the observed bottleneck(s).
- [x] Review slow tests for repeated migrations, `RefreshDatabase`, seed/reset work, unnecessary catalog reconstruction, external waits, sleeps, or other avoidable I/O.
- [x] If the data shows that splitting/parallelizing the suite is justified, create a **follow-up Issue** with the proposed partition strategy instead of expanding this Issue's scope automatically.

## 🎯 Acceptance Criteria

- [x] Every normal API test CI run produces a readable slow-test summary in GitHub Actions.
- [x] The 20 slowest tests can be identified without manually reading raw PHPUnit logs.
- [x] JUnit timing data is retained as an artifact.
- [x] A with-coverage vs without-coverage comparison can be reproduced and its result is documented.
- [x] The Issue concludes with evidence showing whether the main bottleneck is:
  - a small number of slow tests,
  - broadly distributed Feature/Integration cost,
  - coverage overhead,
  - or CI/setup overhead.
- [x] No test-suite split is introduced without timing evidence supporting it.
- [x] Existing API test behavior and coverage/Quality Gate expectations remain intact.

## 📈 Measured Findings

Two representative CI runs were dispatched on the same `ubuntu-latest` runner type (PR #480,
commit with the instrumentation from this Issue), one with `--coverage`, one without, via the new
`workflow_dispatch` `skip_coverage` diagnostic input:

| | With coverage | Without coverage |
|---|---|---|
| Tests | 1903 | 1903 |
| Sum of individual test durations (pure PHPUnit) | 185.73s | 178.36s |
| `api-tests` job wall time | 3m59s | 3m40s |
| Top 20 slowest tests' contribution | 36.55s (19.7%) | 18.62s (10.4%) |

**1. Which individual tests are the slowest?** See the two runs' Job Summaries
([with coverage](https://github.com/pakodiazdev/sushigo/actions/runs/32512729021),
[without coverage](https://github.com/pakodiazdev/sushigo/actions/runs/32513181332)). Positions
2–20 in both runs are consistently `Tests\Feature\Console\TestResetCommandTest`,
`TestResetProductCatalogSeederTest`, and `TestResetDishesSeederTest` — exactly the classes flagged
in "Initial investigation candidates" above. These test the `test:reset` artisan command itself
(full table truncation + large seeder runs), so their cost is legitimate integration-style DB work,
not an accident.

Position #1 in every run (`EnsurePeriodIsEditableActionTest::returns_false_when_a_closed_period_covers_the_date`)
is **not actually a slow test** — it is a measurement artifact. It is literally the first test
PHPUnit executes in the whole run (first class of the `Unit` suite), so its reported duration
absorbs Laravel's one-time `RefreshDatabase` migration bootstrap for the entire process. Its
sibling tests in the same class run in ~0.2s each. This is why its reported time varies so wildly
by environment: 5.05s (CI, with coverage), 1.09s (CI, without coverage), and 26.81s on a loaded
local dev-lab machine running several concurrent workspaces against the same shared Postgres
container. Not a candidate for optimization.

**2. How much of the runtime comes from PHPUnit itself vs coverage/reporting/setup?** Coverage
overhead is small: ~7.4s (~4%) of PHPUnit's own reported test time, and ~19s of the job's total
wall time (PCOV instrumentation + `coverage.xml` generation). Coverage is **not** the primary cost
driver.

**3. Are a few tests dominating, or is cost distributed?** Broadly distributed. The Top 20 slowest
tests are only ~10–20% of total test time; the remaining ~80–90% is spread across the other ~1880
tests at sub-second cost each.

**4. Would splitting/parallelizing materially help?** Yes — because the cost is broadly
distributed (not concentrated in a few fixable tests), parallel sharding is the mechanism that
captures it, the same way `webapp-tests.yml` already shards Vitest into 4 jobs. Filed as a
follow-up per the Technical Tasks item above: **[#481](https://github.com/pakodiazdev/sushigo/issues/481)**
— proposed partition strategy, isolation/coverage-merge concerns, and this data are carried over
there so the follow-up isn't started from a blank page.

**Why the originally observed ~50s vs ~5m30s swing per PR/run?** Not explained by what changed in
any given PR's diff — `api-tests` only runs its real steps when `code/api/**` changed (path-filter
gate), so a ~50s run is very likely one where the filter skipped everything (as this PR's own
`pull_request` check did — see PR #480's `api-tests` run, 39s, all steps skipped). A ~5m30s run is
one where the filter passed and the full ~180s suite plus setup ran for real. Shared-runner
variance (seen directly in this Issue's own 26.8s-vs-1–5s local-vs-CI gap) plausibly accounts for
the rest.

## 🔎 Initial investigation candidates

Do **not** assume these are slow until timing data confirms it, but pay special attention to integration/database-heavy tests around product catalog seeding/reset and API integration because they are plausible sources of repeated database work.

Examples worth checking if they appear near the top of the timing report:

- `TestResetProductCatalogSeederTest`
- `ProductCatalogSeederTest`
- `ProductCatalogApiIntegrationTest`

## 🧭 Implementation Notes

Prefer a small reusable script/tool for parsing JUnit instead of a large inline shell block if the summary logic becomes non-trivial. Keep the normal PR workflow simple and deterministic.

This Issue is diagnostic/observability work first. Optimization or suite partitioning should follow the measured result.

## 🏷️ Investment Type

`investment: dev-platform` — this work improves CI observability, developer feedback speed, and the system used to develop SushiGo rather than adding product-domain functionality.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h30m` · **Pessimistic:** `3h30m` · **Tracked:** `1h26m`

### 📅 Sessions
```json
[
  { "date": "2026-08-21", "start": "12:15", "end": "13:41" }
]
```

## 🔗 References

- Workflow: `.github/workflows/api-tests.yml`
- Existing API command: `php artisan test --coverage --coverage-clover=coverage.xml`

## 📊 Retrospective
- **Actual total:** 1h 26m (86m — single session)
- **vs optimistic:** −4m (under)
- **vs pessimistic:** −2h 4m (under)

**Justification:** Finished just under the optimistic estimate despite doing more than the
Technical Tasks checklist literally asked for. The implementation itself (JUnit parser + unit
tests + workflow wiring + docs) went quickly by reusing the existing `.github/scripts/iteration-progress/`
convention verbatim (plain CommonJS, no deps, `node:test`), which avoided any design churn. The
time instead went into actually **using** the instrumentation to satisfy the Acceptance Criteria
that required real evidence: dispatching two live `workflow_dispatch` CI runs (with/without
coverage) to get a clean same-runner comparison, downloading both JUnit artifacts to compile the
findings, tracing the volatile #1 "slowest test" back to a `RefreshDatabase` migration-bootstrap
artifact rather than taking the raw number at face value, and filing the data-justified follow-up
[#481](https://github.com/pakodiazdev/sushigo/issues/481) per this issue's own instruction not to
expand scope. One Copilot review cycle came back with two legitimate doc-accuracy findings, both
fixed in a single follow-up commit before squashing. Codex's `@codex review` trigger produced no
response within the 10-minute window — the GitHub App does not appear to be connected to this repo
yet — so that stage degraded gracefully as designed rather than blocking.






