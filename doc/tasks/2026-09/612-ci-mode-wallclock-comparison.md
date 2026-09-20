# 📊 Capture cross-mode CI wall-clock comparison (e2e-test vs wip vs full)

**Labels:** investment: dev-platform, sprint-9

## Description

Capture and compare the wall-clock cost of the three PR CI execution modes introduced by #589
(the unified `ci.yml` DAG):

- `[e2e-test]` — Cypress-only diagnostic run of the PR's own specs;
- `[wip]` — applicable API/Webapp quality branches + targeted Cypress;
- final / no-modifier — full API + Webapp suites + full Cypress + coverage + Sonar.

Produce a small committed artifact (a table in `doc/conventions/ci/pipeline.md` or a generated
JSON/markdown under `.github/`) that records representative durations for each mode and the fixed
environment-startup overhead, so future Cypress-throughput work (#491, #559) is driven by evidence
rather than assumptions.

## Reason

This is the one unchecked Technical Task carried over from #560 (see that issue's Retrospective:
"Deferred to follow-up (still-unchecked box): the cross-mode wall-clock comparison artifact").
The three modes are proven functionally correct on live CI; only the comparison measurement was
not produced before #560 closed. It has no functional impact and did not block Sprint 007 closure,
but the data is still worth having.

## Objective

A committed artifact shows, per CI mode, the observed wall-clock and the share attributable to
environment startup vs. test execution, referenced from the CI pipeline documentation.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `6m`

### 📅 Sessions
```json
[
  { "date": "2026-09-17", "start": "23:30", "end": "23:36" }
]
```

## 📊 Retrospective

**Tracked:** `6m` (one session, 2026-09-17 23:30–23:36) vs. **Optimistic `1h`** / **Pessimistic
`3h`** — well under even the optimistic estimate.

The issue's own premise had gone stale (#589's `[e2e-test]`/`[wip]`/final modes were retired by
#598 before this comparison was ever produced), but resolving that took one grep against
`doc/conventions/ci/pipeline.md`, which already documented both retirements in its own prose — no
open investigation needed. Most of the data was free: `gh run view --json jobs` against my own two
most recent PRs (#658, #660) — each of which already had both a draft `[ci-check]` run and a
promoted `[ci-check-all]` run on record — supplied the `[ci-check]`/`[ci-check-all]` figures
directly from real timestamps with zero new CI spend. The `[skip-ci]` row was the exception: that
mode had never actually run, so review caught it as an unmeasured extrapolation, which required
one small deliberately-triggered run (temporarily retitling this PR to add `[skip-ci]`, then
reverting — [run 35434756712](https://github.com/pakodiazdev/sushigo/actions/runs/35434756712),
15s) — real, if minor, CI spend on top of the free data. The other non-trivial work was arithmetic
care (multiple rounds of re-verifying wall-clock deltas and overhead/work/dispatch-gap splits with
`python3 -c`, several driven by Codex review catching classification and job-vs-step-boundary
errors after the fact) and cross-checking the shard-imbalance finding against `_e2e-ci.yml`'s code
comments and `testing-strategy.md`'s existing #559 analysis before writing it up, so the new
section reconfirms rather than duplicates or contradicts prior work.



