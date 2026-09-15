---
sprint: "009"
title: Release Pipeline & Platform Hardening
status: Planned

created: 2026-09-14
started:
completed:
last_updated: 2026-09-15

base_branch: main
base_commit: 1116db34
scope_issues: 16

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-008-inventory-valuation-and-platform-hardening.md
next:
---

# Sprint 009 — Release Pipeline & Platform Hardening

> Turn the existing manual Cloud Run "preview" deploy into one immutable-image release pipeline
> promoted automatically across QA, Demo, and Production, with a Production backup/restore/
> observability baseline — plus PHP runtime-contract enforcement and five more restored quarantined
> Cypress specs.

## 1. Executive Summary

Sprint 009 contains **sixteen Issues** estimated at **33.75h optimistic / 80h pessimistic**. It is
the first sprint to move SushiGo Admin beyond local dev-lab workspaces and a single manual preview
deploy: seven Issues (`#632`–`#637`, plus the PHP contract Issue `#638`) build one coherent release
pipeline, and nine more pick up conflict-free hardening and follow-up debt.

The release-pipeline chain is the sprint's critical path and its principal value:

- **#632** defines the authoritative QA/Demo/Production environment and release-promotion contract
  (domains, data policy, secret boundaries, release identity, migration ownership, rollback
  semantics) before any of it is implemented.
- **#633** builds the single immutable release image (commit SHA + digest) that every downstream
  environment consumes without rebuilding.
- **#634** automatically deploys that image to `preview.sushigo-romita.com` (QA) and gates
  promotion on deployment health checks and smoke tests.
- **#635** and **#636** promote the exact QA-validated digest to the public Demo
  (`demo.sushigo-romita.com`) and to real Production (`admin.sushigo-romita.com`) respectively —
  Production adds an explicit one-shot migration step, an initial GitHub Environment approval gate,
  and revision-based rollback.
- **#637** establishes the minimum Production reliability baseline (automated backups, a proven
  restore drill, rollback documentation, uptime/health alerting) that must exist before SushiGo
  Admin carries real operational data.

The remaining nine Issues are independent, conflict-free hardening and follow-up work that can run
in parallel with the pipeline chain: **#638** enforces the declared PHP compatibility contract in
CI (a Sprint 8 review finding); **#647** restores real per-surface CI badges (backend/frontend
Lint+Test, Cypress spec count) self-hosted on the `badges` branch, after `#639` collapsed them into
one combined badge when `#560` made GitHub's native per-workflow badge no longer meaningful;
**#624** finishes the Spanish-copy translation `#576` deliberately deferred; **#613** adds the
non-authoritative Stock Transfer availability preview `#573` deferred; **#612** produces the CI
cross-mode wall-clock comparison artifact `#560` deferred; and **`#536`,
`#537`, `#541`, `#542`, `#557`** restore five more `#490`-quarantined Cypress specs.

## 2. Context

Sprint 008 closed out Inventory valuation/UX hardening; every scoped Issue there is merged (see
`doc/sprints/sprint-008-inventory-valuation-and-platform-hardening.md` §13). SushiGo Admin has
grown into a real, product-complete platform (Inventory, Cash, Attendance/Payroll, Menu/Dishes,
Users & Access) that still only runs inside local `sushigo-dev-lab` workspaces plus one manually
triggered Cloud Run "preview" deploy (`deploy-preview.yml`). There is no QA promotion gate, no
public demo, and no path to Production at all — a real blocker for the project's own stated
trajectory of moving from local development toward a demo, then a private production deployment for
the restaurant this platform is actually built to run.

Three additional gaps surfaced independently and were filed but never scheduled:

- A Sprint 8 review (`#560`'s own retrospective, `#589`) found `code/api/composer.json` declares
  PHP `^8.2` while the runtime/CI path only ever validates PHP 8.5 — syntax valid on the newer
  runtime can merge while silently violating the declared compatibility floor (`#638`).
- `#560` (the Sprint 7 CI-DAG unification) deferred its own cross-mode wall-clock comparison
  artifact as an unchecked, non-blocking follow-up (`#612`).
- `#573` (Stock Transfers) deferred an optional non-authoritative source-availability preview to
  avoid pulling a stock-projection UI dependency into that issue's scope (`#613`).
- `#576` (Sprint 8 Inventory UX standardization) deliberately left the deep CRUD form fields'
  copy in English as a separable follow-up (`#624`, tracked in `#576`'s own PR `## 🤔 Assumptions`).
- `#639` fixed the README's broken per-surface Tests/Lint badges by collapsing them into one
  combined "CI" badge, since GitHub's native per-workflow `badge.svg` only reflects an entire
  workflow's status and stopped being meaningful once `#560` unified six workflows into one
  `ci.yml`. That traded away real per-surface visibility; `#647` restores it with self-hosted
  badges rendered from each surface's own job outputs, following the same pattern already
  established for `iteration-progress.svg`.

Five more Cypress specs quarantined under `#490` remain skipped beyond the four Sprint 008 already
restored (`#545`, `#546`, `#550`, `#535`): `attendance-close-day.cy.ts` (`#536`),
`attendance-day-status.cy.ts` (`#537`), `employee-vacation-entitlement.cy.ts` (`#541`),
`employees.cy.ts` (`#542`), and the CI-only `schedule-history.cy.ts` (`#557`).

Repository base for planning: `main` at `1116db34`.

## 3. Sprint Goal

**Sprint Goal:** Ship one immutable-image release pipeline that promotes a validated `main` commit
through QA, Demo, and Production with a working backup/restore/observability baseline, while
enforcing the declared PHP runtime contract and clearing five more quarantined Cypress specs and
three small carried-over follow-ups — without onboarding real customer data beyond the initial
approval-gated Production rollout.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-09-14 |
| Planned start | — |
| Planned end | — |
| Target calendar duration | — |
| Started | — |
| Completed | — |
| Active workdays | — |

The fifteen Issues are on **SushiGo Admin**, already labeled `sprint-9` on GitHub ahead of formal
promotion.

## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title | Investment | Priority | Opt. | Pess. |
|---|---:|---|---|---|---:|---:|
| ⏳ | #632 | Define QA, Demo and Production environment & release contract | Dev platform | P0 | 2h | 4h |
| ⏳ | #633 | Build and publish one immutable release image after green main CI | Dev platform | P0 | 3h | 6h |
| ⏳ | #634 | Automatically deploy releases to QA and run post-deploy smoke tests | Dev platform | P0 | 3h | 6h |
| ⏳ | #635 | Provision public Demo with isolated data, deterministic seed and reset flow | Product engineering | P1 | 4h | 8h |
| ⏳ | #636 | Automate safe Production deployment to admin.sushigo-romita.com | Dev platform | P0 | 7h | 14h |
| ⏳ | #637 | Establish Production backup, restore, rollback and observability baseline | Product engineering | P0 | 3h | 6h |
| ⏳ | #638 | Enforce the declared PHP runtime compatibility contract in CI | Dev platform | P1 | 1h | 3h |
| ⏳ | #624 | Translate remaining Inventory CRUD form fields to Spanish | Product engineering | P2 | 3h | 6h |
| ⏳ | #613 | Add non-authoritative source-availability preview to the Stock Transfer form | Product | P2 | 2h | 5h |
| ⏳ | #612 | Capture cross-mode CI wall-clock comparison (e2e-test vs wip vs full) | Dev platform | P2 | 1h | 3h |
| ⏳ | #536 | Fix quarantined Cypress spec: attendance-close-day.cy.ts | Dev platform | P1 | 0.5h | 3h |
| ⏳ | #537 | Fix quarantined Cypress spec: attendance-day-status.cy.ts | Dev platform | P1 | 0.5h | 3h |
| ⏳ | #541 | Fix quarantined Cypress spec: employee-vacation-entitlement.cy.ts | Dev platform | P1 | 0.5h | 3h |
| ⏳ | #542 | Fix quarantined Cypress spec: employees.cy.ts | Dev platform | P1 | 0.5h | 3h |
| ⏳ | #557 | Fix quarantined Cypress spec: schedule-history.cy.ts (CI-only) | Dev platform | P1 | 0.75h | 3h |
| ⏳ | #647 | Publish self-hosted per-surface CI badges (Backend/Frontend Lint+Test, Cypress) | Dev platform | P2 | 2h | 4h |
|  |  | **Total** |  |  | **33.75h** | **80h** |

Investment mix: dev-platform 12 (`#632`, `#633`, `#634`, `#636`, `#638`, `#612`, `#647`, `#536`,
`#537`, `#541`, `#542`, `#557`) · product-engineering 3 (`#635`, `#637`, `#624`) · product 1 (`#613`).

**Capabilities this scope delivers:**

- One documented, authoritative QA/Demo/Production environment and release-identity contract with
  explicit data, secret, and trust boundaries per environment.
- A single immutable release image (commit SHA + digest) built once after green `main` CI and
  promoted unchanged across every downstream environment.
- Automatic QA deployment gated on deployment health checks and a minimal authenticated smoke
  suite.
- A public, isolated, resettable Demo environment safe to share externally.
- Automated, approval-gated Production deployment with an explicit migration step, revision-based
  rollback, and traffic promotion only after migration + smoke success.
- A Production reliability baseline: automated backups, a proven restore drill, rollback/incident
  runbook, and baseline uptime/error alerting.
- CI mechanically enforcing the repository's declared PHP compatibility floor.
- Real per-surface CI status visibility restored in the README (backend/frontend Lint+Test,
  Cypress spec count), self-hosted instead of depending on GitHub's per-workflow badge.
- Five more quarantined Cypress specs restored and green in CI, plus three small carried-over
  follow-ups (Stock Transfer availability preview, remaining Inventory form Spanish copy, CI
  cross-mode wall-clock evidence) closed out.

### 5.2 Excluded

- Multi-region or high-availability architecture for any environment.
- Zero-click Production promotion; the initial rollout keeps a GitHub Environment approval gate by
  design (`#636`), to be reconsidered after several stable releases.
- Automatic rollback of arbitrary database schema/data migrations — application-revision rollback
  and database restore stay explicitly distinct (`#636`, `#637`).
- Full APM/error-tracking vendor rollout or a complete SRE observability platform (`#637`).
- Multi-tenant SaaS demo provisioning or real Production customer onboarding (`#635`).
- Upgrading Laravel or unrelated Composer dependencies as part of the PHP contract work (`#638`).
- Any Inventory behavior/state-handling change alongside the `#624` copy-only translation pass.
- The remaining quarantined specs outside this sprint's five (`#538`–`#540`, `#543`, `#551`,
  `#556`, `#558`, `#561`) and unrelated deferred debt (`#85`, `#276`, `#450`).
- Phase 2 of the exact monetary value contract (`#621`, deferred from Sprint 008) — not part of
  this sprint's scope.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | — | — |

_No scope changes recorded yet — this sprint has not started._

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|

_None yet — this sprint has not started._

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | #632, #633, #636, #637 | The environment/release contract and Production delivery + reliability baseline are the actual precondition for SushiGo Admin to carry real restaurant data at all |
| **High** | #634, #638, #536, #537, #541, #542, #557 | QA is the hard gate every later promotion depends on; the PHP contract closes a real Sprint 8 review finding; the five quarantined specs restore CI coverage the suite is currently missing |
| **Medium** | #635, #613 | Public Demo has real portfolio/business value but is not core restaurant operation; the Stock Transfer preview is a small, already-deferred UX convenience |
| **Low** | #624, #612, #647 | Copy-only translation follow-up, a non-blocking CI evidence artifact, and restored badge visibility — valid work with no urgency |

### Ordering principle

> **The release-pipeline chain is value-ordered by its own hard dependencies (contract → image →
> QA → Demo/Production → reliability baseline); every other Issue is conflict-free filler that
> starts immediately and never displaces the chain.**

## 7. Route A — Execution Rounds

### Round 0 — Independent, conflict-free work (parallel from day one)

Each Issue owns a distinct file surface with no dependency on the release-pipeline chain, so all
ten may run concurrently whenever agent capacity is free — except the one coordination pair noted
below (T6/T9 both touch CI workflow files).

| Lane | Issue | Owns | Opt. | Pess. |
|---|---:|---|---:|---:|
| T0 | #536 | `cypress/e2e/attendance-close-day.cy.ts` | 0.5h | 3h |
| T1 | #537 | `cypress/e2e/attendance-day-status.cy.ts` | 0.5h | 3h |
| T2 | #541 | `cypress/e2e/employee-vacation-entitlement.cy.ts` | 0.5h | 3h |
| T3 | #542 | `cypress/e2e/employees.cy.ts` | 0.5h | 3h |
| T4 | #557 | `cypress/e2e/schedule-history.cy.ts` | 0.75h | 3h |
| T5 | #612 | `doc/conventions/ci/pipeline.md` (or equivalent generated artifact under `.github/`) | 1h | 3h |
| T6 | #638 | `code/api/composer.json`, CI PHP-version jobs, compatibility docs | 1h | 3h |
| T7 | #613 | `stock-transfer-form.tsx` (behavior: source-availability preview) | 2h | 5h |
| T8 | #624 | Inventory CRUD form components (copy only) — starts **after** T7 lands (see §8) | 3h | 6h |
| T9 | #647 | `.github/workflows/{ci,_api-ci,_webapp-ci,_e2e-ci}.yml`, new `.github/scripts/ci-badges/`, `README.md` — coordinate with T6 (see §9) | 2h | 4h |
|  |  | **Round effort** | **11.75h** | **39h** |

Each quarantined-spec fix must remove its `#490` `this.skip()` guard and prove the spec against a
fresh isolated stack and the CI `e2e-ci` shard, exactly as Sprint 008's Round 0 did.

### Round 1 — Environment & release contract

| Lane | Issue | Primary file ownership | Opt. | Pess. |
|---|---:|---|---:|---:|
| A | #632 | New/updated deployment-contract documentation (environments, data policy, secrets, release identity, migration ownership, rollback semantics) | 2h | 4h |
|  |  | **Round effort** | **2h** | **4h** |

Nothing downstream in the release-pipeline chain should start implementation before this contract
is written — it is the definition every later Issue implements against.

### Round 2 — Immutable release image

| Lane | Issue | Starts after | Primary file ownership | Opt. | Pess. |
|---|---:|---|---|---:|---:|
| B | #633 | #632 | New/refactored release-build workflow, Artifact Registry publish step, frontend same-origin API config | 3h | 6h |
|  |  |  | **Round effort** | **3h** | **6h** |

### Round 3 — QA automatic deploy

| Lane | Issue | Starts after | Primary file ownership | Opt. | Pess. |
|---|---:|---|---|---:|---:|
| C | #634 | #633 | `deploy-preview.yml` refactor into a reusable QA deployment workflow, QA smoke suite | 3h | 6h |
|  |  |  | **Round effort** | **3h** | **6h** |

### Round 4 — Demo and Production (parallel)

Both Issues promote the same QA-validated digest to disjoint infrastructure (different Cloud Run
services, databases, and domains), so they run concurrently once #634 is green.

| Lane | Issue | Starts after | Primary file ownership | Opt. | Pess. |
|---|---:|---|---|---:|---:|
| D | #635 | #634 | Demo Cloud Run service/DB provisioning, `DemoSeeder`, reset workflow | 4h | 8h |
| E | #636 | #634 | Production Cloud Run service/DB provisioning, migration-release step, approval gate, rollback | 7h | 14h |
|  |  |  | **Round effort** | **11h** | **22h** |

### Round 5 — Production reliability baseline

| Lane | Issue | Starts after | Primary file ownership | Opt. | Pess. |
|---|---:|---|---|---:|---:|
| F | #637 | #636 | Backup/PITR configuration, restore-drill documentation, rollback runbook, uptime/alerting | 3h | 6h |
|  |  |  | **Round effort** | **3h** | **6h** |

## 8. Route B — Sequential Dependencies

```text
#632 (Round 1) → #633 (Round 2)
Reason: #633 builds the release image against the environment/release-identity contract #632
defines (commit-SHA + digest identity, promotion gates, migration ownership). Implementing the
build stage before that contract exists risks building on undefined semantics.

#633 (Round 2) → #634 (Round 3)
Reason: #634 must automatically deploy the exact immutable digest #633 publishes — it cannot
automate QA deployment without a release artifact to consume.

#634 (Round 3) → #635 and #636 (Round 4)
Reason: both #635 (Demo) and #636 (Production) explicitly promote "the exact immutable release
image digest that passed QA" per their own Objective/Acceptance Criteria — QA's smoke-tested green
digest is the input each of them consumes, not a fresh build.

#636 (Round 4) → #637 (Round 5)
Reason: #637 configures automated backups, a restore drill, rollback documentation, and alerting
against the real Production Cloud Run service and database #636 provisions — there is nothing to
back up or monitor until Production exists.

#613 (Round 0) → #624 (Round 0, sequenced within the round)
Reason: both touch features/inventory/transfers/components/stock-transfer-form.tsx — #613 adds the
source-availability preview (new behavior/state), #624 only translates existing copy. #624 must
rebase onto #613's merged change so its copy pass covers the new preview UI instead of conflicting
with or reverting it.
```

No other product-level dependency exists among the fifteen Issues; every Round 0 lane besides the
`#613`→`#624` pair is independent of the release-pipeline chain and of each other.

## 9. Conflict Risk Map

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|
| `features/inventory/transfers/components/stock-transfer-form.tsx` | #613, #624 | 0, 0 | #613 (behavior) lands first; #624 (copy-only) rebases after — see §8 |
| `doc/conventions/ci/pipeline.md` | #612, #638 | 0, 0 | Both are documentation-only additions to the same CI reference doc; coordinate which lands first to avoid a trivial merge conflict — no shared runtime logic |
| `.github/workflows/deploy-preview.yml` | #633 (indirectly, via same-origin API config), #634 (direct refactor) | 2, 3 | #634 owns this file's refactor; #633 only touches shared frontend/API config it depends on, not the workflow itself — sequenced by §8, not a same-round conflict |
| `.github/workflows/_api-ci.yml` | #638, #647 | 0, 0 | #647 adds a `lint` job output + an `api-junit-merge` counting step; #638 may touch the PHP setup/version steps in the same file. Neither owns the other's addition — land whichever merges first, then rebase the second onto it; the changes don't overlap line-for-line |

### Conflict methodology

Identified from each Issue's own Technical Tasks / Objective text (explicit file names for `#613`/
`#624`'s shared form, and explicit workflow-file references for `#633`/`#634`) plus the shared
target document named by `#612` and `#638`'s own Objectives. No generated dependency graph or
SonarCloud scan was needed — the Issues themselves name their file surfaces precisely enough.

## 10. Estimate Tracking by Round

Placeholder until execution starts. `Tracked` and variance columns are filled at each round
boundary (`doc/conventions/sprints.md` §10) — not held to closure.

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| 0 — Independent conflict-free work | 10 | 11.75h | 39h | — | — | — |
| 1 — Environment & release contract | 1 | 2h | 4h | — | — | — |
| 2 — Immutable release image | 1 | 3h | 6h | — | — | — |
| 3 — QA automatic deploy | 1 | 3h | 6h | — | — | — |
| 4 — Demo and Production | 2 | 11h | 22h | — | — | — |
| 5 — Production reliability baseline | 1 | 3h | 6h | — | — | — |
| **Grand total** | **16** | **33.75h** | **80h** | **—** | **—** | **—** |

```text
vs Opt.  = Tracked total − Optimistic total
vs Pess. = Tracked total − Pessimistic total
```

## 11. Consolidated Time Tracking

Placeholder until closure.

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | — | — | — |
| Implementation | — | — | — |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **—** | **—** | **—** |

### Wall-Clock Time & Parallelism

Cross-file pointer to `doc/conventions/sprints.md` §7 for the definitions and computation rules.
Computed once at closure from every Issue's `## 📅 Sessions` array.

- **Person-hours:** —
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|

## 12. Notes on Estimate Confidence

- `#632`–`#638` estimates come directly from each Issue's own `## ⏱️ Time` section as filed on
  GitHub — these are preliminary planning estimates from Issue authoring, not yet technically
  scoped by an implementing agent, and the wide optimistic/pessimistic spread on `#636` (7h/14h)
  reflects real uncertainty around first-time Production infrastructure provisioning (Cloud Run
  service, database, WIF/Secret Manager permissions, migration-release mechanism) that has no
  precedent yet in this repository.
- `#612` and `#613` both carry `Tracked: in progress` on GitHub with an empty `Sessions` array —
  this is a data-entry gap to watch, not evidence that work has actually started; verify before
  Round 0 begins.
- `#624`'s estimate is directly comparable to `#576`'s own historical actual (7h 44m tracked for
  the full state-contract + translation pass across ten screens) scaled down to a copy-only pass
  across roughly a dozen form components — moderate confidence.
- The five quarantined-spec estimates (`#536`, `#537`, `#541`, `#542`, `#557`) mirror Sprint 008's
  own four equivalents almost exactly in shape and estimate range, and three of those four came in
  well under their optimistic estimate (18–38 minutes tracked against 0.5h/3h) — moderate-to-high
  confidence these will follow the same pattern.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|

_Empty — this sprint has not started. Filled in as each Issue merges, mirroring
`doc/sprints/sprint-008-inventory-valuation-and-platform-hardening.md` §13._

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Manual/undocumented preview deploy | Only manual `deploy-preview.yml` trigger | Automated QA/Demo/Production promotion chain | — | ⏳ |
| Environments with an explicit data/secret boundary | 0 documented | 3 (QA, Demo, Production) | — | ⏳ |
| Release artifact rebuilt per environment | Yes (drift risk) | 0 (one immutable digest promoted everywhere) | — | ⏳ |
| Production backup/restore drill performed | Never | 1 successful drill documented | — | ⏳ |
| `composer.json` PHP floor vs. CI-validated runtime | Declared `^8.2`, CI validates 8.5 only | Declared floor mechanically enforced in CI | — | ⏳ |
| Quarantined Cypress specs (this sprint's five) | 5 skipped | 0 | — | ⏳ |
| Tests passing | 100% on `main` | 100% | — | ⏳ |
| New-code coverage (SonarCloud) | ≥ 80% | ≥ 80% | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

_To be completed at closure._

### 15.2 Planned vs. Actual

_To be completed at closure._

### 15.3 Known Limitations

_To be completed at closure._

## 16. Lessons Learned

_To be completed at closure._

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | — | — | — | — |

## 18. Sprint Closure Checklist

- [ ] All sixteen Issues (`#612`, `#613`, `#624`, `#632`, `#633`, `#634`, `#635`, `#636`, `#637`,
      `#638`, `#647`, `#536`, `#537`, `#541`, `#542`, `#557`) are merged and Done.
- [ ] QA, Demo, and Production each have a documented, distinct data/secret boundary and the
      release-identity contract is implemented as designed (`#632`).
- [ ] A green `main` CI run produces exactly one immutable, digest-addressable release image
      consumed unchanged by every downstream environment (`#633`).
- [ ] QA deployment is automatic, gated on deployment health checks and smoke tests, and blocks
      promotion on failure (`#634`).
- [ ] Demo is publicly reachable over HTTPS, runs the QA-validated digest, has fully isolated data/
      secrets, and can be reset deterministically (`#635`).
- [ ] Production is reachable over HTTPS, runs the QA/Demo-validated digest, migrations run as an
      explicit release step, traffic promotes only after migration + smoke success, and application
      rollback is documented and exercised (`#636`).
- [ ] Production has automated backups with documented retention, a successful non-production
      restore drill, and baseline uptime/error alerting (`#637`).
- [ ] Composer, Docker/runtime docs, and CI agree on one authoritative minimum PHP version, and a
      representative unsupported-syntax regression cannot pass CI (`#638`).
- [ ] The `attendance-close-day`, `attendance-day-status`, `employee-vacation-entitlement`,
      `employees`, and `schedule-history` quarantine guards are removed and the specs are green in
      CI (`#536`, `#537`, `#541`, `#542`, `#557`).
- [ ] No English field label, placeholder, helper text, or validation fallback remains in the
      `#624`-listed Inventory form components.
- [ ] The Stock Transfer form shows the non-authoritative source-availability preview without a
      Stock write or N+1 query (`#613`).
- [ ] A committed CI cross-mode wall-clock comparison artifact exists and is referenced from
      `doc/conventions/ci/pipeline.md` (`#612`).
- [ ] The five self-hosted CI badges (backend/frontend Lint+Test, Cypress) render correctly on the
      README from the `badges` branch, and a surface `ci.yml` legitimately skips on a given push
      leaves its existing badge untouched rather than going stale or blank (`#647`).
- [ ] Full API/webapp regression, lint, typecheck, and affected Cypress paths are green; SonarCloud
      new-code coverage ≥ 80% for every Issue.
- [ ] Architecture, CI-pipeline, and deployment documentation reflect as-built behavior.
- [ ] Estimates, tracked effort, wall-clock overlap, parallelization factor, peak concurrency,
      evidence, quality results, and lessons are consolidated (§10, §11, §14–§16 of
      `doc/conventions/sprints.md`).
- [ ] The sprint closure audit reports `PASS` (`node .github/scripts/sprint-audit/generate.js` —
      see `doc/conventions/sprint-closure-audit.md`).
- [ ] Follow-up work was created or recorded (§17).
- [ ] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created, or Sprint 009 remains current per the lifecycle
      convention.
