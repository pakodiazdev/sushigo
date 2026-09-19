# 🧪 Harden the manual QA/Preview deploy with a migration step and post-deploy smoke tests

**Labels:** investment: dev-platform, sprint-9

## Description

Per [TD-07](../decisions/td-07-environment-release-promotion-contract.md) (accepted via #632), QA/Preview stays **manual and decoupled** from the automated release pipeline — it answers "does this branch work?" before merge, the same job `deploy-preview.yml`'s `workflow_dispatch` already does today, not "receive an automatically-promoted release candidate."

**Design correction (2026-09-15):** an earlier draft of this issue framed QA as the first automatic promotion stage, consuming a digest produced by a release-build workflow before Demo/Production. TD-07 rejected that chain — QA is not gated by, and does not gate, #633/#635/#636. This issue is now scoped to closing the two real gaps `deploy-preview.yml` has today: no migration step, and no smoke validation.

## Objective

Add a one-shot migration step and deterministic smoke checks to the existing manual `deploy-preview.yml`, without changing its manual, branch-addressable trigger model or coupling it to the automated Demo/Production pipelines.

## Technical Tasks

- [x] Add a one-shot migration step to `deploy-preview.yml`, run against whatever `ref` was requested, **without** the ancestry/watermark guard Demo/Production need (a human explicitly choosing to deploy an older branch to QA is not the hazard an automated silent revert would be).
- [x] Give the migration step its own **database-scoped** concurrency group, independent of the existing per-`service_suffix` deploy concurrency group — today's group only prevents two deploys of the *same* suffix from colliding; two different suffixes still share one QA database and would race `php artisan migrate` against each other.
- [x] Decide and document the open question TD-07 leaves unresolved: whether the migration lock should be held through manual validation (blocking a second suffix's migration mid-test) or whether each suffix should get its own isolated/resettable database instead — record the decision, don't silently default to the narrowest lock.
- [x] Add deployment health checks for the application/API startup path (`/api/v1/health`).
- [x] Add smoke coverage for the SPA and a minimal authenticated flow: API health, SPA availability, login/authentication, `/me`, and read access to representative Employees/Products/Inventory endpoints safe to exercise in QA.
- [x] Fail the manual deploy when migration or smoke tests fail.
- [x] Write the deployed commit SHA, image tag, Cloud Run revision and smoke-test result to the workflow summary.
- [x] `db:seed --force` must never run automatically as part of this flow — seeding stays an explicitly-invoked step, same as everywhere else per TD-07.

## Acceptance Criteria

- [x] A manual QA/Preview deploy runs its migration exactly once, before the new revision is exercised.
- [x] Two concurrently-dispatched QA deploys against different suffixes cannot race migrations against the shared QA database.
- [x] Failed deployment or smoke validation is clearly surfaced in the workflow run/summary.
- [x] QA continues to build/deploy on manual dispatch only — no automatic trigger from `main` is introduced by this issue.
- [x] QA remains unaffected by, and does not gate, #635 (Demo) or #636 (Production).

## Out of Scope

- Automated triggering of QA deploys.
- Public Demo provisioning.
- Production deployment.
- Full Cypress regression against the hosted environment; this issue requires a small deterministic deployment smoke suite.

## Investment Type

`investment: dev-platform`

## ⏱️ Time

- **Optimistic:** `3h`
- **Pessimistic:** `6h`
- **Tracked:** `4h19m`

```json
[
  { "date": "2026-09-17", "start": "14:56", "end": "15:04" },
  { "date": "2026-09-17", "start": "15:04", "end": "15:35" },
  { "date": "2026-09-18", "start": "12:15", "end": "13:10" },
  { "date": "2026-09-18", "start": "14:10", "end": "14:55" },
  { "date": "2026-09-19", "start": "01:45", "end": "03:25" }
]
```

## 📊 Retrospective

**Actual total: 4h19m** across 5 sessions (session 1: 8m — initial unattended `/issue-no-review`
implementation, PR creation, CI green; session 2: 31m — Codex review fixes via `/pr-comments`
[token parsing, secret/JSON injection] and the first `/finish-pr` close-out; session 3: 55m — the
project owner's explicit decision to add automatic QA seeding and a dedicated `qa` GitHub
Environment, both implemented and pushed; session 4: 45m — first real `workflow_dispatch` tests
against live QA infrastructure, diagnosing an IPv6-only Supabase direct-connection host, missing
Secret Manager bindings on the deploy step, and a stale `DB_HOST` reference; session 5: 1h40m,
after an overnight gap — fixing the deploy step's secret bindings [including a wrong first attempt
using plain literals, corrected after discovering the existing service already used Secret Manager
references], the first successful end-to-end run, a Devin/DeepWiki-flagged command-injection
vulnerability fix, and final re-verification).

- **Optimistic (3h) vs actual (4h19m): +1h19m (+44%). Pessimistic (6h) vs actual: -1h41m (-28%)** —
  lands between both estimates, closer to pessimistic.
- Session 1 alone (8m) would have landed enormously under the optimistic estimate — the issue was
  already correctly re-scoped by TD-07 before work started, so the initial implementation
  (splitting the workflow into build/migrate/deploy/smoke, the smoke-test script, the
  migration-lock-duration decision writeup) was straightforward.
- The real cost was everything TD-07 and the original issue **couldn't** anticipate from a desk:
  this was QA/Preview's first-ever deploy through an automated migration step, so testing it for
  real surfaced three genuine, pre-existing infrastructure gaps that no amount of code review would
  have caught — an IPv6-only Supabase connection string GitHub-hosted runners can't route to, a
  deploy step that never bound Secret Manager secrets (so a fresh `service_suffix` booted with zero
  config, and the existing default service had silently drifted to a dead database), and a
  pre-existing command-injection vulnerability in input handling that predates this issue entirely.
  Sessions 4–5 were that discovery-and-fix cycle, done against live GCP/Supabase infrastructure
  this session cannot provision or query on its own — every fix required the project owner to run a
  command or check a console and relay the result back.
- Session 3's scope addition (automatic seeding, a dedicated `qa` GitHub Environment) was the
  project owner's explicit, informed choice — made after being told it reversed a specific TD-07
  rule — not scope creep; it's the reason the deploy step's secrets could be scoped and named
  cleanly for session 4–5's fixes to build on.
- No PHPUnit/Vitest test-fixing cycle inflated this session (pure CI/workflow + docs change) — the
  overrun is entirely live-infrastructure debugging and one unplanned, but real, security fix.





