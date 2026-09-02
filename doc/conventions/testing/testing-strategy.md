# Testing Strategy

This document defines the mandatory testing strategy for the SushiGo project. Every contributor and reviewer must follow these rules.

## Guiding Principles

1. **Cypress is expensive** — reserve it exclusively for critical happy-path flows.
2. **Push complexity down** — the harder something is to test at a high level, the lower in the pyramid it should live.
3. **Security is non-negotiable** — enforce it in backend Feature tests (Laravel PHPUnit), never rely on the frontend alone.
4. **Coverage is a merge gate** — SonarCloud enforces minimums before a PR can be merged.

---

## Testing Pyramid

```
         ┌──────────┐
         │ Cypress   │  E2E – happy path only
         │ (few)     │
        ─┼───────────┼─
        │  Vitest     │  Frontend integration + unit
        │  (moderate) │
       ─┼─────────────┼─
       │   PHPUnit     │  Backend Feature + Unit
       │   (many)      │
       └───────────────┘
```

### Layer 1 — PHPUnit (Backend)

| Scope | Test type | What to validate |
|---|---|---|
| **Feature (Integration)** | `tests/Feature/` | API endpoints, request/response contracts, authorization (roles & permissions), validation rules, business flows end-to-end through the HTTP layer |
| **Unit** | `tests/Unit/` | Actions, Services, Repositories, Model scopes, accessors/mutators, complex calculations, edge cases that are hard to reach via Feature tests. Use mocks/stubs when needed |

**Rules:**

- Every API endpoint MUST have at least one Feature test covering the happy path AND one test for unauthorized access (wrong role / no token).
- Validation rules (required fields, formats, uniqueness) MUST be tested in Feature tests.
- Complex business logic (e.g., lateness calculation, stock movement math) MUST have Unit tests with mocks where external dependencies exist.
- Cases that are difficult to reproduce at the Feature level (race conditions, specific date boundaries, exception handling) belong in Unit tests.

### Layer 2 — Vitest (Frontend)

| Scope | Priority | What to validate |
|---|---|---|
| **Route guards & config** | Required | Auth guards redirect unauthenticated users; role-based route protection works; public routes are accessible |
| **Error feedback to user** | Nice-to-have | Toast/alert messages on API errors; form validation messages display correctly; loading/error states render |
| **Component logic (hooks)** | Required when complex | Custom hooks with 3+ state variables or API mutations; derived state calculations; conditional logic |

**Rules:**

- Route security (guards, redirects, role checks) MUST be validated with Vitest — never rely solely on Cypress for this.
- Error feedback tests (toasts, inline validation, error boundaries) are a nice-to-have but encouraged for every form.
- Pure UI rendering tests (snapshot, visual) are optional and low priority.

### Layer 3 — Cypress (E2E)

| Scope | What to validate |
|---|---|
| **Happy path only** | The critical user journey for the delivered feature works end-to-end |

**Rules:**

- Each PR that delivers a user-facing feature MUST include at least one Cypress spec covering its happy path.
- **Do NOT test error cases, validation, or edge cases in Cypress** — those belong in PHPUnit (backend) or Vitest (frontend).
- **Do NOT test authorization/security in Cypress** — that belongs in PHPUnit Feature tests.
- Keep Cypress specs fast: one `db:reset` per spec file (in `before()`), not per test.
- Cypress specs MUST be idempotent — they must work with a fresh `db:reset` and not depend on state left by other specs.
- Avoid `cy.wait(ms)` unless absolutely necessary for DOM stability (document the reason with an inline comment).
- **Cypress runs in CI.** The `Cypress E2E (Quality Gate)` workflow (`.github/workflows/cypress-e2e.yml`)
  boots the real E2E stack and runs the full suite headless on every PR that touches an
  application/runtime path. A failing spec fails the required `cypress-e2e` check — a written spec
  that was never executed is no longer an acceptable PR state. See "Cypress E2E in CI" below.

---

## Vitest Priority Clarification

### Error feedback — Recommended (not just nice-to-have)

Error toasts and inline validation messages are what the user sees when something fails. If an endpoint returns 422 and the frontend shows nothing, the user is lost. While error feedback tests do not block merge, **reviewers should flag missing error feedback tests in PRs that add forms or API interactions**.

### Hook tests — when "complex" means testable

The rule "required when complex" is tied to the Custom Hook Convention: **if a hook was extracted because a component had 3+ `useState` calls or API mutations, that hook requires tests**. This makes the threshold objective and consistent with the component convention.

---

## Local vs CI

**Locally, run only linters and the tests you delivered in your branch** (new/modified test
files) — not the full suite. **CI runs the full suite as the regression gate**, against its own
isolated database service, on every PR.

This split exists mainly for speed: the full suite takes longer than the tests you touched, and CI
already re-runs everything as the regression gate against its own isolated database on every PR —
running it again locally is duplicate work. Each dev-lab workspace already runs its own isolated
test database (`sushigo_ws_<letter>_test`, configured via `code/api/.env.testing` — see
`code/api/phpunit.xml`), introduced specifically to prevent the `SQLSTATE[40P01]` deadlocks a
shared test database caused (see #268, #84); keeping local runs scoped avoids masking a
misconfigured `.env.testing` behind an accidental full-suite pass.

| Where | What to run | Command |
|---|---|---|
| **Local (pre-PR), dev-lab** | Linters + delivered tests only | `php artisan test --filter=<TestClass>` · `npx vitest run <path>` |
| **CI (every PR)** | Full suite (regression gate) + Cypress E2E | `php artisan test` · `npx vitest run` · full Cypress suite headless (`cypress-e2e` workflow) |

Dev-lab workspaces load `DB_DATABASE` automatically from `code/api/.env.testing`, so the commands
above are safe to run as shown. **Outside dev-lab** (standalone Docker mode), `phpunit.xml` does
not hardcode `DB_DATABASE` — you MUST pass it explicitly (`DB_DATABASE=mydb_test php artisan
test --filter=...`, see `doc/TESTING.md`), otherwise the command would fall back to the dev
database and `RefreshDatabase` would wipe it. The suite now **refuses to start** in that case:
`Tests\Support\DatabaseIsolationGuard` aborts the run unless the resolved database is a dedicated
`*_test` database, and takes a PostgreSQL advisory lock so two processes cannot share one test
database silently. It also fails any test that leaks an unclosed transaction into the next one.
The full contract, the root-cause chain, and a deterministic reproduction command are in
[`test-database-isolation.md`](test-database-isolation.md).

**Rules:**

- Before opening a PR, run linters (Pint, ESLint, TypeScript) and only the test file(s) you added
  or modified — scoped with `--filter=<TestClass>` or `npx vitest run <path>`.
- Do **not** run the full local suite (`php artisan test` / `npx vitest run` with no scope) as a
  pre-PR step — that's CI's job. Running it anyway is unnecessary duplicate work, not a
  workaround for a shared-database risk: each dev-lab workspace already has its own isolated test
  database.
- If CI finds a regression, it MUST be fixed for real — no `skip`/`xfail`/`markTestSkipped` to make
  CI pass. Once fixed, add that test to the PR's local run list so it stays verified locally for
  the rest of the session.
- The full suite remains available locally as an optional CI-parity check (e.g. reproducing a CI
  failure) — it's just not the default pre-PR step.

---

## CI Test Timing Diagnostics

`API Tests (PHPUnit + Coverage)` (`.github/workflows/api-tests.yml`) publishes a **Top 20 slowest
tests** table plus aggregate timing to the GitHub Actions Job Summary whenever PHPUnit actually
runs — on `pull_request`/`push` this means `code/api/**` changed (per the job's path filter); a
manual `workflow_dispatch` run always runs it regardless of what changed. The summary is generated
from a `--log-junit=test-results.xml` report by `.github/scripts/test-timing/generate.js`, with
`if: always()` so a failed suite still surfaces timing data. The raw JUnit report is uploaded as the
`phpunit-junit-report` artifact (7-day retention) for deeper inspection.

**Reproducing a with-coverage vs without-coverage comparison** — to check how much of the runtime
is coverage/setup overhead rather than PHPUnit itself, dispatch the workflow manually with the
`skip_coverage` input:

```bash
gh workflow run api-tests.yml --repo pakodiazdev/sushigo --ref <branch> -f skip_coverage=true
```

This only changes behavior on a manual `workflow_dispatch` run — the normal `pull_request`/`push`
triggers always collect coverage exactly as before, so the PR validation contract (and the
SonarCloud Quality Gate that depends on it) is unaffected. A `skip_coverage=true` run also skips
the `api-sonar` job, since there is no coverage artifact for it to consume.

See [#477](https://github.com/pakodiazdev/sushigo/issues/477) — once closed it will be archived to
`doc/tasks/` per [`tasks.md`](../tasks.md) — for the measured bottleneck data this instrumentation
produced, and [#481](https://github.com/pakodiazdev/sushigo/issues/481) for the resulting
suite-parallelization proposal.

---

## Cypress E2E in CI

The `Cypress E2E (Quality Gate)` workflow (`.github/workflows/cypress-e2e.yml`) makes the Cypress
suite a real merge gate instead of a local/manual step. See
[#490](https://github.com/pakodiazdev/sushigo/issues/490).

**How it works:**

- **Path-gated.** A `changes` job (centralized `dorny/paths-filter`, same pattern as
  `api-tests.yml`) decides whether the expensive path runs. E2E-relevant paths are `code/api/**`,
  `code/webapp/**`, `docker-compose.yml`, `docker-compose.e2e.yml`, `docker/**`, and the workflow
  file itself. A documentation-only or otherwise unrelated PR skips the Docker-heavy job entirely.
- **Stable required check.** A separate always-running job named `cypress-e2e` mirrors the heavy
  job's result — `skipped` (nothing E2E-relevant changed) counts as a pass. This is the name to
  put in branch protection; requiring the heavy job's name directly would leave protection waiting
  on a check that never reports on unrelated PRs (the `api-tests` / `api-tests-gate` lesson, #486).
- **Reuses the existing E2E stack.** The heavy job boots `docker-compose.e2e.yml`'s `test_e2e`
  (Laravel + Apache + Vite) and `pgsql` (`mydb_e2e`), then runs the existing `cypress` service
  headless — no CI-only application stack. `code/api/.env` is synthesized from `.env.example` with
  CI overrides (`APP_ENV=local` so the `/v1/test` + `/v1/devtools/clock` routes register,
  `CLOCK_SIMULATION_ENABLED=true`, `LOG_CHANNEL=stderr` so a root-owned `storage/logs/laravel.log`
  from `init.sh` can't 500 every request that logs).
- **Sharded, fail-fast.** `cypress-e2e-run` is a matrix (6 shards); each shard boots its own stack
  and runs a file-index slice of the specs (`i % strategy.job-total`, same split as `_api-ci.yml`). `strategy.fail-fast: true` + the `cypress-fail-fast` plugin (CI-only, via
  `CYPRESS_FAIL_FAST_ENABLED`) mean the first failing test aborts its shard and cancels the rest —
  one red spec already blocks the merge. Local `make cypress-run` keeps running the whole suite
  (the plugin is off unless that env var is set).
- **Chromium, not Electron.** CI runs `cypress run --browser chrome` (bundled in
  `cypress/included`) — real Chromium, and the "not supported by electron" launch-flag warning
  goes away. Local runs still default to Electron.
- **No local HTTPS/Nginx layer.** CI talks to Docker-network service URLs directly:
  `http://test_e2e:5173` (frontend) and `http://test_e2e:80/api/v1` (API). `VITE_API_URL` for the
  E2E container is overridable via `E2E_VITE_API_URL` (local default keeps the
  `https://api.sushigo.e2e.local` value); `vite.config.ts` `allowedHosts` accepts `test_e2e` (and
  anything in `VITE_ALLOWED_HOSTS`). No dependency on `/etc/hosts`, local DNS, or trusted certs.
- **Readiness, not sleeps.** The job polls the real `/api/v1/health` endpoint and the Vite port
  before starting Cypress.
- **Failure evidence.** On failure each shard uploads Cypress screenshots plus `test_e2e` / `pgsql`
  logs and `docker compose ps` output as `*-shard-<n>` artifacts. The stack is always torn down
  (`if: always()`).
- **Slow-spec timing.** Each shard emits a per-test JUnit report (`mocha-junit-reporter` via
  `cypress-multi-reporters`, alongside `spec`); the `cypress-timing` job merges them into a
  "Top 20 slowest tests" table on the run's Job Summary, reusing
  `.github/scripts/test-timing/generate.js` (same tool as `_api-ci.yml`). For the Cypress run it
  sets `TEST_TIMING_LABEL=Cypress` + `TEST_TIMING_GROUP_BY_FILE=true`, so the summary is
  Cypress-labelled and adds a **slowest-spec-files** rollup — `parse.js` attributes each testcase
  to its `.cy.ts` via the nearest enclosing `<testsuite file=…>` when the testcase itself carries
  no `file` attribute (#559).

### Per-shard overhead reduction (#559)

Baseline was ~5.5–7 min for the slowest shard at 6 shards. Every shard boots its own stack, so
fixed overhead — the `docker/app/Dockerfile` `dev` image build, `init.sh`'s cold `composer
install` + `npm install` (×2), and `l5-swagger:generate` — is paid per shard and does not shrink
when shards are added. `_e2e-ci.yml` cuts it:

| Lever | Mechanism | Notes |
|---|---|---|
| `dev` image build | `docker/build-push-action` builds the `dev` target with a cross-run `type=gha` layer cache and `load`s it as `sushigo-test-e2e:dev`; `docker-compose.e2e.yml` now names that `image:`, so `docker compose up test_e2e` reuses it instead of rebuilding. | The `dev` target copies no app code, so the cache stays warm across code-only PRs. First push after a Dockerfile change rebuilds cold once. |
| `composer install` / API `npm install` | `actions/cache` on `code/api/{vendor,node_modules}` (bind-mounted in); `init.sh` skips installing a dir that already exists. | Exact combined-lock cache key, no `restore-keys` — a lockfile change reinstalls cold rather than running stale. |
| webapp `npm install` (init.sh **and** the `cypress` container) | Same cache entry also carries `code/webapp/node_modules`; on a miss it is primed once with `npm ci` on the runner. The container call is now `npm install --prefer-offline`. | |
| `l5-swagger:generate` | `init.sh` skips it when `ENV=e2e` (the `test_e2e` service sets it). Cypress never reads the Swagger docs. | dev-lab / standalone `init.sh` (`ENV` unset) is unchanged. |

**Measured (warm cache, full suite on a representative PR):** per-shard fixed overhead dropped
from ~150–190s to ~105s (deps cache restore ~5s; runner `npm ci` skipped on a hit; `init.sh`
API-health wait ~30s vs ~65s; `dev` image ~40s vs ~65s). Slowest shard: **~5.5–6 min**, down
from the ~5.5–7 min baseline and much tighter at the low end.

**Runner-minute trade-off (AC of #559):** the overhead cuts trade a little *added* warm-cache
work (cache restore, one `docker buildx` layer import, a `type=gha` export) for a large hot-path
reduction — the removed installs/build were pure compute, so total runner-minutes fall with the
wall-clock. The one regression is the **first** run after a Dockerfile or lockfile change, which
pays a cold rebuild plus a cache export.

**Avenue 5 (more shards) — measured and rejected.** With fixed overhead gone, Cypress
*execution* is the bottleneck, but the file-index split (`sort` order, not duration) is uneven:
at 6 shards the warm slowest/fastest were ~6m / ~5.5m; going to 8 shards only made the *fast*
shards faster (~4m) and moved the *slowest* shard by ~1s, for +33% runners. Shard count is not
the lever — **duration-aware shard balancing** (feed the per-shard JUnit timings, already
uploaded as `cypress-junit-shard-*`, back into the `plan` job's split) is the follow-up worth
the last ~1 min.

**Local `make cypress-run`:** unaffected at runtime, but after editing `docker/app/Dockerfile`
run `docker compose -f docker-compose.yml -f docker-compose.e2e.yml build test_e2e` once — with
an explicit `image:` set, `up` alone will not notice the Dockerfile changed.

### Quarantined specs

The suite has never been fully green — even locally, ~16 specs fail on a clean `make cypress-run`
(pre-existing overlay/scroll/selector/seed fragility; see
`doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17), plus ~8 more that fail only
on the CI stack (Chromium vs Electron, fresh DB). To land the gate green on the stable subset,
those specs carry a `before(function () { this.skip() })` guard at the top of the file, each linked
to a maintenance issue (#535–#558). **When you fix a quarantined spec, remove its guard in the same
PR and confirm `cypress-e2e` stays green with it re-included.** Do not add new `this.skip()` guards
without an accompanying issue.

**Local `make cypress-run` is otherwise unchanged** — it still uses the HTTPS/local-domain
defaults and Electron; only the shared quarantine guards affect it.

---

## Test Data Management

Full convention: [`test-data-seeders.md`](./test-data-seeders.md)

### Seeder categories (summary)

| Category | Namespace | Data | Speed | Used in |
|---|---|---|---|---|
| **Testing** | `Testing/` | Concrete, deterministic, bulk inserts | ~1-3s | Cypress, PHPUnit, CI |
| **Fakes** | `Fakes/` | Factories for volume (N records) | Variable | Dev + Testing on demand |
| **Development** | `Development/` | Full experience (Actions + factories + scenarios) | ~15-30s | Local dev only |

### Cypress data strategy

- Use `cy.task('test:reset')` (truncate + seed) — **~2-3s**. Call **once per spec file** in `before()`, never in `beforeEach()`.
- Pass seeder groups: `cy.task('test:reset', 'attendance')` to seed only what the spec needs.
- `db:reset` (`migrate:fresh --seed`) is available as fallback when schema changes require it.
- Specs must NOT depend on data created by other specs (isolation).
- Testing seeders use **concrete hardcoded data** — no fakes, no factories, no randomness.
- When a spec needs volume data (e.g., pagination), combine Testing + Fakes: `cy.task('test:reset', 'attendance,fakes-employees')`.

## Test Environment Services

Full convention: [`test-environment-services.md`](./test-environment-services.md)

**Principle:** Tests must not depend on infrastructure services (Mailhog, Redis, S3) that are not the system under test.

**Strategy:** Use environment-aware dependency injection to replace external services with deterministic in-process alternatives in testing/dev environments.

| External Service | Test Replacement |
|---|---|
| Email (Mailhog) → password reset link | `FileTokenRecorder` + test-only API endpoint |
| Queue (Redis) | `QUEUE_CONNECTION=sync` |
| File Storage (S3) | Local disk adapter |
| External APIs | Fake/stub clients |

Test-only API endpoints (`/test/*`) are guarded by environment check and never exposed in production.

---

## Coverage Requirements

### Merge Gate (enforced by SonarCloud)

| Metric | Minimum | Scope |
|---|---|---|
| **Line coverage — Backend** | 80% | New code in the PR (`code/api/`) |
| **Line coverage — Frontend** | 80% | New code in the PR (`code/webapp/`) |

- SonarCloud runs automatically on every PR via GitHub Actions.
- A PR **cannot be merged** if coverage on new lines falls below the threshold.
- Legacy code is exempt from the gate, but contributors are encouraged to improve coverage when touching existing files.

### How to check locally

```bash
# Backend coverage
docker exec -it dev_container bash -c "cd /app/code/api && php artisan test --coverage"

# Frontend coverage
docker exec -it dev_container bash -c "cd /app/code/webapp && npx vitest run --coverage"
```

---

## PR Testing Checklist

Every PR that modifies application code MUST satisfy:

- [ ] **Backend Feature tests** — happy path + authorization for every new/changed endpoint
- [ ] **Backend Unit tests** — complex logic, edge cases, hard-to-reach scenarios
- [ ] **Frontend Vitest tests** — route guards/config; error feedback (nice-to-have)
- [ ] **Cypress happy path** — at least one E2E spec for the delivered feature
- [ ] **Local pre-PR check** — linters pass and the delivered tests pass locally, scoped with `--filter=<TestClass>` / `npx vitest run <path>` (see "Local vs CI" above — the full suite is CI's job, not a local step)
- [ ] **Coverage gate** — SonarCloud reports >= 80% line coverage on new code (backend and frontend)
- [ ] **CI regressions fixed for real** — if CI finds a broken test, it's fixed with no skip/xfail and added to the PR's local run list going forward

---

## Summary Table

| What to test | Where | Priority |
|---|---|---|
| API happy path (request → response) | PHPUnit Feature | Required |
| Authorization (roles, permissions, token) | PHPUnit Feature | Required |
| Input validation (required, format, unique) | PHPUnit Feature | Required |
| Complex business logic / calculations | PHPUnit Unit | Required |
| Edge cases hard to reach via HTTP | PHPUnit Unit (with mocks) | Required |
| Route guards & redirect config | Vitest | Required |
| Error feedback (toasts, form errors) | Vitest | Nice-to-have |
| Custom hook logic | Vitest | Required when complex |
| User-facing happy path (full flow) | Cypress | Required (1 per feature) |
| Error/validation scenarios in UI | Cypress | **Prohibited** — use Vitest/PHPUnit |
| Security/auth scenarios in UI | Cypress | **Prohibited** — use PHPUnit Feature |
