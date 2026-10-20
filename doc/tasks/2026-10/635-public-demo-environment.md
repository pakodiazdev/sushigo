# 🧪 Provision public Demo with isolated data, deterministic seed and reset flow

**Labels:** investment: product-engineering, sprint-9

## Description

Create a dedicated public Demo environment at `demo.sushigo-romita.com` for recruiters, portfolio reviewers and future prospects, as its own **independent, automated** pipeline per [TD-07](../decisions/td-07-environment-release-promotion-contract.md) (accepted via #632).

**Design correction (2026-09-15):** an earlier draft of this issue assumed Demo is "promoted from the same validated release image used in QA." TD-07 rejected that chain — QA is manual/decoupled (#634) and does not gate Demo. Demo triggers automatically on green `main` (`ci-gate`), the same event Production (#636) reacts to, but the two are fully independent lineages: different image (Demo uses the `preview` target built by #633), different Cloud Run service, different GCP project, own concurrency group, own ancestry watermark. Neither Demo nor Production depends on the other's outcome, and neither depends on a QA deploy having happened.

## Reason

Recruiters, portfolio reviewers and prospects need to explore SushiGo Admin without touching QA (pre-merge, disposable) or Production (real restaurant data). Demo is the most publicly exposed surface, so it needs its own isolated project, credentials and data, a data set that can be restored after visitors change it, and automated guards that stop a broken or stale release from ever serving traffic.

## Objective

Provide a public, isolated, resettable SushiGo Admin demonstration environment that automatically deploys the `preview`-target digest #633 builds for every green `main` commit — independent of QA and Production.

## Technical Tasks

- [x] Provision a dedicated **`sushigo-demo` GCP project** (not a Cloud Run service inside the existing `sushigo-app` project) — per TD-07's per-project isolation boundary — with its own IAM, Secret Manager and Artifact Registry access.
- [x] Create the three per-project service-account identities TD-07 requires: deploy SA (`gha-sushigo-demo@sushigo-demo...`, WIF), the Google-managed Cloud Run service agent (granted `artifactregistry.reader` on `sushigo-app`'s registry, where the image actually lives), and a dedicated Cloud Run runtime SA (`secretmanager.secretAccessor` on only Demo's own secrets).
- [x] Configure ~~`demo.sushigo-romita.com`~~ `sushigo-demo.pakodiaz.dev` with HTTPS (domain changed during the PR: Demo is a portfolio surface and stays off the business domain).
- [x] Trigger automatically on `ci-gate` green on `main`; consume the `preview`-target digest #633 published for that commit — never rebuild.
- [x] Add a one-shot migration step (Cloud Run Job or CI step) gated by the same concurrency+ancestry guard as the deploy step, run once per release before any replica serves traffic — expand/contract-compatible migrations only; a destructive migration in the release is not a candidate for this automated pipeline.
- [x] Run Demo's chain (migration + deploy) in its own `concurrency` group (`cancel-in-progress: false`) so overlapping `main` commits can't interleave.
- [x] Reject promoting a commit that isn't a descendant of Demo's own persisted watermark (the highest commit ever promoted to Demo) — never compare against "whatever is currently serving."
- [x] Deploy via Cloud Run's `--no-traffic` rollout; require `/api/v1/health` to pass before any traffic shift.
- [x] Create a deterministic `DemoSeeder` (or equivalent): employees, products, variants, locations, representative stock/inventory and other safe entities for the current golden path.
- [x] Create dedicated demo credentials/role(s) with least privilege appropriate for public exploration.
- [x] Disable or sandbox side effects that could contact real customers/suppliers (email, WhatsApp, external webhooks, etc.).
- [x] Add a repeatable reset mechanism (scheduled and/or manual) that restores the canonical demo dataset — `db:seed --force` stays an explicitly-invoked step, never automatic.
- [x] Add basic public-abuse protections appropriate to the current application: rate limiting, constrained permissions and/or other low-cost controls.
- [x] Add a visible Demo indicator/disclaimer if needed to prevent the environment from being mistaken for live SushiGo operations.
- [x] Run post-deploy smoke checks; a failed check must quiesce Demo's promotion queue and re-verify the watermark before any later run can shift traffic (see TD-07 "Anti-rollback guards").

## Acceptance Criteria

- [x] ~~`demo.sushigo-romita.com`~~ `sushigo-demo.pakodiaz.dev` is publicly accessible over HTTPS.
- [ ] Demo deploys automatically on green `main`, using the exact `preview`-target digest #633 built for that commit — no rebuild.
- [x] Demo's pipeline is independent of QA (#634) and Production (#636): neither gates it, and its watermark/concurrency are its own.
- [x] Demo has its own GCP project, database and secrets and cannot read/write Production or QA data.
- [x] A deterministic demo account and representative dataset are available.
- [x] Demo data can be restored automatically/reliably without manual database surgery.
- [x] Real outbound integrations are disabled or safely sandboxed.
- [x] A broken Demo deployment is detected by automated smoke validation and does not receive traffic.
- [x] An older `main` commit's slower pipeline run cannot silently revert Demo to a stale release.

## Out of Scope

- Full multi-tenant SaaS demo provisioning.
- Production customer onboarding.
- Building the complete future golden path if functionality does not exist yet.
- Any dependency on a QA/Preview deploy having occurred.

## Investment Type

`investment: product-engineering`

## ⏱️ Time

- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** `0h 51m`

```json
[
  { "date": "2026-09-23", "start": "15:50", "end": "16:41" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 51m (51m)
- **vs optimistic:** −3h 9m
- **vs pessimistic:** −7h 9m

**Justification:**
The tracked total covers only the one work session recorded in the Sessions array (the initial implementation, 2026-09-23). It understates the real effort: the later work ran outside `/start-issue` and has no session entries. That work covered the review-response fixes (sandbox media routes, atomic reset, migration-guard rule, account-email propagation, SonarCloud findings) and the real provisioning of the environment: the `sushigo-demo` GCP project, which needed a billing-quota cleanup, WIF, service accounts, the bucket and Secret Manager; the Supabase project; and GitHub environment config renamed to #634's unprefixed names. It also covered an end-to-end promotion test from the branch, which surfaced three real issues fixed in this PR: `demo:reset` truncating Supabase's `auth` schema, the deployer lacking cross-project registry read, and the registry cleanup policy letting QA and Demo evict each other's images (fixed with a dedicated `sushigo-api-demo` image; leftover test images tracked in #669). The domain moved to `sushigo-demo.pakodiaz.dev` mid-flight. The criterion "Demo deploys automatically on green `main`" is wired but stays unticked: it can only be proven after merge, once `DEMO_DEPLOY_ENABLED=true`. Future provisioning-heavy issues should open sessions for the operational work too, so estimates can be calibrated.

