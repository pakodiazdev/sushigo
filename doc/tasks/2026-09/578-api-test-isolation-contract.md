# 🧪 Eliminate API test transaction-poisoning and database-isolation flakes

**Labels:** backend, investment: dev-platform, sprint-8

## Description

Diagnose and eliminate the API CI shard failure cascade observed during Sprint 6 reviews: an
Inventory `unique_stock_per_location` constraint collision aborted/poisoned a PostgreSQL test
transaction, after which unrelated Payroll assertions (`ReclosePayPeriodApiTest` /
`ConfirmCloseApiTest`) failed until the shard was re-run.

The symptom was recorded independently in #438/#440 execution evidence and in the Sprint 6 review,
but no dedicated root-cause Issue was filed. A green retry is not an isolation contract.

## Reason

A PostgreSQL error inside a test transaction leaves that transaction in an aborted
(`25P02`) state: every subsequent statement on the same connection fails with
`current transaction is aborted, commands ignored until end of transaction block`. When file-level
CI sharding places an Inventory suite and a Payroll suite in the same shard process, a single
`unique_stock_per_location` violation can therefore surface as a wave of unrelated Payroll
failures, and a plain CI retry makes the whole thing disappear without any contract proving it
cannot recur. The test tier needs an explicit, enforced isolation contract — a poisoned connection
must fail loudly at the test that poisoned it, never leak into the next test, and never be able to
run against a shared or mislabelled database.

## Objective

Make API test shards deterministic and ensure the first database failure cannot masquerade as a
later unrelated Payroll regression or leave subsequent tests running in an invalid transaction.

## Investigation and Technical Tasks

- [x] Identify the exact first failing test/query and capture SQLSTATE, seed, shard, test order,
      database name, and transaction state before analyzing downstream failures.
- [x] Reproduce with the affected shard repeatedly and with randomized/reversed order; distinguish
      same-process test pollution from cross-workspace/shared-database contention.
- [x] Audit Stock factories/seeders/helpers for deterministic Location+Variant reuse that violates
      `unique_stock_per_location` and fix the producer instead of weakening the constraint.
- [x] Audit `RefreshDatabase`, nested transactions, exception handling, and teardown so an aborted
      PostgreSQL transaction stops/fails at the originating test and cannot cascade.
- [x] Ensure each CI shard and each concurrent local workspace resolves a distinct test database;
      add an early fail-fast identity/collision check if the environment contract is violated.
- [x] Make JUnit/job summaries identify the first database failure separately from secondary errors.
- [x] Remove any temporary defensive workaround that hides the originating constraint violation
      once the root cause is proven.
- [x] Document the API test-database isolation contract and a deterministic reproduction command.

## Tests and Evidence

- [x] Run the affected shard/order repeatedly without retries and record the evidence.
- [x] Add regression coverage for the exact Stock factory/seeder collision if reproduced.
- [x] Prove concurrent shard/workspace database names are distinct before migrations execute.
- [x] Verify the relevant Inventory and Payroll suites together in both normal and reversed order.
- [ ] Full API CI remains green without retry-based acceptance.

## Acceptance Criteria

- [x] The root cause is identified with the first failing test and SQLSTATE, not inferred from the
      final Payroll symptom.
- [x] `unique_stock_per_location` remains enforced.
- [x] A failing database test cannot poison later tests or misattribute the failure to Payroll.
- [x] CI shards and concurrent dev-lab workspaces cannot share a test database silently.
- [ ] The previously affected combined sequence passes repeatedly without workflow retry.
- [x] Testing documentation records isolation, diagnosis, and reproduction behavior.

## Dependencies and Parallelization

- May reuse #560's unified CI/JUnit evidence but does not depend on Inventory Sprint 8 features.
- Can run in parallel with product-facing work.

## Out of Scope

- Weakening production uniqueness constraints.
- Fixing unrelated functional Payroll behavior without a reproducible failing assertion.
- Treating automatic CI retries as the solution.

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h` · **Pessimistic:** `8h` · **Tracked:** `4h 0m`

### 📅 Sessions

```json
[
  { "date": "2026-09-01", "start": "17:26", "end": "18:18" },
  { "date": "2026-09-02", "start": "12:00", "end": "15:08" }
]
```

## 📊 Retrospective
- **Actual total:** 4h 0m (52m + 188m)
- **vs optimistic:** +1h 0m
- **vs pessimistic:** −4h 0m

**Justification:**
The core implementation landed inside the first 52-minute session (2026-09-01): the autonomous
`/issue-no-review` run reproduced the `23505 → 25P02` chain locally and built
`Tests\Support\DatabaseIsolationGuard` (identity + PostgreSQL advisory lock), the
`Tests\TestCase` `tearDown` containment guard, the regression/unit tests, the non-gating per-shard
CI failure summary, and the contract doc, then opened the PR.

The remaining 188 minutes (2026-09-02) was almost entirely review response, not new scope, and is
a consolidated estimate because `/pr-comments` cycles are not session-tracked. Codex's automated
review surfaced eight successive P1/P2 gaps in the guard's control flow — each real and localized:
run the guard from `refreshApplication()` before `setUpTraits()` (checking it afterwards was too
late — an unsafe DB was already wiped); resolve `DB_URL` via `ConfigurationUrlParser` before
validating and locking; compute the expected transaction depth per connection from
`connectionsToTransact()`; run `parent::tearDown()` in a `finally`; flag a below-expected depth
(over-committed wrapper) and, separately, a wrapper committed-then-reopened via a
`TransactionCommitted` listener; fail closed rather than skip-and-retry when the lock probe can't
connect; and stop the CI summary asserting cross-shard / cross-test cascades that
`RefreshDatabase`'s per-test transactions do not support. Two rebases onto a moving `main` (one
with a real `generate.js` conflict from #559's Cypress-timing change) and a Devin flag pass
(`\Throwable` import, scope the DB summary to the PHPUnit invocation) accounted for the rest.

One item is deliberately left open and out of scope: the pre-existing `ReclosePayPeriodApiTest`
contamination flake — a `200 OK` reclose that intermittently recalculates `0` `PayPeriodLine`s
from non-transactional state leaked by an earlier shard-1 test. It is **not** the
transaction-poisoning vector this contract covers; pinning it needs a shard bisection plus a
Payroll-domain scoping decision, tracked in the PR's `## ⚠️ Needs Human Judgment` section. The two
unticked acceptance boxes ("passes repeatedly / CI green without retry") are held open by that
flake, not by the isolation contract, which is complete and verified locally
(`OK (1326 tests, 4095 assertions)` across `Isolation` + `AttendancePayroll` + `Inventory` + the
guard unit tests, zero guard trips).




