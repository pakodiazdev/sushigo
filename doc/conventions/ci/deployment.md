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
against Demo either — seeding stays an explicitly-invoked step everywhere, QA included.

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

- [ ] Extract the inline dev-route block (`api.php` lines 13-48) into its own `routes/api/dev.php`
      — with a `file_exists()`-guarded conditional include, **not** the unconditional `require`
      pattern every other route group uses, so `prod-cloudrun`'s build (which removes the file)
      doesn't crash route caching at Production startup.
- [ ] Add a new `prod-cloudrun` Dockerfile stage (built the same way `preview` is — webapp copy,
      unified vhost, Cloud Run entrypoint — do not retrofit the existing `prod` stage, which is
      API-only and not Cloud-Run-deployable) that excludes `routes/api/dev.php`,
      `app/Http/Controllers/Api/V1/Dev/`, and `app/Support/DevLoginGuard.php` from what it copies —
      `preview` keeps including them. Confirm the built image genuinely lacks the code (not just
      lacks it being reachable) before wiring this to Production's deploy workflow.
- [ ] Give `prod-cloudrun` and `preview` **separate `node_builder` frontend build stages**, each
      setting `VITE_LOGIN_WITH_DEVDEBUG` accordingly — a shared webapp build ships Demo's login UI
      into Production's bundle (or drops it from Demo too), same hazard as the backend exclusion
      above, just on the frontend side.
- [ ] Add `--set-secrets`/`--update-secrets`/`--set-env-vars` mappings to every environment's
      deploy command (DB credentials, `APP_KEY`, `APP_URL`, and the OAuth key pair at the exact
      `/run/secrets/oauth_{private,public}/value.key` paths `entrypoint.sh` expects) — granting the
      runtime account `secretmanager.secretAccessor` authorizes access, it does not bind any secret
      to the revision by itself.
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
- [ ] Create the `qa` / `demo` / `production` GitHub Environments with environment-scoped
      secrets/variables (no required reviewers on any of them, per TD-07).
- [ ] Point `demo.sushigo-romita.com` and `admin.sushigo-romita.com` at their respective Cloud Run
      services (domain mapping, same mechanism already used for `preview.sushigo-romita.com`).
- [ ] Build the `sushigo-api-prod` and `sushigo-api-preview` build-and-push workflows (triggered on
      `main`, distinct from the existing manual `deploy-preview.yml`, which keeps driving QA) and
      the deploy-to-Demo / deploy-to-Production workflows.
- [ ] Resolve each release's digest exactly once, in its build job, and thread it through as a job
      output/artifact to that image's deploy job — do not let the deploy job re-resolve the tag.
- [ ] Give Demo's and Production's **full chains (migration + deploy)** their own `concurrency`
      group each (queued, not parallel) so two runs against the same environment never execute
      simultaneously — migration step included, not just deploy.
- [ ] Give QA's new migration step its own database-scoped `concurrency` group, independent of
      `deploy-preview.yml`'s existing per-`service_suffix` group — every QA-suffixed service shares
      one database, so two differently-suffixed dispatches could otherwise race `php artisan
      migrate` against it even though their deploy steps don't collide.
- [ ] **Open design question, not resolved by this contract — decide before shipping QA
      migrations:** a lock scoped to only the migration job (above) is released before that
      branch's manual testing finishes, so a second suffix's migration can still land on the shared
      QA database mid-test and silently invalidate what the first branch is being validated
      against — and because migrations are forward-only, deploying an older branch afterward does
      not undo it. Two real options, deliberately left to the implementer rather than decided here:
      hold the lock through deployment *and* manual validation (awkward — nothing currently signals
      "a human is done testing" to end it), or give each `service_suffix` its own isolated/
      resettable database (more infrastructure, but the only option that doesn't require a lock
      spanning human judgment).
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
- [ ] Switch `sushigo-preview`'s Cloud Run ingress to authenticated-only when redesignating it as
      QA (#634) — it currently deploys with `--allow-unauthenticated`, which contradicts the
      "Internal / CI only" trust boundary this contract assigns to QA.
- [ ] Design and build the Demo one-click/global-password login UX (product feature, not
      infrastructure — likely its own Sprint 009 issue), gated to compile only into the `preview`
      target per "Two Docker build targets" above.
