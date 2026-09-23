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
- **Tracked:** `10h19m`

```json
[
  { "date": "2026-09-17", "start": "14:56", "end": "15:04" },
  { "date": "2026-09-17", "start": "15:04", "end": "15:35" },
  { "date": "2026-09-18", "start": "12:15", "end": "13:10" },
  { "date": "2026-09-18", "start": "14:10", "end": "14:55" },
  { "date": "2026-09-19", "start": "01:45", "end": "03:25" },
  { "date": "2026-09-20", "start": "09:50", "end": "11:55" },
  { "date": "2026-09-23", "start": "00:00", "end": "04:15" }
]
```

## 📊 Retrospective

**Sessions 1–6 subtotal: 6h04m** (recomputed from the raw start/end pairs above — the previously
stated `6h24m` had a 20-minute drift, corrected once, in session 7 below) across 6 sessions
(session 1: 8m — initial unattended `/issue-no-review`
implementation, PR creation, CI green; session 2: 31m — Codex review fixes via `/pr-comments`
[token parsing, secret/JSON injection] and the first `/finish-pr` close-out; session 3: 55m — the
project owner's explicit decision to add automatic QA seeding and a dedicated `qa` GitHub
Environment, both implemented and pushed; session 4: 45m — first real `workflow_dispatch` tests
against live QA infrastructure, diagnosing an IPv6-only Supabase direct-connection host, missing
Secret Manager bindings on the deploy step, and a stale `DB_HOST` reference; session 5: 1h40m,
after an overnight gap — fixing the deploy step's secret bindings [including a wrong first attempt
using plain literals, corrected after discovering the existing service already used Secret Manager
references], the first successful end-to-end run, a Devin/DeepWiki-flagged command-injection
vulnerability fix, and final re-verification; session 6: 2h5m, running `/finish-pr` through **three**
consecutive Codex review rounds, each triggered by re-checking the previous round's fix commit — a
second review (posted 2026-09-19, not checked until this session) had left 3 real findings [migrate
not gated on a successful build, build/migrate independently re-resolving a mutable ref instead of
pinning one commit, DB secrets round-tripping through a written `.env` file]; fixing those and
re-verifying triggered a third review with 3 more [an implicit, unbound Cloud Run service account
that would silently fail for a new `service_suffix`, `--set-env-vars` wiping `APP_URL` on every
deploy, the per-suffix deploy lock still not actually closing the deploy/smoke race]; fixing *those*
and re-verifying triggered a fourth review with 3 more still [the deploy/smoke lock fix itself
being insufficient — two jobs sharing a concurrency group is not equivalent to one continuous lock,
requiring the two jobs to be merged into one — a fresh-suffix `DB_PORT` gap, and un-guarded curl
calls in the smoke script that would abort the whole script under `set -e` on a transport failure];
each round addressed via `/pr-comments` and re-verified end-to-end against live infrastructure
before the next review ran).

- **Optimistic (3h) vs actual (6h24m): +3h24m (+113%). Pessimistic (6h) vs actual: +24m (+7%)** —
  slightly over the pessimistic estimate.
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
- Session 6 is a distinct lesson from sessions 4–5: Codex's review of the session-5 push arrived
  the same night, but nothing in this workflow proactively surfaces a review that lands after an
  interactive session has already ended — it sat unresolved for roughly a day until `/finish-pr`'s
  own pre-merge check looked for it. All three findings were genuine design gaps (an ordering race,
  a ref-pinning race, and a residual dotenv-injection risk this issue's own earlier Codex-fix round
  should have generalized to but didn't), not false positives.
- The **three** consecutive Codex rounds within session 6 — each surfaced only because `/finish-pr`
  re-triggers Codex against every new commit it produces — is the strongest evidence in this issue's
  history that a single review pass is not sufficient for infrastructure-as-code changes: every fix
  commit is itself new surface area a reviewer hasn't seen yet, and a *fix* for one finding can
  itself be an incomplete fix (round 3's concurrency "fix" from round 2 was itself round 3's own
  first finding). All nine Codex findings across the three rounds were real (zero false positives,
  zero business-rule disputes), which argues the review cost was worth paying in full rather than
  stopping early — stopping after round 2, for instance, would have shipped a deploy/smoke
  concurrency guard that still didn't work.
- No PHPUnit/Vitest test-fixing cycle inflated this session (pure CI/workflow + docs change) — the
  overrun is entirely live-infrastructure debugging, one unplanned but real pre-existing security
  fix, and three further rounds of genuine review findings.

**Session 7 (2026-09-23, 4h15m):** re-opened after the PR had already been through `/finish-pr`
once (the `b593119b` squash). Started with `/rebase-main` (2 upstream commits, clean, no
conflicts), then a long chain of Codex/security-review rounds, each fixing the round before it —
fifteen in total across this session, addressed through `/pr-comments`, two separate `/finish-pr`
runs, and one more `/pr-comments` pass in between:
- Rounds 5–8 (`/pr-comments`, pre-`/finish-pr`): `APP_URL` prediction for a fresh `service_suffix`
  (round 5), the prediction itself breaking under `inputs.region` overriding to an undeployed
  region — replaced with reading the real post-deploy URL (round 6); a multiline `service_suffix`
  bypass, suffix/concurrency-key drift between two independently-sanitizing steps, a stale revision
  captured before the `APP_URL` update, an un-revoked smoke-test Passport token, and a missing
  seeder-password secret silently reseeding a public service with the default password (round 7);
  round 7's own secret check running after migration had already committed schema changes (round
  8, fixed by moving it to a preflight step).
- First `/finish-pr` run: discovered and reopened issue #634, which had been closed on 2026-09-17
  — before session 1 even finished — despite the PR never merging (cause not determined; likely a
  stray manual close). Its own Phase 7.6 loop then ran seven more Codex rounds, each against the
  previous round's fix: a database-lock gap between `migrate` and `deploy`+`smoke` declined as an
  extension of an already-accepted TD-07 trade-off (project owner confirmed); the smoke-test
  checkout not pinned to the resolved ref (fixed); the resulting `APP_URL`/`APP_ENV` seed override
  itself using `API_URL_PREVIEW`, later discovered to be a *relative* path, not absolute — corrected
  to a dedicated `QA_APP_URL` var; the per-suffix concurrency lock only covering the final job,
  letting same-suffix dispatches race through earlier jobs — closed by moving the lock to workflow
  scope and switching `service_suffix` from auto-normalization to strict validation (project owner
  chose this over accepting the race or filing a follow-up); the resulting stricter regex still
  accepting a service name ending in a hyphen (fixed); and finally the earlier "pin smoke-test
  checkout" fix itself turning out to break deploying any ref older than this PR, since
  `deploy-smoke-test.sh` doesn't exist at older commits — reverted. After 7 rounds with no end in
  sight, asked the project owner whether to keep looping; they chose one more round then stop
  regardless, which surfaced an eighth (fifteenth overall) finding — GitHub Actions concurrency
  groups preserve only one running + one pending member, so a third same-group dispatch cancels the
  second instead of queuing — left as an **open, unresolved thread** per that instruction, for a
  human to decide via `/pr-comments` rather than autofixed.
- A following `/pr-comments` run processed that one open thread: documented the concurrency
  queue-depth limitation in the workflow file (an external mutex/queue was judged not worth
  building for a low-frequency manual workflow) rather than attempting a structural fix, then
  resolved it.
- This second `/finish-pr` run is finalizing the issue and archive now that CI is green and every
  review thread is resolved.
- Recomputing `Tracked` from the raw session table (not trusting the stale `6h24m` value carried
  over from session 6) found the sessions 1–6 subtotal was actually `6h04m` — a 20-minute drift,
  corrected here.

- **Optimistic (3h) vs actual (10h19m): +7h19m (+244%). Pessimistic (6h) vs actual: +4h19m (+72%)**
  — well past both estimates.
- Session 7 alone (4h15m) is the largest single session on this issue, entirely from a workflow
  this repo hadn't stress-tested before: `/finish-pr` re-triggers Codex against every new commit it
  produces, and for an infra PR with this much surface area (GCP CLI flags, concurrency semantics,
  shell quoting/validation, Cloud Run naming rules) that kept generating new, real findings for as
  long as new commits kept landing — **fifteen** review rounds total across the issue's life, not
  three. The pattern from session 6 held repeatedly: a fix for one finding (the URL-prediction
  rewrite, the secret-check move, the checkout pin, the stricter suffix regex) was itself
  incomplete or introduced a new problem, becoming the *next* round's first finding. Every one of
  the fifteen findings was real — zero false positives across the entire issue.
- Stopping the fix-loop deliberately (one more round, then stop regardless, per the project owner's
  explicit choice) rather than continuing indefinitely is itself a documented decision worth
  repeating: an unresolved thread left for deliberate human review is a legitimate stopping point
  for an automated pipeline, not a failure to reach "done."
- Explicitly asking the project owner before touching deliberately-documented accepted-risk
  findings (rather than silently fixing or silently skipping them) is a practice worth repeating on
  future infra-security findings that resurface behavior another decision record already blessed —
  every one of those checks (four across this issue: the migrate/smoke lock gap, QA's public
  access, arbitrary-ref credentials, and the seed-overwrite behavior) confirmed the existing call
  was still correct, at the cost of one short question each instead of guessed unilateral action.










