# 🐘 Enforce the declared PHP runtime compatibility contract in CI

**Labels:** investment: dev-platform, sprint-9

## Description

Align the repository's declared PHP compatibility contract with the runtime and CI matrix.

`code/api/composer.json` currently declares PHP `^8.2`, while the container/runtime path uses PHP 8.5 and the main API CI validates only that newer runtime. A recent Sprint 8 review already exposed a concrete risk: syntax valid on newer PHP can merge even though the package metadata claims compatibility with older supported versions.

## Reason

The declared and enforced PHP contracts have silently diverged: `composer.json` still claims
`^8.2` support, but nothing in CI or the runtime path actually exercises PHP 8.2 — only 8.5 is
validated. That gap already let PHP-8.5-only syntax merge under a package metadata claim of
8.2+ compatibility (the concrete risk Sprint 8's review surfaced), which is misleading for anyone
relying on the Composer constraint and leaves the actual minimum-supported version undocumented
and unenforced.

## Objective

Choose the authoritative PHP support policy and make CI mechanically enforce it so future code cannot drift outside the declared contract.

## Technical Tasks

- [x] Review the current API Composer PHP constraint, Docker base image, local developer runtime and GitHub Actions PHP versions.
- [x] Decide whether SushiGo Admin truly supports PHP 8.2+ or intentionally requires PHP 8.5+.
- [ ] If PHP 8.2+ remains supported, add a low-cost compatibility check/job that catches unsupported syntax/dependency drift without unnecessarily duplicating the entire CI suite.
- [x] If PHP 8.5+ is the actual contract, update Composer/docs/runtime metadata consistently and validate dependency resolution against that version.
- [x] Add Composer platform validation (`composer check-platform-reqs` / equivalent where appropriate).
- [x] Document the selected compatibility policy for contributors/agents.
- [x] Ensure the canonical CI gate fails when code/dependencies violate the selected runtime contract.

## Acceptance Criteria

- [x] Composer, Docker/runtime docs and CI agree on the minimum supported PHP version.
- [x] A representative unsupported-language-feature regression cannot pass CI while violating the declared minimum version.
- [x] Dependency/platform validation is part of automated CI.
- [x] The added check has a deliberate runtime cost and does not blindly duplicate every expensive test job.

## Out of Scope

- Upgrading Laravel or unrelated Composer dependencies.
- Supporting PHP versions older than the explicitly selected minimum.

## Investment Type

`investment: dev-platform`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `55m`

### 📅 Sessions
```json
[
  { "date": "2026-09-17", "start": "14:56", "end": "15:51" }
]
```

## 📊 Retrospective

**Tracked:** `55m` (one session, 2026-09-17 14:56–15:51) vs. **Optimistic `1h`** / **Pessimistic
`3h`** — landed right at the optimistic estimate.

Git history did most of the diagnostic work up front: #151 ("Update Docker and CI to PHP 8.5,
unify runtime environment") and #530 ("Align documentation PHP version references with the 8.5
runtime" — which explicitly called `composer.json`'s `^8.2` "deliberately out of scope") gave a
clear, already-documented trail showing PHP 8.5 was the real, unanimous runtime everywhere except
`composer.json` itself. That made the "which policy to choose" decision fast and low-risk rather
than requiring fresh investigation, and the implementation itself is small (one constraint bump,
one CI step, one TD doc, two stale-doc fixes) with no application code touched.

Most of the session's wall-clock time went to verification, not implementation: running the full
2638-test PHPUnit suite locally (~16 min), and a deliberate local proof that `composer
check-platform-reqs` actually fails when the platform requirement is violated (bumping the
constraint to an unsatisfiable `^8.9`, confirming a non-zero exit, then reverting) before trusting
the CI step to enforce anything. CI itself hit one unrelated pre-existing flake
(`ReclosePayPeriodApiTest`, a payroll/attendance test with no connection to this PR's diff) that
passed on retry — not a defect this issue introduced or needed to fix.




