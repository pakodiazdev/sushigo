# CI/CD Infrastructure Requirements — SushiGo

**Version:** 1.0
**Date:** 2026-02-27
**Status:** Active
**Relates to:** Tasks #040–#046 · Architecture doc `infrastructure.en.md`

---

## PART A — Context and Justification

### 1) The problem we want to solve

SushiGo is a production platform that handles business-critical data: daily attendance records, cash sessions, and inventory movements. As the codebase grows — today with 23+ models, 40+ API endpoints, and two subprojects (API + Webapp) — the risk of shipping a regression or a formatting inconsistency increases with every pull request.

The current development process relies entirely on manual judgment: the developer reads the code, runs tests locally (or not), and decides whether to merge. This works when a single developer is always available and always disciplined — but it does not scale, it is invisible to external collaborators, and it is not portfolio-grade.

The goal of this requirements document is to define the automated quality gates that protect `main` from broken or inconsistent code, without introducing so much friction that the development cycle slows down.

---

### 2) How it works in practice

#### 2.1 On every pull request

When a developer opens or updates a pull request, **linters, tests, and SonarCloud analysis run immediately and automatically** against the changed subproject. This ensures that no regression, format violation, type error, code smell, or coverage drop can reach `main` through a pull request. The quality gate blocks the merge until all five checks pass.

Human reviewers (the developer, Dervi, and Copilot) then review the code knowing that automated quality checks have already passed — they focus on logic and architecture, not on catching issues that tools can find.

#### 2.2 Before merge — manual QA on preview

After the PR review cycle is complete and any observations are addressed, the feature branch is deployed manually to `preview.sushigo-romita.com`. This environment mirrors production (same Cloud Run infrastructure, same Supabase schema) and allows the developer to validate the feature end-to-end before authorizing the merge.

If the preview fails — a broken flow, a missing migration, a UI regression — the branch is fixed and re-deployed before the merge is authorized. This prevents "it worked locally" from becoming a production incident.

#### 2.3 After merge to `main` — production gate

Once the feature is in `main`, the same full pipeline runs again. This re-run serves as the final gate before production deployment — it catches any issue that could arise from merge conflicts or environment differences. If any step fails on `main`, the production deployment is blocked.

---

### 3) Roles and responsibilities

| Role | Responsibility |
|------|---------------|
| Developer (jfcodiaz) | Owns the PR, addresses observations, authorizes merge |
| Dervi | Reviews PR for logic errors, edge cases, and architecture alignment |
| GitHub Copilot | Automated review: code smell, security patterns, redundancy |
| CI Pipeline | Automated enforcement: format, types, tests, coverage, quality gate |

---

## PART B — Technical Requirements

> This section is the basis to configure GitHub Actions workflows, branch protection rules, and SonarCloud.

### 4) Glossary

- **Linter:** Tool that checks code for format and style violations without executing it.
- **Coverage:** Percentage of production code lines executed by automated tests.
- **Quality Gate:** A set of conditions in SonarCloud that must all pass for the analysis to be considered successful.
- **Preview environment:** A running instance of the application deployed from a feature branch, used for manual QA.
- **Quality pipeline:** The full sequence of CI steps (linters + tests + coverage + SonarCloud) that runs on every pull request (gating merge) and on every push to `main` (gating production deployment).

---

### 5) Functional Requirements (RF)

#### 5.1 Linter on pull requests

- **RF-01:** The system MUST run PHP Pint in check mode (`--test`) on every `pull_request` event and on every `push` to `main` when files under `code/api/**` have changed.
- **RF-02:** The system MUST run ESLint and TypeScript type-check on every `pull_request` event and on every `push` to `main` when files under `code/webapp/**` have changed.
- **RF-03:** A pull request MUST NOT be mergeable if any automated check (linter, tests, or SonarCloud quality gate) for the affected subproject has not completed successfully.

#### 5.2 Tests and coverage on pull requests and main

- **RF-04:** The system MUST run PHPUnit with coverage reporting on every `pull_request` event and on every `push` to `main` when files under `code/api/**` have changed. Coverage MUST be exported as `coverage.xml` (Clover format) for SonarCloud consumption.
- **RF-05:** The system MUST run Vitest with coverage reporting on every `pull_request` event and on every `push` to `main` when files under `code/webapp/**` have changed. Coverage MUST be exported in lcov format for SonarCloud consumption.
- **RF-06:** A pull request MUST NOT be mergeable if any test step has failed. Production deployment MUST NOT proceed if any test step on `main` has failed.

#### 5.3 SonarCloud quality gate on pull requests and main

- **RF-07:** Both coverage reports (PHP and JS) MUST be uploaded to SonarCloud on every `pull_request` event and on every `push` to `main`.
- **RF-08:** The SonarCloud quality gate result MUST be evaluated on every pull request (blocking merge on failure) and before the production deployment step runs on `main` (blocking deploy on failure).

#### 5.4 Branch protection

- **RF-09:** The `main` branch MUST require a pull request with at least one approved human review before merging.
- **RF-10:** The `main` branch MUST require all five status checks to pass before a pull request can be merged: `api-lint`, `webapp-lint`, `api-tests`, `webapp-tests`, and `sonarcloud`.
- **RF-11:** Approved reviews MUST be dismissed when new commits are pushed to the pull request branch.
- **RF-12:** Pull request branches MUST be up to date with `main` before merging.

---

### 6) Business Rules (RN)

#### 6.1 Trigger scope — changed paths only

- **RN-01:** Linter and test workflows MUST use path filters (`paths:`) so that a change in `code/api/**` does not trigger the webapp pipeline, and vice versa. This prevents unnecessary pipeline runs and reduces CI minutes consumed.
- **RN-02:** A PR that only changes `doc/**` or root-level files MUST NOT trigger any linter or test workflow. Infrastructure-only changes follow the same rule.

#### 6.2 Coverage thresholds

- **RN-03:** The SonarCloud quality gate MUST enforce a minimum overall coverage of **70%** for both the PHP and JS projects. This threshold may be raised as the codebase matures; it MUST NOT be lowered without a documented decision.
- **RN-04:** New code introduced in a pull request MUST maintain at least the same coverage percentage as the overall project at the time of merge. SonarCloud's "new code" gate enforces this automatically.

#### 6.3 Zero new blocker issues

- **RN-05:** The SonarCloud quality gate MUST fail if the analysis introduces **any new blocker or critical issue** (security hotspot, major bug, or critical vulnerability). Existing issues inherited from prior commits are tracked separately and resolved in dedicated tasks; they MUST NOT block new features.

#### 6.4 Required reviewers

- **RN-06:** Every pull request targeting `main` MUST be reviewed by at least **Dervi** or the lead developer before merge is authorized. Copilot review is additive — it does not satisfy the human reviewer requirement.
- **RN-07:** The developer who opens the pull request MUST NOT self-approve it as the sole approver. A second perspective is always required.

#### 6.5 Preview before merge

- **RN-08:** Before authorizing a merge to `main`, the feature branch MUST be deployed to `preview.sushigo-romita.com` and manually verified. This is a **process rule** — it is not enforced by GitHub Actions but is a team commitment. Pull requests that skip the preview step are considered incomplete.
- **RN-09:** If the preview deployment reveals a defect, the pull request MUST be updated and re-deployed to preview before the merge is authorized. The approval is invalidated by new commits (see RF-11).

---

### 7) Closed Definitions (DC)

- **DC-01 (Passing lint):** A linter step is considered "passing" when `pint --test` exits with code 0 (no format violations) and ESLint exits with code 0 (no lint errors, no TypeScript type errors). Warnings do not fail the lint step; errors do.

- **DC-02 (Passing quality gate):** A SonarCloud analysis is considered "passing" when all conditions in the configured quality gate are met: overall coverage ≥ 70%, new coverage ≥ project coverage, zero new blocker/critical issues. A "warning" status in SonarCloud is treated as "passing" and does not block deployment.

- **DC-03 (Production deployment):** A production deployment is defined as: build a production Docker image → push to Google Artifact Registry → deploy a new revision on Google Cloud Run → update the Supabase production database schema (migrations). This sequence is atomic from the pipeline's perspective — if any step fails, the previous revision remains active.

- **DC-04 (Preview deployment):** A preview deployment uses the same build process as production but targets a separate Cloud Run service and a separate Supabase database. Preview state is ephemeral — it is not guaranteed to be consistent across deployments and is not used for any data that flows to production.

- **DC-05 (Main branch):** `main` is the single source of truth for production. It is always in a deployable state. No direct commits are permitted. Every change arrives via a reviewed pull request that has passed all five automated checks: linters, tests, and SonarCloud quality gate.
