# TD-07 · QA previews branches pre-merge; Production and Demo auto-deploy separate hardened/convenience images from `main`

**Status:** Accepted target; implementation is Sprint 009's remaining deployment issues. This
decision defines the contract those issues build against — it does not itself provision any GCP
project, DNS record, or deployment workflow. See
[doc/conventions/ci/deployment.md](../conventions/ci/deployment.md) for the operational reference
this decision produces.

## Decision

SushiGo Admin runs three environments, each a fully separate GCP project — not three Cloud Run
services inside one shared project — but they are **not** all driven the same way:

| Environment | GCP project | Cloud Run service | Domain | Trigger | Docker target | Purpose | Data |
|---|---|---|---|---|---|---|---|
| QA / Preview | `sushigo-app` (existing, redesignated) | `sushigo-preview` (existing) | `preview.sushigo-romita.com` (existing) | **Manual**, any branch | `preview` (convenience) | Pre-merge validation — evaluate a feature *before* it merges to `main` | Non-production / disposable |
| Demo | `sushigo-demo` (new) | `sushigo-demo` | `demo.sushigo-romita.com` (not yet in DNS) | **Automatic**, on green `main` | `preview` (convenience) | Public portfolio/product demonstration | Synthetic / resettable |
| Production | `sushigo-prod` (new) | `sushigo-prod` | `admin.sushigo-romita.com` (not yet in DNS) | **Automatic**, on green `main` | `prod-cloudrun` (hardened, new) | Real SushiGo restaurant operation | Real / persistent |

QA is **decoupled** from the automated release pipeline entirely — it is a manual, on-demand tool
for evaluating any branch before it merges, the same job the existing `deploy-preview.yml` already
does today. Demo and Production are two **independent, parallel** automated pipelines that both
trigger off the same event (a commit landing on `main` with `ci-gate` green) but build and deploy
**different images**, each promoted immutably within its own lineage. There is no "QA validates a
release that then promotes unchanged to Demo and Production" chain — that was this decision's
original design and is superseded here; see "Alternatives considered."

A dedicated GCP project per environment, rather than one project with three Cloud Run services, is
the isolation boundary: IAM, Secret Manager, Artifact Registry access, and Cloud Audit Logs are
scoped per project, so a compromised or misconfigured credential in one environment cannot reach
another's secrets by construction — not by naming discipline alone. This matters most for Demo,
the most publicly exposed surface, which must not be able to pivot toward QA's or Production's
credentials even though today's team is small.

### Two Docker build targets: a new hardened Cloud Run stage vs. `preview` (convenience)

Demo needs a convenience login for visitors — a one-click "pick a demo user and enter, no
password" index and/or a single global password — reusing and extending the existing `devdebug`
mechanism (`code/api/routes/api.php:14`'s `app()->environment('testing', 'local', 'dev',
'devtest')` gate, `DevLoginController`, and `DevLoginGuard`, which already hard-fails if
`"production"` is ever in its allowed-environments list). QA benefits from the same convenience for
manual testing. Production must never expose it.

Today that code ships in **every** environment's image — the existing `prod` Dockerfile stage does
one blanket `COPY ./code/api /var/www/html/api` (no per-file exclusion), and `preview` (`FROM prod
AS preview`) doesn't re-copy the API at all, so it's bit-for-bit the same backend code as `prod`.
Only two runtime layers currently keep it out of reach in Production: the `environment()` check
gating route registration, and `DevLoginGuard`'s config flag (with its hard-fail safety net). Both
are real, but both are runtime configuration — a misconfigured `APP_ENV` or config value in
Production would still find the code present and reachable.

**Important correction: the existing `prod` stage is not what Cloud Run Production should deploy,
and excluding devdebug code from it alone would not produce a working image.** `prod` is API-only —
Apache on port 80, no webapp build, no unified SPA+API routing, no Cloud Run entrypoint. It exists
for `docker-compose.prod.yml`'s standalone-Docker-mode split (a separate frontend container serves
the webapp there). Only `preview` assembles the single Cloud-Run-ready container this whole
contract depends on: the webapp build (`COPY --from=node_builder`), the unified Apache vhost
routing `/api/*` and the SPA from one container, and the Cloud Run entrypoint/`CMD`. Treating "the
`prod` stage minus devdebug" as Production's image would ship something that fails Cloud Run
startup and can't serve the admin SPA at all.

**This decision therefore adds a new Docker stage — call it `prod-cloudrun`** — built the same way
`preview` is (the same webapp copy, the same unified vhost, the same Cloud Run entrypoint) but with
the devdebug/demo-login routes, controllers, and guard excluded from what it copies. `prod` (the
existing stage) and its standalone-Docker-mode usage are untouched. Concretely:

- The inline dev-route block in `api.php` (lines 13-48) is extracted into its own file (e.g.
  `routes/api/dev.php`) — today it's the one route group still inlined rather than split out. Its
  include, unlike every other route group's unconditional `require __DIR__.'/api/*.php'` (`api.php`
  lines 52-68), **must stay conditional**: keep the existing `environment()` check and add a
  `file_exists()` guard around the `require`. Without that guard, `prod-cloudrun`'s build (which
  physically removes the file) makes `api.php` fatal on a missing `require` the moment `php artisan
  route:cache` runs at container startup — copying the unconditional pattern used for every other
  route file would take Production down entirely, not just omit the routes.
- `app/Http/Controllers/Api/V1/Dev/` and `app/Support/DevLoginGuard.php` are already isolated by
  path, so `prod-cloudrun`'s Docker build excludes those specific paths (and the extracted route
  file) from what it copies, while `preview` continues to include them.
- The result: Production's binary **does not contain** the devdebug/demo-login code at all, not
  merely have it disabled. The two existing runtime layers remain in place for `preview` itself
  (QA/Demo still only expose it when `APP_ENV`/config say so) — this is defense in depth added on
  top of what exists, not a replacement for it.
- **This exclusion must happen on the frontend build too, not just the backend.** Both targets
  currently share one `node_builder` webapp build; if that stays shared, Demo's one-click/global-
  password login UI either ships inside Production's bundle (defeating the whole point) or gets
  dropped from Demo too. The frontend already has a build-time flag for exactly this kind of gating
  (`VITE_LOGIN_WITH_DEVDEBUG`, read via `import.meta.env` — see `code/webapp/src/components/dev/`).
  `prod-cloudrun` and `preview` need **two separate `node_builder`-equivalent build stages**, one
  per target, with that flag set accordingly, not one shared webapp build feeding both.

`prod-cloudrun` and `preview` are therefore two distinct build targets — backend *and* frontend —
each producing its own Cloud-Run-ready image and its own digest from the same source commit,
differing only in whether the devdebug/demo-login code (API routes and webapp UI alike) is present.
See `doc/conventions/ci/deployment.md` for the exact Artifact Registry naming and the exact
Dockerfile restructuring this requires.

### QA: manual, decoupled from the automated pipeline

QA answers "does this branch work?" before a human decides to merge it — the same question
`deploy-preview.yml` already answers today via `workflow_dispatch` with a chosen `ref`. Nothing
here changes that shape: a human triggers a build+deploy of the `preview` target from whatever
branch they name, Cloud Run serves it at `preview.sushigo-romita.com`, and they test it.

Because each QA deploy is manually requested against an explicit ref rather than automatically
promoting "the highest commit," the ancestry/watermark machinery below does not apply to QA — there
is no concept of a stale QA deploy overwriting a newer one when a human explicitly chose what to
deploy. QA still runs in its own `concurrency` group (`cancel-in-progress: false`, the existing
pattern) purely to stop two manually-triggered deploys from clobbering each other mid-flight.

**That existing group is scoped per `service_suffix`, not per QA database.** The current
`deploy-preview.yml` concurrency key (`preview-deploy-<repo>-<service_suffix|default>`) is correct
for the deploy step itself — different suffixes get different Cloud Run services and never
collide — but every QA-suffixed service shares the same underlying database. QA's new migration
step (below) therefore needs its own, database-scoped concurrency group independent of
`service_suffix`, or two concurrently-dispatched QA deploys for different branches would still race
`php artisan migrate` against the same database. The deploy step's per-suffix lock and the
migration step's database-wide lock are two different mechanisms, not one.

QA also needs its own one-shot migration step at deploy time (Cloud Run runs none today — see
"Migration ownership"), run against whatever branch was requested, without the ancestry guard that
Demo/Production need — a human choosing to deploy an old branch to QA is not a hazard the way an
automated system silently reverting Production would be.

**Left as an open design question for the implementing issue, not resolved here:** a lock scoped
only to the migration job is released before that branch's manual testing finishes, so a second
suffix's migration can still land on the shared QA database mid-test — and being forward-only, a
later deploy of an older branch does not undo it. Holding the lock through manual validation too,
versus giving each suffix its own isolated/resettable database, are both real options; this
decision deliberately doesn't pick one, since it depends on how #634 actually gets implemented.

### Production and Demo: independent parallel automated pipelines from `main`

Both trigger identically — `ci-gate` green on `main` — and both are otherwise fully independent:
different Artifact Registry image, different Cloud Run service, different GCP project, own
concurrency group, own ancestry watermark, own health check, own rollback. Neither depends on the
other's outcome.

```
green main (ci-gate)
  ├─ build + push sushigo-api-prod:release-<sha>     (once, `prod-cloudrun` target) → deploy Production
  └─ build + push sushigo-api-preview:release-<sha>  (once, convenience target) → deploy Demo
```

Each image is identified by its **immutable Artifact Registry digest** (`@sha256:...`), never a
mutable tag, and that digest is resolved **exactly once**, by the build job, immediately after the
push — the deploy job consumes the passed-through digest rather than re-resolving the tag itself. A
mutable tag can be overwritten (a re-run after a partial failure, for instance), so a deploy step
that resolved the tag independently, later, could silently receive a different image than the one
that was actually built for this release.

Runtime configuration (database connection, `APP_URL`, `APP_ENV`, OAuth keys, domain) is injected
per environment via Cloud Run revision environment variables and each project's own Secret
Manager — never baked into either image at build time. Both `prod-cloudrun` and `preview` remain
environment-agnostic in that sense (the frontend's `API_URL` build arg is the relative `/api/v1`
path, same-origin, per the unified-container routing from [archived task
#013](../tasks/2026-01/013-staging-cloud-run-deployment.md)) — the only thing that now varies
*between* Production and Demo at build time is which target compiled the image, not any
environment-specific flag baked into either.

**Anti-rollback guards, mandatory for both Production's and Demo's own lineage independently:**

Two `main` commits landing close together can trigger overlapping pipeline runs for the *same*
environment; without a guard, the older commit's slower chain can finish deploying *after* the
newer one — silently reverting that environment to a stale release with no rollback ever requested.
Two mechanisms are both mandatory, and both cover the **entire chain — migration step included, not
just the deploy step** (see "Migration ownership"):

1. **Each environment's full chain (migration + deploy) runs in its own `concurrency` group**
   (`cancel-in-progress: false`), so two runs against the same environment never execute
   simultaneously.
2. **The chain must reject promoting a commit that is not a descendant of a persisted
   per-environment watermark** (the highest release commit ever promoted *to that environment*),
   never compared against "whatever is currently serving traffic." A `concurrency` group only
   guarantees mutual exclusion, not ordering — GitHub's own documentation states run ordering
   inside a concurrency group is not guaranteed — so the ancestry check is what actually prevents a
   stale release from overwriting a newer one. Tracking the watermark separately from the
   currently-serving commit matters because a **manual rollback moves traffic backward without
   moving the watermark backward**: if Production rolls back from bad commit C to prior-good commit
   B, C is still a descendant of B, so a queued or retried promotion of C must still be rejected.
   Cancelling only C's own promotion is not enough either — a later descendant D can already be in
   flight, having passed its ancestry check before the rollback happened. **A rollback must quiesce
   that environment's entire promotion queue** (every queued/in-flight run, not just C's) and
   **re-verify the ancestry/watermark check immediately before any subsequent traffic shift.**

Since Demo and Production are now fully independent lineages, each keeps its **own** watermark — a
rollback or a stale run in one can never affect the other.

**Each deploy uses Cloud Run's `--no-traffic` rollout, not a plain deploy:** the new revision must
pass its own health check before it receives any traffic. Use `/api/v1/health` (already implemented
in `code/api/routes/api/health.php`), not `/api/up` (Laravel's bare framework liveness route, which
checks nothing environment-specific). Be precise about what `/api/v1/health` actually proves today,
though: it only opens the database connection and returns 503 on failure — it does **not** validate
`APP_KEY`, `APP_URL`, or that the OAuth key files are present and readable, so a revision with a
broken `APP_KEY` or missing OAuth key can still pass it and receive traffic while login/session
behavior is silently broken. The implementing issue must extend the health check (or add a second
candidate-revision check) to cover those settings.

### Production has no manual approval gate

Production promotion is **automatic** on green `main` — no GitHub Environment `required reviewers`
gate blocks it. This is a deliberate choice by the project owner, made after weighing the
alternative (see "Alternatives considered"); it is not an oversight. Production still uses a GitHub
Environment named `production` — its role here is **secret/variable scoping** (environment-scoped
secrets are stronger than repo-level vars with a naming suffix), not merge/deploy approval. Demo
also promotes automatically, for the same reason: the compensating control for both is the fast
Cloud Run revision rollback below, not a pre-deploy human gate.

**Correction (2026-09-23, #636):** for the *initial adoption period only*, the project owner asked
for a GitHub Environment approval gate before Production promotion after all — Production is about
to start holding real employee/product data, and #636's Acceptance Criteria require "explicit
approval during the initial adoption period, with all subsequent steps automated." #636 therefore
puts `environment: production` (with required reviewers configured on the Environment) on the
single job that migrates, deploys, verifies and promotes, so one approval unlocks the whole
automated chain and nothing touches the Production database before it. The trigger itself stays
automatic on green `main`. Removing the gate later needs no pipeline change — delete the required
reviewers from the `production` Environment, exactly as "Alternatives considered" anticipated. Demo
is unaffected.

### Secrets and variables: never shared across environments

Per project, at minimum: `DB_HOST`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD`, `APP_KEY`,
`APP_URL`, the OAuth (`oauth-private.key`/`oauth-public.key`) pair, and three distinct service-
account identities — none of these values, or accounts, may be reused across QA, Demo, or
Production:

1. **Deploy service account** (`gha-sushigo-<env>@sushigo-<env>.iam.gserviceaccount.com`,
   WIF-authenticated, mirroring the existing `gha-sushigo-preview@sushigo-app...` pattern) —
   triggers the deploy from CI, does not pull the image or read secrets.
2. **Cloud Run service agent** (Google-managed, per project) — pulls the image at deploy time.
   For Demo and Production, needs `roles/artifactregistry.reader` on the source registry
   (`sushigo-app`, where QA's manual builds and both automated builds all land — see
   `deployment.md` for the exact registry layout).
3. **Cloud Run runtime service account** — a dedicated per-environment identity (not the Compute
   Engine default) that the Cloud Run *service itself* runs as, granted
   `roles/secretmanager.secretAccessor` on only that environment's own secrets. This is the
   identity Cloud Run actually uses to resolve mounted/env-injected Secret Manager values at
   request time — distinct from both accounts above.

A Production `APP_KEY` leaking into Demo (or vice versa) would let one environment decrypt or forge
session data belonging to the other, which is exactly what per-project secret isolation exists to
prevent.

**Granting the runtime account `secretmanager.secretAccessor` does not, by itself, put a secret in
front of the container.** Each deploy must also explicitly map every secret onto the revision
(`--set-secrets`/`--update-secrets`, or equivalent), including the OAuth key pair at the exact mount
paths `preview/entrypoint.sh` already expects (`/run/secrets/oauth_{private,public}/value.key`) —
authorization and binding are two separate steps, and a revision with the former but not the latter
still has nothing to read.

### Migration ownership

Migrations run **exactly once per release, as a single step gated before that release starts
serving traffic** — never as part of each container's own startup script. This is a gap to close,
not a race to fix today: the `preview` Docker target's Cloud Run boot uses
`docker/app/config/preview/entrypoint.sh`, which runs no migration and no seeding at all — Cloud
Run currently deploys with **no** automated migration step, for any environment.
`docker/app/config/prod/init.sh` does run `php artisan migrate --force` (and `db:seed --force`) on
every container start, but it belongs to `docker-compose.prod.yml` — the standalone-Docker-mode
compose target — not anything Cloud Run executes; it is cited here only because its per-boot
pattern is exactly the hazard Demo's and Production's automated pipelines must not introduce, under
Cloud Run's autoscaling, the moment more than one replica cold-starts for the same revision.

For Demo and Production, the implementing issue must add a dedicated one-shot step (a Cloud Run
Job, or a CI job that runs before the Cloud Run `deploy` step), gated by the same
concurrency+ancestry guard as the deploy step, running once per release per environment before any
replica of that revision receives traffic — built new, not by copying `init.sh`'s per-boot pattern.
For QA, migrations run at manual-deploy time against whatever branch was requested, without the
ancestry guard (see "QA: manual, decoupled" above). `db:seed --force` must never run automatically
against Production, and must not run unattended against Demo either — seeding stays an
explicitly-invoked step for both.

**Correction (2026-09-18, during #634's PR review):** the line above originally read "including
QA" as well. The project owner explicitly overrode that for QA specifically, once #634's migration
step was implemented and this was QA's first deploy through it: the database needed its base data
(roles, permissions, Passport OAuth clients, the default admin user) bootstrapped, and the owner
preferred the `migrate` job seed it automatically going forward via the idempotent
`Production\ProductionSeeder` (verified safe to re-run — every seeder in its chain guards itself
against duplicates internally) rather than rely on a human remembering a separate manual step. See
[`deployment.md`](../conventions/ci/deployment.md)'s "Seeding" section for the full rationale and
implementation. This narrows the rule to Demo and Production only — neither is affected by this
correction.

**Migrations in Demo's and Production's automated pipelines must be expand/contract-compatible with
the currently-running revision — a destructive migration is not safe to run automatically.** The
migration step runs *before* the new revision serves traffic, while the *old* revision is still
handling requests against the same database (`--no-traffic` keeps it live throughout the health
check). A migration that drops or renames a column the old revision still queries breaks that old
revision immediately, and — since application rollback and database rollback are deliberately
separate operations (below) — a subsequent traffic rollback would restore code now incompatible
with the already-migrated schema, not recover anything. The repository already contains migrations
that would violate this today (e.g.
`2026_08_27_210000_drop_legacy_cost_and_price_columns_from_item_variants.php`); a release
containing one is not a candidate for Demo's/Production's automated pipeline as specified — it
needs a deliberate, separately-planned maintenance procedure instead. Enforcing this (e.g. a CI
check flagging destructive migration operations) is a follow-up concern for the implementing issue.

### Rollback semantics: application and database are separate operations

- **Application rollback** is a Cloud Run traffic-split back to the prior revision — seconds,
  reversible, no data risk, and requires no image rebuild since the prior revision's digest is
  still resolvable. It must also **quiesce that environment's entire promotion queue** and
  re-verify the ancestry/watermark check immediately before any subsequent traffic shift (see
  "Anti-rollback guards" above). This applies independently to Demo and Production — each has its
  own watermark and its own queue.
- **Database rollback** is a distinct, deliberately manual operation (`php artisan
  migrate:rollback` or a forward-fixing migration), never triggered automatically by an
  application rollback. Reverting application code to a prior revision does not imply the schema
  must revert too — the standard additive-migration discipline (new nullable columns, backfill,
  only later drop) means most application rollbacks need no schema rollback at all.

## Justification

**Why per-project isolation instead of one project with naming discipline?** The alternative — one
`sushigo-app` project with `qa-`/`demo-`/`prod-` prefixed secrets and services — costs nothing less
in raw Cloud Run/Artifact Registry billing (a GCP project itself is free; it is an IAM/quota/audit
boundary, not a billing unit) and has no ongoing price difference from three projects. What it buys
instead is a real IAM boundary: a project-level policy mistake cannot spill from one environment
into another. Given Production runs the project owner's real restaurant operation, and Demo is
deliberately the most publicly exposed surface, that hard boundary is worth the one-time setup cost
of two more GCP projects.

**Why decouple QA from the automated pipeline?** The original design in this decision had QA
validate a post-merge release candidate that then promoted unchanged to Demo/Production. In
practice, the thing a developer actually wants from a "QA/preview" environment is to see *their own
branch* running somewhere real *before* asking anyone to merge it — exactly what `deploy-preview.yml`
already does today. Keeping QA manual and branch-addressable, rather than folding it into an
automated post-merge chain, matches that actual use case instead of inventing a new one, and it
removes an entire class of complexity (the "QA's smoke test must target a specific revision, not
the shared URL, because a second release could redeploy QA mid-test" hazard from an earlier draft
of this decision) simply because QA no longer participates in an automated chain at all.

**Why two build targets instead of one universal image?** The existing `devdebug` mechanism is
already gated by two independent runtime layers (route-registration `environment()` check,
`DevLoginGuard`'s config flag with a hard-fail on `"production"`). Both are real safeguards, but
both are *runtime* configuration — a misconfigured `APP_ENV` or config value in Production would
still find the code physically present. Compiling it out of Production's image entirely removes
that failure mode altogether: there is no configuration state in which Production's binary can
expose it, because the code isn't there. This is a standard defense-in-depth argument. It does
require a genuinely new `prod-cloudrun` stage rather than a tweak to the existing `prod` stage
(which is API-only and not Cloud-Run-deployable at all — see "Two Docker build targets" above), but
it's still a contained, moderate-effort change built directly on `preview`'s existing structure, not
a rearchitecture.

**Why no manual Production approval gate?** The safer default — a GitHub Environment with a
required human reviewer before every Production deploy — was explicitly considered and rejected by
the project owner in favor of faster iteration, on the understanding that the compensating control
is a fast, low-risk application rollback rather than a pre-deploy human gate. Demo gets the same
treatment for the same reason.

## Alternatives considered

- **One shared GCP project for all three environments, isolated by naming/prefix only.** Rejected:
  no cost savings over separate projects, and it leaves IAM/audit-log/quota isolation dependent on
  discipline rather than a platform-level boundary.
- **Isolate Production only; QA and Demo share a project.** Rejected in favor of full three-way
  isolation: Demo is public-facing and the most likely target for probing/abuse, and a Demo
  compromise should not be able to reach QA's secrets either.
- **Keep QA inside the automated post-merge promotion chain (this decision's original design).**
  Rejected: it optimized for "prove the exact release candidate works" over "let a developer see
  their own branch before merging," which is the actual workflow this team wants — and it forced
  QA's smoke test to defend against races with the concurrency group below it, complexity that
  evaporates once QA is a decoupled, manually-triggered tool.
- **Ship one universal image to all three environments (this decision's original design).**
  Rejected in favor of a new hardened `prod-cloudrun` target (built like `preview`, minus the
  devdebug/demo-login code): the two existing runtime gates are real, but a compile-time exclusion
  removes an entire
  class of Production-exposure risk that no runtime configuration mistake could ever reintroduce.
- **Require GitHub Environment manual approval before every Production deploy.** Rejected for the
  initial rollout in favor of automatic promotion, trading a pre-deploy human gate for faster
  iteration; the fast Cloud Run traffic-split rollback is the compensating control. This can be
  revisited later by adding required reviewers to the `production` GitHub Environment — no pipeline
  redesign is needed to add it after the fact.
- **Rebuild each environment's image separately per deploy (no shared digest, no build-once
  discipline).** Rejected: Demo and Production each still build **once** per `main` commit and
  promote that same digest within their own lineage — rebuilding per deploy would reopen the
  "different binary than what was tested" risk this decision exists to close, just now within a
  single lineage instead of across all three environments.
