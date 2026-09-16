# 📦 Build per-environment immutable release images after green main CI

**Labels:** investment: dev-platform, sprint-9

## Description

Create the release-build step(s) that turn a validated `main` commit into the immutable container artifacts each automated environment pipeline deploys, per [TD-07](../decisions/td-07-environment-release-promotion-contract.md) (accepted via #632).

Today CI validates `main`, while `deploy-preview.yml` independently builds a `preview`-target image on manual dispatch. TD-07 keeps that manual QA path decoupled and untouched (#634), but Demo (#635) and Production (#636) each need their own automated, build-once-per-commit image so neither environment silently reverts to rebuilding a different artifact per deploy.

**Design correction (2026-09-15):** an earlier draft of this issue assumed *one* universal image promoted unchanged through QA → Demo → Production. TD-07 explicitly rejected that model — see "Alternatives considered" in `doc/decisions/td-07-environment-release-promotion-contract.md`. There are **two** build targets, each producing its own image and its own digest from the same commit:

| Target | Consumed by | Contains devdebug/demo-login |
|---|---|---|
| `preview` (existing) | QA (manual, #634 — unaffected by this issue) and Demo (automated, #635) | Yes |
| `prod-cloudrun` (new, created by this issue) | Production (automated, #636) | No |

## Objective

After the canonical CI workflow (`ci-gate`) succeeds on `main`, build each target's image exactly once per commit, publish it to Artifact Registry with a commit-SHA identity, capture its digest, and make that digest the authoritative input for that target's downstream deployment workflow (#635 for `preview`/Demo, #636 for `prod-cloudrun`/Production). QA (#634) is intentionally outside this chain — it keeps building on manual dispatch, as today.

## Technical Tasks

- [x] Add a new Docker stage `prod-cloudrun` (built like `preview`: webapp build, unified Apache vhost, Cloud Run entrypoint) that excludes the devdebug/demo-login code entirely:
  - [x] Extract the inline dev-route block in `code/api/routes/api.php` into `routes/api/dev.php`, keeping the `environment()` check and adding a `file_exists()` guard around the `require` (unlike every other route group's unconditional require) so `prod-cloudrun`'s build — which physically removes the file — doesn't fatal `php artisan route:cache` at boot.
  - [x] Exclude `app/Http/Controllers/Api/V1/Dev/`, `app/Support/DevLoginGuard.php`, and the extracted `routes/api/dev.php` from what `prod-cloudrun`'s build copies.
  - [x] Split the shared `node_builder` webapp build stage into two target-specific build stages (`prod-cloudrun` vs `preview`), each setting `VITE_LOGIN_WITH_DEVDEBUG` accordingly, so Production's bundle never ships the demo-login UI. *(Implemented as one parameterized `node_builder` stage built via two separate `docker build --target` invocations, each passing its own `VITE_LOGIN_WITH_DEVDEBUG` build-arg — same per-target build isolation, no shared webapp build feeds both targets in a single build graph; see `## 🤔 Assumptions` on the PR.)*
- [x] Add/refactor a release-build workflow (reusable, parameterized by target: `preview` | `prod-cloudrun`) that runs only after `ci-gate` succeeds on `main`.
- [x] Checkout the exact successful `main` commit SHA rather than whatever happens to be HEAD at execution time.
- [x] Build each target's production-capable Docker image and push an immutable SHA tag to Artifact Registry — once per target per commit, never rebuilt per deploy.
- [x] Capture and expose each target's resulting image digest as a workflow output for #635/#636 to consume.
- [x] Stop using `latest` or an environment-specific rebuild as the authoritative release identity for either target.
- [x] Confirm the frontend build-time API URL stays same-origin/relative (`/api/v1`, already the case for `preview` via the existing `API_URL_PREVIEW` var) for both targets — no environment-specific absolute URL baked into either image.
- [x] Add release metadata to the GitHub Actions summary per target built (commit SHA, image tag, digest, workflow/run link).
- [x] Preserve `deploy-preview.yml`'s manual entry point untouched — it keeps building `preview` on demand for QA and must not be folded into this release-build trigger.

## Acceptance Criteria

- [x] A green `main` CI run produces exactly one `preview`-target image and one `prod-cloudrun`-target image (not one shared image for all three environments).
- [x] Each image is traceable to the exact Git commit SHA and immutable digest.
- [x] #635 (Demo) and #636 (Production) can each deploy their own digest without rebuilding application code.
- [x] `prod-cloudrun`'s binary (backend and frontend) does not contain the devdebug/demo-login code at all.
- [x] A failed CI run cannot publish/promote either release image.
- [x] QA's existing manual `deploy-preview.yml` flow is unaffected by this workflow.

## Out of Scope

- Actual QA/Demo/Production deployment logic (see #634/#635/#636).
- Creating application releases/tags for every merge unless needed by the implementation.
- Per-environment ancestry/watermark guards (owned by #635/#636, since they gate the deploy chain, not the build).

## Investment Type

`investment: dev-platform`

## ⏱️ Time

- **Optimistic:** `3h`
- **Pessimistic:** `6h`
- **Tracked:** `9h13m`

```json
[
  { "date": "2026-09-15", "start": "17:15", "end": "18:14" },
  { "date": "2026-09-15", "start": "18:20", "end": "23:22" },
  { "date": "2026-09-16", "start": "10:30", "end": "12:43" },
  { "date": "2026-09-16", "start": "12:43", "end": "13:42" }
]
```

## 📊 Retrospective

**Actual total: 9h13m** (session 1: 59m — implementation, local verification, PR creation, CI
green; session 2: 5h02m — first `/pr-comments` review cycle, a self-caught correction, a CI flake,
and a rebase; session 3: 2h13m — a second `/pr-comments` review cycle plus real, running
end-to-end verification of both images, requested explicitly before closing the issue; session 4:
59m — a `/finish-pr` re-run that caught one more real Codex finding, requiring an actual Dockerfile
restructure, not just a reply).

- **Optimistic (3h) vs actual (9h13m): +6h13m (+207%).** **Pessimistic (6h) vs actual: +3h13m
  (+54%)** — genuinely, substantially over both estimates.
- Session 1 alone (59m) would have landed comfortably under the optimistic estimate — the core
  implementation (new `prod-cloudrun` Docker stage, the `routes/api/dev.php` extraction, the
  reusable `_release-build.yml` workflow, wiring into `ci.yml`) was straightforward once the issue
  itself had been correctly re-scoped against TD-07 before work started.
- Session 2's overrun was review depth, not rework of the core design: Codex's first round raised
  two real findings — one quick fix, one I initially misjudged as a false positive and had to
  correct after an actual Docker rebuild-and-grep cycle proved it real — plus a third, cheap
  path-filter fix, one unrelated pre-existing flaky test (`ReclosePayPeriodApiTest`, confirmed
  passing in isolation, cleared by a re-run), and one rebase.
- Session 3 had two distinct drivers, both legitimate:
  - `/finish-pr`'s own pre-flight check caught **two more** fresh Codex findings that had landed
    mid-close-out (a real cancel-in-progress bug that could drop a release image, and an unsafe
    `APP_ENV=devtest` recommendation of my own that would have over-exposed the public Demo
    backend). Both were real, both got fixed and documented, not dismissed.
  - The user explicitly asked, before accepting the issue as closed, for the images to actually be
    built and **run** locally end-to-end — not just statically inspected — including a second
    round so they could open both in a browser themselves. This caught a testing-setup mistake of
    my own (wrong port mapping) and produced much stronger evidence than the static checks alone:
    real HTTP 404s on `prod-cloudrun`'s dev routes and a real working dev-login picker on
    `preview`, against a genuinely migrated database.
- Session 4's finding was the most substantive of the whole review cycle: `prod-cloudrun`'s
  exclusion was implemented as a `RUN rm` on top of a stage that already had the full,
  unfiltered API tree baked into an earlier layer — a real Docker anti-pattern (a whiteout hides
  files from the runtime merged view but leaves them fully recoverable from the published image's
  earlier layers). This directly contradicted one of this issue's own Acceptance Criteria
  ("`prod-cloudrun`'s binary does not contain the devdebug/demo-login code at all"), which had
  been ticked based on runtime testing alone — a real, not cosmetic, verification gap. Fixed by
  restructuring the Dockerfile so `prod-cloudrun` never extends `prod` at all (a new shared
  `prod_base` stage plus a standalone filtered-source stage, consumed via `COPY --from`, which
  copies filesystem state rather than layer history), then verified by extracting every layer of
  the actual built image and confirming none of them contain the excluded code.
- No scope changes were requested mid-flight in the sense of "build something different" — every
  extra cycle here was either genuine review depth (five real Codex findings addressed correctly
  across three rounds, one path-filter gap closed), the user's reasonable insistence on running
  proof over static proof before sign-off, or one external flake. None of it was rework caused by
  a wrong initial design — but the layer-whiteout finding is a reminder that "the running
  container doesn't expose X" and "the published image doesn't contain X" are different claims,
  and this issue's own Acceptance Criteria asked for the second, stronger one.






