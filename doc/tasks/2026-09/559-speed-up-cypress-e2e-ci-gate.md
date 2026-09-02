# 🚀 Optimize the cypress-e2e CI gate to <5 min wall-clock

**Labels:** investment: dev-platform, sprint-8

## 📝 Description

The `cypress-e2e` CI gate added in #490 runs green but its wall-clock is **~5.5–7 min** (slowest shard), above the ~5 min target. Bumping the shard count further does not help: most of the cost is **per-shard fixed overhead that does not shard away**.

## Reason

Every PR that touches `code/**`, Docker, or the CI workflows waits on the full Cypress E2E gate before it can merge, and at ~5.5–7 min for the slowest shard it is the longest pole in PR validation — the `/issue*` pipelines that watch CI to completion pay that wall-clock on every push. The cost is not the tests themselves; it is per-shard fixed overhead (image build, cold `composer install` / `npm install`, `l5-swagger:generate`) paid in full by every one of the 6 shards, which does not shrink when shards are added. Driving that overhead down is the only way to get the gate under the ~5 min target without simply spending more runner minutes.

## 📊 Baseline (from #490's `cypress-timing` report + job step timings, 6 shards)

Per shard (~7 min slowest):

| Phase | ~Time | Shardable? |
|---|---|---|
| Boot E2E stack (`docker compose up test_e2e`, incl. building `docker/app/Dockerfile` target dev) | ~60–70s | ❌ fixed |
| Wait Laravel API health (`init.sh`: cold `composer install` + `npm install` ×2 + migrate + seed + `l5-swagger:generate`) | ~60–65s | ❌ fixed |
| Boot PostgreSQL + waits + teardown | ~30s | ❌ fixed |
| `npm install` inside the `cypress` container + run specs | ~250–290s | ✅ partly (specs only) |

Total test work across all shards: **~635s / 130 testcases** — evenly spread, slowest single test ~16s, no monster spec to split out.

## 🎯 Objective — get `cypress-e2e` wall-clock under ~5 min

Attack the fixed overhead, roughly in impact order:

1. **Cache `node_modules` for the `cypress` service** — it runs `npm install` on every shard (~40–60s). Mount a cached `code/webapp/node_modules` or prime the npm cache.
2. **Cache the `test_e2e` image** — build once in a prep job (`docker/build-push-action` with `cache-to/from: type=gha`, or `docker save` → artifact → `docker load` per shard). ~40–60s/shard.
3. **Cache `code/api/vendor` + `code/webapp/node_modules` for `init.sh`** via `actions/cache`, mounted into the container so the cold composer/npm installs are warm. ~30–60s/shard.
4. **Skip `l5-swagger:generate`** in the E2E boot path (not needed for E2E). ~5s.
5. Only after the above: consider 8 shards for the remaining ~100s of test time (doubles runner minutes — measure first).
6. Optionally sharpen the `cypress-timing` report's per-spec attribution (mocha-junit-reporter `classname` vs Cypress spec file).

## ✅ Acceptance Criteria

- [ ] `cypress-e2e` wall-clock (slowest shard) is under ~5 min on a representative PR
- [x] Runner-minute cost does not increase disproportionately (document the trade-off)
- [x] `cypress-e2e` stays green with the same spec set (no new quarantines)
- [x] `testing-strategy.md` "Cypress E2E in CI" updated with the new timings

## Investment Type

`investment: dev-platform`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `1d`
- **Tracked:** `2h37m`

### 📅 Sessions
```json
[
  { "date": "2026-09-01", "start": "17:28", "end": "18:45" },
  { "date": "2026-09-02", "start": "00:40", "end": "02:00" }
]
```

## 📊 Retrospective
- **Actual total:** 2h37m (77m + 80m)
- **vs optimistic:** −23m
- **vs pessimistic:** −5h23m

**Justification:**
Session 1 (77m) was the autonomous `/issue-no-review` delivery: all six plan avenues landed —
`type=gha` layer cache for the `dev` image reused via a compose `image:`, an `actions/cache`
for `code/api/{vendor,node_modules}` + `code/webapp/node_modules` bind-mounted so `init.sh`
skips its cold installs, `l5-swagger:generate` skipped under `ENV=e2e`, and a Cypress-aware
timing report. Avenue 5 (8 shards) was implemented, measured on a warm run, and reverted: it
moved the slowest shard ~1s because the bottleneck is the file-index shard split's imbalance,
not the shard count.

Session 2 (80m) was Codex review-response: three findings — a P2 where the timing parser read
suite totals from the first `<testsuite>` (zeroed "Root Suite" for Cypress) instead of the
`<testsuites>` root, a P2 where the `vendor/` cache (keyed on `composer.lock` only) could serve
a stale optimized classmap when a first-party class moved without a lockfile change, and a P1
where the first fix's `--no-scripts` suppressed `artisan package:discover` and left the uncached
`bootstrap/cache/packages.php` unbuilt — plus a rebase onto `main` and one re-run of a
pre-existing flaky payroll test (`ConfirmCloseApiTest`, unrelated to this PR, which touches no
`code/api/` files). CI wall-clock waiting is excluded from both figures.

Under the optimistic estimate overall. The one criterion not met is the headline target: the
slowest shard is ~5.5–6 min warm (down from ~5.5–7 min), not under ~5 min — fixed overhead was
cut ~45%, but closing the last minute needs duration-aware shard balancing, recorded as the
follow-up in `testing-strategy.md`.




