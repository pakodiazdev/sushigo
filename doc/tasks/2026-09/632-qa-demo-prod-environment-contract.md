# 🌐 Define QA, Demo and Production environment & release contract

**Labels:** investment: dev-platform, sprint-9

## Description

Define and document the canonical runtime environments and release-promotion contract for SushiGo Admin before expanding the existing manual Cloud Run preview deployment into continuous delivery.

The repository already has a working `preview` container target and a manual `deploy-preview.yml` workflow, but the roles of technical preview/QA, public demo, and real production are not yet expressed as one explicit contract. Sprint 009 will introduce all three and must keep their data, secrets, domains and deployment semantics separated.

## Reason

Sprint 009 is about to add two new deployment targets (Demo, Production) on top of the existing
manual preview workflow. Doing that without first fixing the environment contract would let each
new workflow improvise its own secret boundaries, promotion order and rollback story — exactly the
kind of silent, per-workflow drift that is hard to audit later and easy to get wrong once real
customer/business data is involved in Production. Writing the contract first means every remaining
Sprint 009 deployment issue implements against one shared, reviewed decision instead of inventing
its own.

## Objective

Establish one authoritative environment model:

| Environment | Domain | Purpose | Data |
|---|---|---|---|
| QA / Preview | `preview.sushigo-romita.com` | Technical release validation | Non-production / disposable |
| Demo | `demo.sushigo-romita.com` | Public portfolio/product demonstration | Synthetic / resettable |
| Production | `admin.sushigo-romita.com` | Real SushiGo operation | Real / persistent |

Define how a validated `main` commit is deployed to each environment without rebuilding application
code differently per deploy within any single environment's own lineage. **Final shape (revised
after initial close — see the second Retrospective entry below): QA is a manual, any-branch,
pre-merge preview tool decoupled from the automated pipeline; Demo and Production are two
independent, automatic pipelines from green `main`, each building and deploying its own distinct
image (a hardened `prod-cloudrun` target for Production, a convenience `preview` target for QA and
Demo) rather than one shared artifact promoted through all three.**

## Technical Tasks

- [x] Audit the current Cloud Run preview deployment, Artifact Registry image naming, Secret Manager usage, database configuration and custom-domain assumptions.
- [x] Document the purpose, trust boundary and data policy for QA, Demo and Production.
- [x] Define environment-specific variables/secrets and explicitly identify which values must never be shared across environments.
- [x] Define the release identity contract (commit SHA + immutable image digest) used by Demo and Production, each within its own build lineage.
- [x] Define promotion order and gates: green `main` CI → two release images (`prod-cloudrun`, `preview`) built once each → Demo and Production deploy automatically and independently; QA stays a manual, decoupled pre-merge tool, not part of this chain.
- [x] Define whether Production requires GitHub Environment approval during the initial rollout phase.
- [x] Define database migration ownership and the rule that application replicas must not independently race migrations during startup.
- [x] Define rollback semantics for application revisions separately from database migrations.
- [x] Add/update deployment documentation under the repository's canonical CI/deployment docs.

## Acceptance Criteria

- [x] QA, Demo and Production have distinct documented responsibilities, data policies and secret boundaries.
- [x] `preview.sushigo-romita.com`, `demo.sushigo-romita.com` and `admin.sushigo-romita.com` have explicit target roles.
- [x] Demo's and Production's release artifacts are each promoted unchanged within their own lineage, never rebuilt per deploy — QA is intentionally excluded from this chain as a manual pre-merge tool.
- [x] Migration, promotion, approval and rollback responsibilities are explicit enough to implement the remaining Sprint 009 deployment issues without architectural ambiguity.

## Out of Scope

- Implementing the actual deployment workflows; those are separate Sprint 009 issues.
- Provisioning real production data.
- Multi-region/high-availability architecture.

## Investment Type

`investment: dev-platform`

## ⏱️ Time

- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** `3h 27m`

```json
[
  { "date": "2026-09-15", "start": "12:20", "end": "13:24" },
  { "date": "2026-09-15", "start": "14:15", "end": "16:43" }
]
```

## 📊 Retrospective
- **Actual total:** 3h 27m (64m + 148m)
- **vs optimistic:** +1h 27m
- **vs pessimistic:** −33m

**Justification:** The first session (64m) covered the initial contract as scoped: GCP project
topology and Production's approval-gate decision were made with the project owner before the branch
existed, so writing TD-07 against a fully-resolved architecture was fast, and 8 rounds of
`@codex review` closed real correctness gaps (wrong IAM principal, misdescribed migration behavior,
missing serialization/ancestry guards, a rollback that could be silently undone, an inaccurate
health-check claim, stale docs left contradicting the contract, a missing runtime secret-access
identity) — all fixed before the issue was closed and the PR left open for final review.

**A second session (148m) followed the issue's closure, driven by further review from the project
owner of the closed contract itself** — not a defect found after the fact, but the owner rethinking
the shape of the pipeline once they saw it written down: QA should be a manual, pre-merge tool (not
an automated post-merge gate Demo/Production depend on), and Production should build from a
genuinely hardened image with the existing `devdebug`/demo-login code physically excluded at
compile time, not merely runtime-gated. That reopened and rewrote the core of TD-07 and
`deployment.md` (QA decoupled entirely; Production and Demo split into two independent pipelines
building two different Docker targets), which cascaded into updating the sprint-009 plan and four
legacy architecture docs for consistency, plus three more rounds of `@codex review` that caught a
real gap in the first draft of the rewrite (the `prod-cloudrun` target needs to be built the same
way `preview` is — the existing bare `prod` stage isn't Cloud-Run-deployable at all) and this
archived-snapshot/issue reconciliation itself. The pessimistic estimate held, barely — this is what
"the architecture materially changed after the contract was first written" costs in a decision
document, not scope creep within the original design.



