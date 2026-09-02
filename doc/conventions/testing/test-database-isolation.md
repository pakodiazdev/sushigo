# API Test-Database Isolation Contract

This document is the isolation contract for the Laravel API test suite (PHPUnit). It exists
because a single Inventory constraint violation once cascaded into a wave of unrelated Payroll
test failures on a CI shard, and a plain retry made it disappear (issue #578). A green retry is
not an isolation contract — this is.

---

## Root cause: how one DB error becomes many

1. A test inserts a duplicate `(inventory_location_id, item_variant_id)` `stock` row.
   PostgreSQL rejects it: **`SQLSTATE[23505]` unique_violation** on `unique_stock_per_location`.
2. That error **aborts the surrounding transaction**. Until the transaction ends, every
   subsequent statement on that connection fails with
   **`SQLSTATE[25P02]` — "current transaction is aborted, commands ignored until end of
   transaction block"**.
3. If the test *swallows* the 23505 and keeps going, the failure the runner records is a
   misleading 25P02 on whatever assertion runs next.
4. `RefreshDatabase` wraps **each test** in its own transaction and rolls it back in `tearDown`,
   and `ROLLBACK` always succeeds even on an aborted transaction. So in modern Laravel a
   *properly wrapped* test **cannot** poison the next test in the same process — verified by
   `Tests\Feature\Isolation\TransactionPoisoningContainmentTest`.
5. The 25P02 abort only reaches an unrelated later test when the per-test rollback is bypassed
   or the connection/database is shared:
   - a test that does **not** use `RefreshDatabase` and commits real rows, then leaves an
     unclosed transaction/savepoint on the shared connection, **or**
   - two processes (CI shards, dev-lab workspaces) running against the **same** test database.

Both vectors are now closed in code.

---

## The contract

### 1. Every process runs against a dedicated, disposable `*_test` database

`code/api/phpunit.xml` deliberately does **not** hardcode `DB_DATABASE`. It is supplied by the
environment:

| Environment | `DB_DATABASE` | Source |
|---|---|---|
| dev-lab workspace `x` | `sushigo_ws_<x>_test` | `code/api/.env.testing` |
| CI shard | `mydb_test` | step `env:` in `.github/workflows/_api-ci.yml` (one Postgres **service container per shard**) |
| standalone Docker | `mydb_test` | passed explicitly: `DB_DATABASE=mydb_test php artisan test …` |

`Tests\Support\DatabaseIsolationGuard::enforce()` runs once per process, from
`Tests\TestCase::refreshApplication()` — right after the application (and its fully-resolved
database config) is built, but **before** `RefreshDatabase` runs `migrate:fresh` or opens a
transaction, so an unsafe database is rejected before anything can wipe or migrate it. It first
resolves `DB_URL` through Laravel's own `ConfigurationUrlParser` (a `DB_URL` overrides the
individual `DB_DATABASE`/`DB_HOST`/credential fields at connection time), then **aborts the whole
run** if the effective database name is empty, is a known dev database (`mydb`, `sushigo`,
`sushigo_ws_*` without `_test`, `postgres`, `template*`), or does not end in `_test`. This turns
"silently fell back to `.env` and `RefreshDatabase` wiped my dev database" into an immediate,
explanatory failure.

### 2. No two processes share a test database

Immediately after the identity check, the guard opens a **standalone** PostgreSQL connection and
takes a **session-level advisory lock** (`pg_try_advisory_lock(hashtext('sushigo-phpunit-suite'))`)
held for the entire process. A second PHPUnit process pointed at the **same database on the same
server** fails to acquire it and aborts with a clear message. Because advisory locks are scoped
per database, parallel dev-lab workspaces (`sushigo_ws_a_test`, `sushigo_ws_b_test`, …) and
per-shard CI Postgres containers never collide — only a genuine double-use of one database does.

The guard **fails closed**. The once-per-process latch is set only once the lock is actually held
(or the driver isn't PostgreSQL). If the standalone probe can't reach the database — Postgres down
or still starting — `enforce()` throws from the current test's `setUp()`, before Laravel's
`setUpTraits()` can run `migrate:fresh` or connect, with a "start PostgreSQL and re-run" message.
The suite can never proceed to use the database without the lock because of a transient connection
failure.

### 3. A poisoned or leaked transaction fails at the test that caused it

`Tests\TestCase::tearDown()` checks that **every resolved connection** is at exactly its expected
transaction depth. The expected depth is computed **per connection** from `RefreshDatabase`'s own
`connectionsToTransact()`: **1** for a connection `RefreshDatabase` manages, **0** for any other
connection a test happened to open (a second database, an unmanaged connection). In addition, a
per-test `TransactionCommitted` listener records whether a **real `COMMIT`** (depth back to 0)
happened on a managed connection during the test body. A violation is any of:

| Signal | Meaning |
|---|---|
| depth **above** expected | an unclosed transaction or savepoint — the next test reusing the connection inherits it (and any `25P02` abort on it) |
| depth **below** expected | the `RefreshDatabase` wrapper was committed or rolled back early — this test's writes were committed **for real** and now persist into every later test in the process |
| a real `COMMIT` was seen, even though depth is back to the expected **1** | the test committed the wrapper and then opened a replacement transaction that hides it from the depth check — the wrapper's writes are still committed for real (a nested `DB::transaction()` never trips this: its `commit()` lands at depth ≥ 1, not 0) |

When a violation is found the guard:

1. for an **above**-expected level, rolls the connection all the way back and disconnects it, so
   the next test starts clean;
2. for a **below**-expected level or an observed real `COMMIT` (the wrapper's rows are real and
   nothing can roll them back), sets `RefreshDatabaseState::$migrated = false` so the next
   `RefreshDatabase` test re-runs `migrate:fresh` before it begins, instead of inheriting the
   contamination;
3. runs `parent::tearDown()` in full — Laravel's own `RefreshDatabase` rollback, application
   teardown and `Carbon`/`Mockery` reset all still happen, and only **then**
4. **fails the current test** with `Database isolation violated in <Class>::<test>() — …`, whose
   message states which remedy was applied.

The originating test is named in the JUnit report instead of an unrelated later victim, and no
framework cleanup is skipped as a side effect of the failure.

### 4. CI lists database failures per shard, classified, without a cascade claim

`.github/scripts/test-timing/db-failures.js` (run in the non-gating `api-junit-merge` job) reads
each shard's JUnit XML and writes a **"Database Failures by Shard"** block to the job summary.
Shards are independent processes against independent databases, and within a shard `RefreshDatabase`
gives every test its own transaction — so no two separate test failures can be assumed from the
JUnit alone to share a causal chain. Per shard it therefore lists **every** DB failure in
execution order, each row classified as a concrete constraint/query error or a `25P02`
aborted-transaction failure; it points at the first concrete error as the most likely thing to
check first (a heuristic, not a causal assertion) and states plainly that each `25P02` is its own
failure to investigate, not a guaranteed cascade. Diagnostic only — it never gates a merge (TD-06).

---

## Deterministic reproduction

Run the Inventory and Payroll suites together, in both orders, without any retry:

```bash
cd code/api

# dev-lab (DB_DATABASE comes from .env.testing):
php artisan test tests/Feature/Inventory tests/Feature/AttendancePayroll tests/Feature/Isolation

# force the reversed execution order that the original CI shard hit:
vendor/bin/phpunit --order-by=reverse \
  tests/Feature/Inventory tests/Feature/AttendancePayroll tests/Feature/Isolation

# standalone Docker mode — DB_DATABASE must be explicit:
docker exec dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test vendor/bin/phpunit \
  tests/Feature/Inventory tests/Feature/AttendancePayroll tests/Feature/Isolation"
```

Prove the two processes cannot share a database (expect the second to abort):

```bash
cd code/api
DB_DATABASE=sushigo_ws_a_test vendor/bin/phpunit tests/Feature/Isolation &
DB_DATABASE=sushigo_ws_a_test vendor/bin/phpunit tests/Feature/Isolation   # -> RuntimeException: already locked
wait
```

---

## Diagnosis order when an API shard fails on the database

1. Open the failing job's **"Database Failures by Shard"** summary block and work **one shard at a
   time** — shards have independent databases, so a failure in one shard tells you nothing about
   another.
2. Within a shard, every listed failure is its **own** investigation, in execution order.
   - The *"most likely root cause to check first"* line points at that shard's first concrete
     (non-`25P02`) SQLSTATE — usually `23505`, `23503`, or a `CHECK` violation. That is a starting
     heuristic, **not** proof the other rows cascade from it.
   - A `SQLSTATE[25P02]` row means *that* test's transaction was already aborted when its assertion
     ran. Because `RefreshDatabase` gives every test its own transaction, its trigger is either in
     that same test (often untagged — a swallowed `QueryException`, a misplaced `expectException`)
     or leaked from an earlier test (which the `tearDown` guard should have caught — see step 3).
     Fix each `25P02` test on its own merits; do **not** skip it waiting for an unrelated concrete
     error elsewhere to be fixed first.
3. If `tearDown` reported `Database isolation violated in …`, fix the transaction handling in that
   named test — an unclosed transaction/savepoint, or an over-`commit()` that dropped the
   `RefreshDatabase` wrapper — do not weaken the assertion or the constraint.
4. If the guard aborted the run with an identity/lock error, the environment contract is
   broken: a missing `.env.testing`, an unset `DB_DATABASE`, or two runs on one database.

---

## Rules

- **Never** weaken `unique_stock_per_location` or any production constraint to make a test pass.
- **Never** add a CI retry wrapper to hide a flake — fix the isolation defect it exposes.
- A test that expects a database error must let it propagate (`$this->expectException(...)`) or
  catch it and stop; it must not swallow it and keep asserting.
- A test that opens its own transaction/savepoint must balance it before the test method returns.
