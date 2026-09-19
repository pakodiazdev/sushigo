# Deployment — environments, build targets, and promotion

This is the operational reference for [TD-07](../../decisions/td-07-environment-release-promotion-contract.md),
the environment and release-promotion contract. Read that decision record for the *why*; this doc
is the *what*, kept current as the contract is implemented across Sprint 009.

This doc covers **deployment** (getting a release running in an environment). It is deliberately
separate from [`pipeline.md`](./pipeline.md), which covers **PR validation** (`ci-gate`) — per that
doc's own "What stays independent" section, `deploy-preview.yml` and its successors are operational
workflows, not part of the PR validation DAG.

---

## Environments

| | QA / Preview | Demo | Production |
|---|---|---|---|
| GCP project | `sushigo-app` | `sushigo-demo` | `sushigo-prod` |
| Cloud Run service | `sushigo-preview` | `sushigo-demo` | `sushigo-prod` |
| Domain | `preview.sushigo-romita.com` | `demo.sushigo-romita.com` | `admin.sushigo-romita.com` |
| GitHub Environment | `qa` | `demo` | `production` |
| **Trigger** | **Manual** — `workflow_dispatch`, any branch | **Automatic** — on green `main` | **Automatic** — on green `main` |
| **Docker target** | `preview` (convenience) | `preview` (convenience) | `prod-cloudrun` (hardened, new — see below) |
| Trust boundary | Internal / CI only | Public, unauthenticated | Public, real users |
| Data policy | Non-production, disposable, reset freely | Synthetic, reset on a schedule | Real, persistent, backed up |
| Manual approval to deploy | N/A (already manual) | No | No (see TD-07 "Alternatives considered") |

QA is **not** part of the automated pipeline below — it is the existing `deploy-preview.yml` model
(a human picks a branch, triggers a build+deploy, tests it) kept as-is, used for pre-merge
validation. Demo and Production are two **independent** automated pipelines triggered by the same
event (green `main`) but building **different images** — see "Two build targets" below.

Each project has its own Secret Manager secrets and three distinct identities, none reused across
projects — nothing named below (database credentials, `APP_KEY`, OAuth keys, or any of these three
service accounts) is shared between environments:

1. **Deploy service account** (`gha-sushigo-<env>@sushigo-<env>.iam.gserviceaccount.com`,
   WIF-authenticated, mirroring the existing `gha-sushigo-preview@sushigo-app.iam.gserviceaccount.com`
   pattern) — triggers the deploy from CI. Does not pull the image and does not read secrets.
2. **Cloud Run service agent** (Google-managed, `service-<project-number>@serverless-robot-prod.iam.gserviceaccount.com`)
   — pulls the image at runtime (see "Release identity" below). Does not read secrets either.
3. **Cloud Run runtime service account** — a dedicated per-environment identity (not the Compute
   Engine default service account) that the Cloud Run *service itself* runs as, granted
   `roles/secretmanager.secretAccessor` on only that environment's own secrets (database
   credentials, `APP_KEY`, OAuth keys). This is the identity Cloud Run actually uses to resolve
   mounted/env-injected Secret Manager values at request time — distinct from both accounts above,
   and easy to omit by only provisioning the deploy account and the registry-read grant, which
   leaves the new revision able to pull its image but unable to resolve any of its own secrets.

**QA's "Internal / CI only" trust boundary is a target the current deployment does not yet
enforce.** `deploy-preview.yml` deploys `sushigo-preview` with `--allow-unauthenticated`, so QA is
publicly reachable today, the same as Demo. Redesignating `sushigo-app`/`sushigo-preview` as QA
(the implementing issue for #634) must also switch its Cloud Run ingress to authenticated-only
(drop `--allow-unauthenticated`, restrict invocation to the CI service account and any human
testers via IAM) — otherwise the environment table above overstates QA's actual isolation.

## Two Docker build targets: a new hardened `prod-cloudrun` vs. `preview` (convenience)

Demo (and QA, for manual testing) need a convenience login — a one-click "pick a demo user, no
password" index and/or a single global password — building on the existing `devdebug` mechanism:

- `code/api/routes/api.php:14` — `if (app()->environment('testing', 'local', 'dev', 'devtest'))`
  gates the route registration for `v1/dev/users` and `v1/dev/login`.
- `app/Http/Controllers/Api/V1/Dev/DevLoginController.php` and `app/Support/DevLoginGuard.php` —
  the guard reads a config flag and **hard-fails if `"production"` is ever in its allowed-environments
  list**, a real safety net already in place.

Today this code ships in **every** environment's image: the existing `prod` Dockerfile stage does
one blanket `COPY ./code/api /var/www/html/api` (no exclusions), and `preview` (`FROM prod AS
preview`) doesn't re-copy the API at all — it's bit-identical backend code to `prod`. Only the two
runtime layers above keep it unreachable in Production.

**The existing `prod` stage cannot become Production's Cloud Run image as-is — it isn't
Cloud-Run-deployable at all.** `prod` is API-only: Apache on port 80, no webapp build, no unified
SPA+API vhost, no Cloud Run entrypoint. That's intentional — it backs `docker-compose.prod.yml`'s
standalone-Docker-mode split, where a separate frontend container serves the webapp. Only `preview`
(`COPY --from=node_builder` for the webapp build, the unified Apache vhost, the Cloud Run
entrypoint/`CMD`) assembles the single container Cloud Run actually needs. Excluding devdebug code
from bare `prod` would produce an image that fails Cloud Run startup and can't serve the admin SPA.

**This contract therefore adds a new Docker stage, `prod-cloudrun`** — built the same way `preview`
is (same webapp copy, same unified vhost, same entrypoint) but excluding the devdebug/demo-login
code entirely, so Production's binary does not contain it at all — not merely have it disabled.
`prod` (existing) and its standalone-mode usage are untouched.

To make this a clean per-path exclusion rather than an all-or-nothing `COPY`:

1. Extract the inline dev-route block (`api.php` lines 13-48) into its own file (e.g.
   `routes/api/dev.php`). **Unlike every other route group's unconditional `require
   __DIR__.'/api/*.php'` (lines 52-68), this one's include must stay conditional** — the same
   `environment()` check the block already has, plus a `file_exists()` guard:
   ```php
   if (app()->environment('testing', 'local', 'dev', 'devtest') && file_exists(__DIR__.'/api/dev.php')) {
       require __DIR__.'/api/dev.php';
   }
   ```
   Without `file_exists()`, `prod-cloudrun`'s build (which physically removes the file) makes
   `api.php` fatal on a missing `require` the moment `php artisan route:cache` runs at container
   startup — an unconditional require, copying the pattern used for every other route file, would
   take Production down entirely rather than just omitting the routes.
2. `app/Http/Controllers/Api/V1/Dev/` and `app/Support/DevLoginGuard.php` are already isolated by
   path.
3. `prod-cloudrun`'s Docker build excludes those specific paths (the extracted route file, the
   `Dev/` controller directory, and the guard) from what it copies; `preview` continues to include
   them.
4. **The frontend build must be excluded the same way, not just the backend.** Both targets
   currently share one `node_builder` webapp build stage. If that stays shared, Demo's one-click/
   global-password login UI either ships inside Production's bundle too, or gets built out of Demo
   as well — either breaks the point of this split. The frontend already has a build-time flag for
   this (`VITE_LOGIN_WITH_DEVDEBUG`, read via `import.meta.env` — see
   `code/webapp/src/components/dev/`): give `prod-cloudrun` and `preview` **two separate
   `node_builder`-equivalent stages**, one per target, each setting that flag accordingly, instead
   of one shared webapp build feeding both.

`prod-cloudrun` and `preview` are therefore two genuinely different Cloud-Run-ready images from the
same source commit — backend and frontend both — not "the same image, different runtime config."
Registry layout (both land in `sushigo-app`'s Artifact Registry, the shared source of truth QA
already uses today):

| Image | Built from | Used by |
|---|---|---|
| `sushigo-api-prod` | `main`, `prod-cloudrun` target | Production only |
| `sushigo-api-preview` | any ref, `preview` target | QA (manual, any tag) **and** Demo (automatic, `release-<sha>` tag on `main`) |

## QA: manual, decoupled from the automated pipeline

Unchanged in shape from today's `deploy-preview.yml`: a human triggers a build+deploy of the
`preview` target from a chosen branch via `workflow_dispatch`, Cloud Run serves it at
`preview.sushigo-romita.com`, they test it. Because each deploy is an explicit human choice of ref
rather than an automated promotion of "the highest commit," **none of the ancestry/watermark
machinery below applies to QA** — there's no concept of a stale QA deploy overwriting a newer one
when a human explicitly picked what to deploy.

QA keeps its own `concurrency` group (`cancel-in-progress: false`, the existing pattern) purely so
two manually-triggered deploys can't clobber each other mid-flight. **That existing group is scoped
per `service_suffix`** (`preview-deploy-${{ github.repository }}-${{ inputs.service_suffix ||
'default' }}`), which is correct for the *deploy* step — two testers deploying different branches
under different suffixes get different Cloud Run services and never collide. It is **not**
sufficient for the *migration* step this contract adds: all QA-suffixed services share the same
underlying database (see `docker-compose.preview.yml`'s fixed `POSTGRES_PREVIEW_DB`), so two
concurrent dispatches with different suffixes would still run `php artisan migrate` against that
one database at the same time. QA's migration step therefore needs its **own**, database-scoped
concurrency group independent of `service_suffix` (e.g. `qa-migrate-${{ github.repository }}`) —
the deploy step's per-suffix group and the migration step's database-wide group are two different
locks, not one.

**Implemented (#634):** `deploy-preview.yml` now runs four jobs — `build`, `migrate`, `deploy`,
`smoke`. `migrate` runs `php artisan migrate --force` directly on the GitHub Actions runner (not a
Cloud Run Job): QA's database is Supabase, a managed Postgres reachable over the public internet —
see `doc/architecture/infrastructure/infrastructure.en.md` §2/§6 — so no Cloud SQL Auth Proxy or VPC
connector is needed, and the migration doesn't need the freshly-built image at all, just the
checked-out ref and Composer dependencies. `migrate` carries the `qa-migrate-${{
github.repository }}` job-level concurrency group described above, independent of `deploy`'s
per-suffix group; `deploy` (`needs: [build, migrate]`) only proceeds once migration has completed,
satisfying "migration runs before the new revision is exercised" without serializing the build
itself. New configuration this requires is scoped to the **`qa` GitHub Environment** (Settings →
Environments → `qa` — created for #634, no required reviewers, no branch restriction, since QA
deploys from any branch by design): vars `SMOKE_TEST_EMAIL`; and secrets `DB_HOST`, `DB_DATABASE`,
`DB_USERNAME`, `DB_PASSWORD`, `APP_KEY`, `SMOKE_TEST_PASSWORD`, `SEEDER_ADMIN_PASSWORD`,
`SEEDER_EMPLOYEE_PASSWORD`, `SEEDER_INVENTORY_PASSWORD` (see "Seeding" below for the last three).
Only `migrate` and `smoke` declare `environment: qa` — `build` uses purely pre-existing,
already-shared repo-level vars (`GCP_PROJECT_ID`, `AR_LOCATION`, `AR_REPO`, `IMAGE_NAME_PREVIEW`,
`API_URL_PREVIEW`), none of which are QA-exclusive (`sushigo-api-preview` is built once and used
by both QA and Demo, per the registry table above); `deploy` doesn't declare it either — see
below, it doesn't touch any GitHub secret at all. When Demo/Production (#635/#636) get their own
`demo`/`production` GitHub Environments, they can reuse these same secret/var *names* scoped
independently — no prefix needed, each environment supplies its own values.

**Deploy now explicitly binds the existing Secret Manager secrets (discovered testing #634 for
real, 2026-09-18/19):** `gcloud run deploy` originally passed nothing beyond `--image`/`--region`,
relying on Cloud Run inheriting the previous revision's configuration — a real deploy attempt
against a fresh `service_suffix` exposed why that's not enough: a brand-new Cloud Run service has
**no** previous revision to inherit from, so it boots with no DB connection and no OAuth keys.
`preview/entrypoint.sh`'s `copy_secret_file` (waiting for `/run/secrets/oauth_{private,public}/
value.key`) retries 5 times, fails, and the container never reaches `apache2-foreground` —
reported by Cloud Run as "container failed to start and listen on the port." Separately, even the
*existing* default service's inherited `DB_HOST` turned out to be pointing at a Supabase project
that no longer resolved, which the post-deploy health check caught immediately (`/api/v1/health`
returning a database connection error) rather than silently serving against the wrong database.

**First attempt at the fix was wrong, corrected empirically:** passing `DB_HOST`/`DB_PASSWORD`/etc.
as plain literals via `--env-vars-file` failed with `Cannot update environment variable [DB_HOST]
to string literal because it has already been set with a different type` — `gcloud run services
describe sushigo-preview --format=yaml` confirmed these were already bound as Secret Manager
references (`PREVIEW_APP_KEY`, `PREVIEW_DB_HOST`, `PREVIEW_DB_DATABASE`, `PREVIEW_DB_USER`,
`PREVIEW_DB_PASS`), and Cloud Run refuses to flip an existing variable's type without first
clearing it. `deploy` now passes, on every dispatch regardless of suffix:
- `--set-env-vars "DB_CONNECTION=pgsql"` — the one plain literal, matching what the service
  already had (Laravel's own `DB_CONNECTION` default is `sqlite`, not `pgsql`, so this must stay
  explicit).
- `--set-secrets` referencing the exact same secret **names** already on the service:
  `APP_KEY=PREVIEW_APP_KEY:latest`, `DB_HOST=PREVIEW_DB_HOST:latest`,
  `DB_DATABASE=PREVIEW_DB_DATABASE:latest`, `DB_USERNAME=PREVIEW_DB_USER:latest`,
  `DB_PASSWORD=PREVIEW_DB_PASS:latest`, plus the OAuth pair at the exact paths `entrypoint.sh`
  expects (`/run/secrets/oauth_{private,public}/value.key=PREVIEW_OAUTH_{PRIVATE,PUBLIC}:latest`).
  The deploying identity (`gha-sushigo-preview@sushigo-app.iam.gserviceaccount.com`) needs
  `roles/secretmanager.secretAccessor` on all five `PREVIEW_*` secrets for this to succeed.

**Known duplication, not yet unified:** the `qa` GitHub Environment's `DB_HOST`/`DB_DATABASE`/
`DB_USERNAME`/`DB_PASSWORD`/`APP_KEY` (used by `migrate`, which runs on the bare GitHub Actions
runner and needs literal values in a `.env` file) and these `PREVIEW_*` GCP Secret Manager secrets
(used by `deploy`, which needs secret *references*, not values) hold the **same real credentials**
in two different stores that must be kept in sync by hand — updating the Supabase password in one
without the other reintroduces exactly the "migrate and the deployed app talk to different
databases" bug this fix closes. A future unification (e.g. `migrate` also authenticating to GCP
and reading these same `PREVIEW_*` secrets via `gcloud secrets versions access`, instead of
maintaining a separate GitHub-side copy) would remove this duplication — not done here, scoped as
a follow-up rather than expanding #634 further.

### Seeding — deliberate, explicit exception to "never automatic" (#634 follow-up)

Below, and in [TD-07](../../decisions/td-07-environment-release-promotion-contract.md)'s own
"Migration ownership" section, `db:seed --force` is described as something that "must never run
automatically... including QA." **For QA specifically, this project's owner explicitly overrode
that** during #634's PR review, after this was implemented and before merge — this is a deliberate,
informed correction, not an oversight or a silent drift from the original decision.

**Why:** this was QA/Preview's first deploy through the new `migrate` job, and the database needed
its base data (roles, permissions, Passport OAuth clients, the default admin user, branch/
operating-unit/cash-register setup) bootstrapped before it could be used at all — a one-time manual
seed would have worked too, but the owner preferred the workflow do it automatically going forward
rather than relying on a human remembering to run it by hand after every fresh QA database.

**Why this is safe despite `--force`:** `--force` bypasses this codebase's own `TrackableSeeder`
run-once/lock tracking (`code/api/database/seeders/Traits/TrackableSeeder.php` — it checks
`in_array('--force', $_SERVER['argv'])` and skips the "already ran" guard entirely when present).
That would normally make repeated `--force` runs risky. Verified before implementing: every seeder
in `Production\ProductionSeeder`'s chain — `PassportClientSeeder`, `RoleSeeder`, `PermissionSeeder`,
`BranchSeeder`, `OperatingUnitSeeder`, `UserSeeder`, `InventoryLocationSeeder`,
`CashTerminalSeeder`, `BankAccountSeeder`, `CashRegisterSeeder`, `UnitOfMeasureSeeder`,
`UomConversionSeeder`, the punctuality/overtime/holiday seeders — guards itself internally
(`updateOrCreate`, `firstOrCreate`, or an explicit `exists()` check before inserting), independent
of `TrackableSeeder`'s own tracking. So running it on every deploy does not duplicate data even
though the run-once lock itself is bypassed.

**How:** the `migrate` job's "Seed QA base data" step runs
`php artisan db:seed --class="Database\Seeders\Production\ProductionSeeder" --force` directly by
class name — **not** the environment-routed `php artisan db:seed` — because `preview` (QA's
`APP_ENV`) is not one of the keys in `code/api/config/seeders.php`'s `environments` map (only
`production`, `local`, `development`, `dev`, `devtest`, `testing` are). Targeting the class directly
means no API code change was needed to make this work.

**`SEEDER_ADMIN_PASSWORD`/`SEEDER_EMPLOYEE_PASSWORD`/`SEEDER_INVENTORY_PASSWORD`** are the same three
env vars `config/seeders.php:15-18` already reads (with hardcoded fallbacks `admin123456` /
`employee123456` / `inventory123456`) — passed in via the step's `env:` block so the first real
seeding run creates `admin@sushigo.com` / `manager@sushigo.com` / `inventory@sushigo.com` with a
real chosen password instead of silently falling back to the hardcoded default.

**Scope of this exception:** QA only. Demo and Production (#635/#636) are unaffected — they still
follow TD-07's rule as written; nothing about this change loosens seeding discipline for either of
those.

### Migration lock duration — decision (#634)

TD-07 deliberately left this open: should the migration lock be held through a suffix's *entire*
manual-validation window (blocking a second suffix's migration mid-test), or should each suffix get
its own isolated/resettable database instead?

**Decision: the lock is held only for the `migrate` job itself — not through manual validation.**
Rationale:

- QA/Preview data is explicitly disposable per this doc's own environment table — a second
  suffix's migration landing mid-test degrades that test, it doesn't corrupt anything that matters
  long-term.
- Nothing in this pipeline can signal "a human is done testing" to release a longer-held lock
  without adding new infrastructure (e.g. a separate "release lock" `workflow_dispatch`, or a lock
  with an unbounded/human-driven timeout) — holding a CI-managed lock open across an
  open-ended manual step has no natural end condition today.
- Per-suffix isolated/resettable databases is the materially larger option — new infrastructure
  per suffix, not a workflow change — and is better scoped as its own follow-up if the trade-off
  below actually causes friction in practice, rather than folded into this issue's budget.

**Known trade-off, accepted:** a second, differently-suffixed QA deploy can still run its migration
against the shared database while an earlier suffix's deployment is still being manually validated,
silently changing the schema underneath that in-progress test. If this becomes a recurring problem,
revisit with per-suffix isolated/resettable databases — the concurrency group added here does not
preclude that later change, it only prevents two migrations from running *simultaneously*.

## Production and Demo: independent parallel automated pipelines

```
green main (ci-gate)
  ├─ build + push sushigo-api-prod:release-<sha>     (once, prod-cloudrun target) → deploy Production
  └─ build + push sushigo-api-preview:release-<sha>  (once, preview target) → deploy Demo
```

Both trigger off the identical event and are otherwise fully independent — different image,
different Cloud Run service, different GCP project, own concurrency group, own ancestry watermark,
own health check, own rollback. Neither depends on the other's outcome; there is no shared "QA
validates the digest that then promotes to both" step.

### Release identity: build once, resolve the digest once

```bash
# In the build job, right after the push — resolve once and expose as a job output:
DIGEST=$(gcloud artifacts docker images describe \
  "${AR_LOCATION}-docker.pkg.dev/sushigo-app/${AR_REPO}/${IMAGE_NAME}:release-${SHA}" \
  --format='value(image_summary.digest)')

# The deploy job consumes that same passed-through value — it does not re-resolve the tag itself.
# --no-traffic is mandatory: the new revision must pass its health check (below) before it
# receives any traffic. --service-account binds the dedicated runtime identity (see "Environments"
# above) — omitting it silently falls back to the Compute Engine default service account, which
# has none of the Secret Manager grants this contract requires. Granting that account
# secretmanager.secretAccessor does NOT, by itself, put any secret in front of the container: each
# secret still needs an explicit --set-secrets (or --set-env-vars for non-secret config) mapping on
# the deploy call, or the revision has nothing to read even with a correctly-authorized identity.
# The existing preview/entrypoint.sh (docker/app/config/preview/entrypoint.sh:4-31) exits if the
# OAuth keys aren't present at /run/secrets/oauth_{private,public}/value.key, so those two Secret
# Manager entries specifically must be mounted at those exact paths, not just injected as env vars.
gcloud run deploy <service> \
  --image "${AR_LOCATION}-docker.pkg.dev/sushigo-app/${AR_REPO}/${IMAGE_NAME}@${DIGEST}" \
  --project <env-project> --region "${GCP_REGION}" \
  --service-account "<runtime-sa-email>" \
  --set-secrets "DB_PASSWORD=<env>-db-password:latest,APP_KEY=<env>-app-key:latest" \
  --update-secrets "/run/secrets/oauth_private/value.key=<env>-oauth-private:latest,/run/secrets/oauth_public/value.key=<env>-oauth-public:latest" \
  --set-env-vars "DB_HOST=...,DB_DATABASE=...,DB_USERNAME=...,APP_URL=...,APP_ENV=<env>" \
  --no-traffic --tag candidate

# Only after the candidate revision's health check passes. --to-tags (not --to-revisions) is
# required here: --tag candidate above assigned a traffic TAG to the new revision, not a revision
# named "candidate" — gcloud run services update-traffic --to-revisions=candidate=100 would look
# for a revision literally named "candidate", find none, and leave the release at zero traffic.
gcloud run services update-traffic <service> --to-tags=candidate=100 \
  --project <env-project> --region "${GCP_REGION}"
```

The **deploy service account** also needs `roles/iam.serviceAccountUser` on the **runtime service
account** — Cloud Run requires the deploying identity to have explicit permission to launch a
service running as another account ("actAs"), separate from the `secretmanager.secretAccessor`
grant the runtime account itself needs.

Re-resolving the tag independently, later in the pipeline, would reopen the exact drift this
contract exists to close: a mutable tag can be overwritten (a re-run after a partial failure, for
instance), so a deploy step that resolves it itself could silently receive a different image than
the one actually built for this release.

**The pulling identity is Cloud Run's own per-project service agent, not the deploy service
account.** Cloud Run fetches the image at deploy time as
`service-<project-number>@serverless-robot-prod.iam.gserviceaccount.com` — that identity, for
Demo's and Production's projects, needs `roles/artifactregistry.reader` granted on `sushigo-app`'s
specific repository (not project-wide). Granting the role to the GitHub Actions deploy service
account instead does not authorize the pull and leaves the deploy failing at runtime.

Neither image carries environment-specific configuration at build time — the frontend's `API_URL`
build arg is the relative `/api/v1` path (same-origin in the unified container) for both
`prod-cloudrun` and `preview`. All environment differences are runtime: Cloud Run revision env vars and each project's
own Secret Manager, applied at deploy time. The only thing that varies *between* Production and
Demo at build time is which target compiled the image (see "Two build targets" above), not any
per-environment flag baked into either.

### Post-deploy health check

Use `/api/v1/health` (already implemented in `code/api/routes/api/health.php`), not `/api/up`,
which is Laravel's bare framework liveness route and checks nothing environment-specific at all.
Be precise about what `/api/v1/health` actually covers today, though: it only opens the database
connection and returns 503 on failure — it does **not** validate `APP_KEY`, `APP_URL`, or that the
OAuth key files are present and readable, so a revision with a broken `APP_KEY` or missing OAuth
key can still pass it and receive traffic while login/session behavior is silently broken. The
implementing issue must extend the health check (or add a second candidate-revision check) to
cover those settings; `/api/v1/health` alone catches a bad database credential, not every
environment-specific misconfiguration.

### Anti-rollback guards — mandatory, per environment's own lineage

Two `main` commits landing close together can trigger overlapping pipeline runs for the *same*
environment; without a guard, the older commit's slower chain can finish deploying *after* the
newer one — silently reverting that environment to a stale release with no rollback ever requested.
Two mechanisms are both **mandatory**, and both cover the **entire chain — migration step included,
not just the deploy step** (see "Migrations" below: running the migration step outside this guard
lets two overlapping runs race DDL against the same database before either guarded deploy starts):

1. **Each environment's full chain (migration + deploy) runs in its own `concurrency` group**
   (`cancel-in-progress: false`, the same pattern `deploy-preview.yml` already uses), so two runs
   against the same environment never execute simultaneously.
2. **The chain must reject promoting a commit that is not a descendant of a persisted
   per-environment watermark** (the highest release commit ever promoted to *that* environment) —
   never compared against "whatever commit is currently serving traffic." A `concurrency` group
   only guarantees mutual exclusion, not ordering — [GitHub documents that run ordering inside a
   concurrency group is not guaranteed](https://docs.github.com/en/actions/using-jobs/using-concurrency) —
   so the ancestry check is what actually prevents a stale release from overwriting a newer one.
   Tracking the watermark separately from the currently-serving commit matters because a **manual
   rollback moves traffic backward without moving the watermark backward**: if Production rolls
   back from bad commit C to prior-good commit B, C is still a descendant of B, so a queued or
   retried promotion of C must still be rejected. Cancelling only C's own promotion is not enough,
   either — a later descendant D can already be in flight, having passed its ancestry check before
   the rollback happened. **A rollback must quiesce the environment's entire promotion queue** —
   suspend every queued and in-flight promotion, not just C's — and re-verify the ancestry/
   watermark check immediately before any subsequent traffic shift.

Demo and Production each keep their **own** watermark and their **own** queue — a stale run or a
rollback in one can never affect the other.

## Migrations

**Cloud Run currently runs no migrations at all, for any environment — this is a gap to close, not
a race to fix.** The `preview` Docker target's Cloud Run boot uses
`docker/app/config/preview/entrypoint.sh`, which only copies OAuth keys and runs Laravel's
cache/optimize commands; it contains no `php artisan migrate` and no `db:seed`.
`docker/app/config/prod/init.sh` — which does run `migrate --force` and `db:seed --force` on every
boot — belongs to a different target entirely: it's only mounted and invoked by
`docker-compose.prod.yml`, the standalone-Docker-mode compose file, not anything Cloud Run runs.
Treating `init.sh`'s pattern as "the current Cloud Run behavior" would be wrong; it is a *different*
mode's script that happens to demonstrate the exact race Demo's and Production's automated
pipelines must avoid introducing.

For **Demo and Production**: migrations must be a one-shot step per release, run before that
revision serves traffic — added as a new, independent step (a Cloud Run Job, or a pre-deploy CI
job), gated by the same concurrency+ancestry guard as the deploy step (see "Anti-rollback guards"
above), never folded into `preview/entrypoint.sh` or copied from `prod/init.sh` as-is, so
concurrent replica startups or overlapping releases can never race `php artisan migrate`.

For **QA**: migrations run at manual-deploy time, against whatever branch was requested, without
the ancestry guard (a human choosing to deploy an old branch to QA is not the hazard an automated
system silently reverting Production would be).

`db:seed --force` must never run automatically against Production, and must not run unattended
against Demo either — seeding stays an explicitly-invoked step for both. **QA is a deliberate,
documented exception to this rule as of #634's PR review** — see "Seeding" above for why and how;
Demo and Production are unaffected.

**Migrations in Demo's and Production's automated pipelines must be expand/contract-compatible with
the currently-running revision** — a destructive migration is not safe to run automatically. The
migration step runs while the *old* revision is still serving traffic (`--no-traffic` keeps it live
through the health check), so a migration that drops or renames a column the old revision still
queries breaks it immediately, and a later traffic rollback would not undo that (application and
database rollback are deliberately separate — see "Rollback" below). The repository already
contains migrations that would violate this today (e.g.
`2026_08_27_210000_drop_legacy_cost_and_price_columns_from_item_variants.php`); a release
containing one is not a candidate for Demo's/Production's automated pipeline as specified — it
needs a separately-planned maintenance procedure instead.

## Rollback

- **Application**: `gcloud run services update-traffic <service> --to-revisions=<prior>=100` —
  seconds, no rebuild, no data risk. A rollback must also **quiesce the environment's entire
  promotion queue** — suspend every queued and in-flight promotion, not only the specific commit
  being rolled back from, since a later descendant can already be in flight and past its ancestry
  check — and re-verify that check immediately before any subsequent traffic shift. Demo and
  Production each roll back independently; neither's rollback touches the other's queue.
- **Database**: a separate, explicit decision (`php artisan migrate:rollback` or a forward-fixing
  migration) — never automatic on an application rollback. See TD-07's "Rollback semantics" for the
  reasoning (additive-migration discipline means most app rollbacks need no schema change at all).

## Open items for the implementing issues

These are named here so the issues that build the actual workflows (out of scope for TD-07 itself)
have a concrete starting checklist:

- [x] Extract the inline dev-route block (`api.php` lines 13-48) into its own `routes/api/dev.php`
      — with a `file_exists()`-guarded conditional include, **not** the unconditional `require`
      pattern every other route group uses, so `prod-cloudrun`'s build (which removes the file)
      doesn't crash route caching at Production startup. *(#633)*
- [x] Add a new `prod-cloudrun` Dockerfile stage (built the same way `preview` is — webapp copy,
      unified vhost, Cloud Run entrypoint — do not retrofit the existing `prod` stage, which is
      API-only and not Cloud-Run-deployable) that excludes `routes/api/dev.php`,
      `app/Http/Controllers/Api/V1/Dev/`, and `app/Support/DevLoginGuard.php` from what it copies —
      `preview` keeps including them. Confirm the built image genuinely lacks the code (not just
      lacks it being reachable) before wiring this to Production's deploy workflow. *(#633)*
- [x] Give `prod-cloudrun` and `preview` **separate `node_builder` frontend build stages**, each
      setting `VITE_LOGIN_WITH_DEVDEBUG` accordingly — a shared webapp build ships Demo's login UI
      into Production's bundle (or drops it from Demo too), same hazard as the backend exclusion
      above, just on the frontend side. *(#633 — implemented as one parameterized `node_builder`
      stage built via two separate `docker build --target` invocations, each passing its own
      `VITE_LOGIN_WITH_DEVDEBUG` build-arg, rather than two duplicated stage definitions; same
      per-target build isolation the item requires, see the release-build workflow's own note.)*
- [x] Add `--set-secrets`/`--set-env-vars` mappings to QA's deploy command (#634, done for QA;
      Demo/Production still need their own when #635/#636 land) — DB credentials, `APP_KEY`, and
      the OAuth key pair at the exact `/run/secrets/oauth_{private,public}/value.key` paths
      `entrypoint.sh` expects. Discovered while testing #634 for real: without this, a brand-new
      `service_suffix` boots with no config at all and never starts, and even the existing default
      service's inherited config had silently drifted to a stale database. Granting the runtime
      account `secretmanager.secretAccessor` authorizes access, it does not bind any secret to the
      revision by itself — `--set-secrets` on the deploy call is what actually does the binding.
- [ ] Provision `sushigo-demo` and `sushigo-prod` GCP projects, their WIF providers, and deploy
      service accounts.
- [ ] Grant `sushigo-demo`'s and `sushigo-prod`'s **Cloud Run service agent**
      (`service-<project-number>@serverless-robot-prod.iam.gserviceaccount.com`, not the deploy
      service account) `roles/artifactregistry.reader` on `sushigo-app`'s Artifact Registry
      repository.
- [ ] Create a dedicated **Cloud Run runtime service account** per environment (not the Compute
      Engine default) and grant it `roles/secretmanager.secretAccessor` on only that environment's
      own secrets — distinct from the deploy service account and the Cloud Run service agent above,
      neither of which can read Secret Manager values on the service's behalf.
- [ ] Actually bind that runtime account to the service with `--service-account` on every
      `gcloud run deploy` call — creating and granting the account is not enough; an unbound service
      silently runs as the Compute Engine default account instead. Also grant the **deploy** service
      account `roles/iam.serviceAccountUser` on the **runtime** account (Cloud Run's "actAs"
      requirement), or every deploy fails with a permission error.
- [x] Create the `qa` GitHub Environment (#634) — no required reviewers, no branch restriction, per
      TD-07. `demo`/`production` still open — create those the same way when #635/#636 land.
- [ ] Point `demo.sushigo-romita.com` and `admin.sushigo-romita.com` at their respective Cloud Run
      services (domain mapping, same mechanism already used for `preview.sushigo-romita.com`).
- [x] Build the `sushigo-api-prod` and `sushigo-api-preview` build-and-push workflows (triggered on
      `main`, distinct from the existing manual `deploy-preview.yml`, which keeps driving QA) —
      `_release-build.yml`, called from `ci.yml`'s `release-build-preview` /
      `release-build-prod-cloudrun` jobs. *(#633)* The deploy-to-Demo / deploy-to-Production
      workflows that consume each build's digest are still open (#635/#636).
- [x] Resolve each release's digest exactly once, in its build job, and thread it through as a job
      output/artifact to that image's deploy job — do not let the deploy job re-resolve the tag.
      *(#633 — `_release-build.yml`'s `digest` output; #635/#636 still need to actually consume it.)*
- [ ] Give Demo's and Production's **full chains (migration + deploy)** their own `concurrency`
      group each (queued, not parallel) so two runs against the same environment never execute
      simultaneously — migration step included, not just deploy.
- [x] Give QA's new migration step its own database-scoped `concurrency` group, independent of
      `deploy-preview.yml`'s existing per-`service_suffix` group — every QA-suffixed service shares
      one database, so two differently-suffixed dispatches could otherwise race `php artisan
      migrate` against it even though their deploy steps don't collide. *(#634 —
      `qa-migrate-${{ github.repository }}`, job-level on the new `migrate` job.)*
- [x] **Open design question, not resolved by this contract — decided by the implementing issue:**
      a lock scoped to only the migration job (above) is released before that branch's manual
      testing finishes, so a second suffix's migration can still land on the shared QA database
      mid-test — see "Migration lock duration — decision (#634)" above for the decision (hold the
      lock only for the migration step, not through manual validation) and its accepted trade-off.
- [ ] Add a mandatory ancestry check, covering the same full chain, to both Demo's and Production's
      pipelines — each rejecting a commit that is not a descendant of its own persisted watermark,
      never compared against "whatever is currently serving traffic."
- [ ] Add a post-deploy health check using `/api/v1/health` (not `/api/up`) to Demo's and
      Production's deploy steps, run against the new revision before it receives traffic.
- [ ] Extend that check (or add a second one) to cover `APP_KEY`, `APP_URL`, and OAuth key
      readability — `/api/v1/health` alone only proves database connectivity.
- [ ] Add a CI check flagging destructive migration operations (dropped/renamed columns) on a PR,
      since Demo/Production promote automatically and a destructive migration is not
      expand/contract-safe for a revision still receiving traffic during its health check.
- [ ] Make Demo's and Production's rollback each quiesce their own entire promotion queue and
      re-verify the ancestry/watermark check immediately before any subsequent traffic shift.
- [ ] Switch `sushigo-preview`'s Cloud Run ingress to authenticated-only — it currently deploys with
      `--allow-unauthenticated`, which contradicts the "Internal / CI only" trust boundary this
      contract assigns to QA. **Not part of #634** — that issue's Technical Tasks/Acceptance
      Criteria scope it strictly to the migration step and smoke validation; ingress hardening
      remains a separate follow-up.
- [ ] Provision the actual values in the `qa` GitHub Environment `deploy-preview.yml`'s `migrate`
      and `smoke` jobs require (#634): secrets `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`,
      `DB_PASSWORD`, `APP_KEY`, `SMOKE_TEST_PASSWORD`, `SEEDER_ADMIN_PASSWORD`,
      `SEEDER_EMPLOYEE_PASSWORD`, `SEEDER_INVENTORY_PASSWORD`; vars `SMOKE_TEST_EMAIL` (and
      optionally `DB_PORT`, defaults to `5432`). The environment itself exists — its secrets/vars
      do not, yet. The migration step connects directly to QA's Supabase database from the GitHub
      Actions runner, and the smoke test needs a real QA user to log in as.
- [ ] Design and build the Demo one-click/global-password login UX (product feature, not
      infrastructure — likely its own Sprint 009 issue), gated to compile only into the `preview`
      target per "Two Docker build targets" above. **Three blockers found while implementing #633
      — this issue must fix all three, not just add the UX, or it will either silently regress
      prod-cloudrun's exclusion boundary or over-expose the public Demo backend:**
      1. `code/webapp/src/components/layout/Layout.tsx`'s `const devTools = import.meta.env.DEV ?
         <DevDebugger /> : null` gates the entire feature on Vite's own dev-server flag, which is
         always `false` for any `vite build` output — so `<DevDebugger />` (and everything it
         imports) is dead-code-eliminated from **every** production bundle today, `preview`
         included, regardless of `VITE_LOGIN_WITH_DEVDEBUG`/`VITE_APP_ENV`/
         `VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS` (#633 wires all three correctly into the `preview`
         target's build, verified empirically via `dist/assets/*.js`).
      2. **Simply fixing (1) is not sufficient — verified empirically, do not assume otherwise.**
         With Layout.tsx's gate bypassed and `VITE_LOGIN_WITH_DEVDEBUG=false` (prod-cloudrun's own
         value), the built bundle still contains `/dev/users` and `/dev/login` — `use-dev-debugger.ts`
         statically imports `listDevUsers`/`loginAs` from `dev-api.ts` as plain values (passed to
         `useQuery`'s `queryFn` and called from `handleDevLogin`), so the runtime-false flag
         prevents them from *firing* but not from being *bundled*: Rollup's tree-shaking can't prove
         a statically-imported, still-referenced export is unreachable just because a boolean
         happens to evaluate false at runtime. Fixing (1) naively (e.g. swapping `import.meta.env.DEV`
         for `isDevLoginEnabled()` in the same unconditional `<DevDebugger />` reference) would make
         `preview` work correctly but would also **reintroduce** this code into `prod-cloudrun`,
         regressing the exclusion #633 currently only achieves as a side effect of blocker (1) still
         being open. This issue needs a genuine build-time exclusion for `prod-cloudrun` specifically
         — e.g. a lazy/dynamic `import()` boundary gated on a statically-analyzable
         `VITE_LOGIN_WITH_DEVDEBUG` check, or excluding `src/components/dev/` from `prod-cloudrun`'s
         frontend build context the same way #633 excludes the backend's `Dev/` controllers — not a
         one-line conditional swap.
      3. **No current backend `APP_ENV` value enables dev-login alone — do not set the public
         Demo service's `APP_ENV` to `dev`/`devtest`/`testing`/`local` without first fixing this.**
         `routes/api/dev.php`'s single `environment()` check (`api.php`'s wrapping condition)
         bundles dev-login together with the `/v1/test/*` group (leaks password-reset links via
         `/v1/test/reset-link/{email}`) and the `/v1/devtools/*` clock/payroll-seed routes — all
         four register together or not at all. Separately, `SetTestTimeMiddleware`
         (`bootstrap/app.php`, registered globally for every request) accepts an `X-Test-Time`
         header and manipulates `Carbon::setTestNow()` for `devtest`/`testing`/`local`, entirely
         independent of the dev-login feature flag. #633's release-build workflow deliberately
         leaves `VITE_APP_ENV`/`VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS` at inert defaults for exactly
         this reason (an earlier version recommended `devtest`, which was wrong — corrected after
         review). This issue must split `routes/api/dev.php`'s guard so dev-login has its own,
         narrower environment gate before Demo can safely set any backend value that activates it.
