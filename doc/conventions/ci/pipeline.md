# PR CI Pipeline — one visible quality-gate DAG

SushiGo's PR validation is orchestrated by a single workflow, **`.github/workflows/ci.yml`**, so the
whole quality flow — its ordering, its fail-fast behavior, and which branches applied — is visible
as **one dependency graph in one workflow run**. See
[TD-06](../../decisions/td-06-unified-ci-dag.md) for the decision record.

`ci.yml` is the **only** PR-validation workflow. The old standalone `api-lint.yml` /
`api-swagger.yml` / `api-tests.yml` / `webapp-lint.yml` / `webapp-tests.yml` / `cypress-e2e.yml`
were removed, and `main`'s branch protection requires the single context **`ci-gate`** (nothing
else). The `_api-ci.yml` / `_webapp-ci.yml` / `_e2e-ci.yml` files are `workflow_call` reusables that
keep each surface's step order and quality logic isolated — they are not separate runs.

---

## The one DAG

```mermaid
flowchart TD
    PR[pull_request / push to main] --> A[analyze-pr]
    A --> DRAFT{draft?}
    A --> SCOPE{title modifier<br/>+ draft default}

    SCOPE -->|skip-ci| NADA[nothing runs]
    SCOPE -->|ci-check / draft default| AQ{api changed?}
    SCOPE -->|ci-check-all / ready default| AQ

    AQ -->|yes / infra| ACI["api-ci: swagger + lint → phpunit → [coverage → sonar]"]
    A --> WQ{webapp changed?}
    WQ -->|yes / infra| WCI["webapp-ci: lint + typecheck → vitest → [coverage → sonar]"]

    ACI --> E2E["e2e-ci — pr-specs (ci-check) | full (ci-check-all/ready)"]
    WCI --> E2E
    E2E --> GATE[ci-gate]

    DRAFT -->|yes| SKIP[ci-gate SKIPPED — draft blocks the merge]
    DRAFT -->|no| GATE
    GATE -->|full run, all green| MERGEOK[merge candidate — manual review]
    GATE -->|ready but shallow modifier| REDMOD[RED — remove the modifier]
```

`coverage → sonar` and the 4-shard split run **only** on a full-scope run (`[ci-check-all]` or a
ready PR); a `[ci-check]` / draft-default run is 1 shard, just the PR's own changed test files, no
coverage, no Sonar. See [E2E selection](#e2e-selection) below.

---

## Draft status + CI-cost modifiers

**Merge-blocking is native GitHub draft status** (#598). A draft PR cannot be merged; `ci-gate` is
*skipped* on it (a skipped required check counts as satisfied). Promote with `gh pr ready` (the
`pull_request: ready_for_review` trigger re-runs CI as the full regression); `/finish-pr` Phase
7.5a does this after stripping any modifier from the title.

Independently, an **optional CI-cost modifier bracket** in the PR title — after `[#NNN][x]`, from
the **title only, never the branch name** (canonical reference:
[`pull-requests.md`](./../git/pull-requests.md) → "PR Title CI-Cost Modifiers") — scopes how much
runs while iterating. Lint + typecheck run in every case except `[skip-ci]`.

| Title | Tests that run | `ci-gate` |
|---|---|---|
| `… [#123][a][skip-ci] - …` | nothing at all (not even lint) | skipped (draft) · **red** "remove the modifier" (ready) |
| `… [#123][a][ci-check] - …` | only the test files this PR added/modified, 1 shard, no coverage, no Sonar | skipped (draft) · **red** "remove the modifier" (ready) |
| `… [#123][a][ci-check-all] - …` | full surface suites + full Cypress + coverage + Sonar | skipped (draft) · **green** iff every branch passed (ready) |
| `… [#123][a] - …` (no modifier) | draft → `[ci-check]` (**infra change → `[ci-check-all]`**) · ready → `[ci-check-all]` | skipped (draft) · **green** iff full run passed (ready) |

`[review]` is intentionally **not** a modifier: review/correction uses the draft default. If
several modifiers appear, the **narrowest wins**: `[skip-ci]` > `[ci-check]` > `[ci-check-all]`.

Changed surfaces (`api`, `webapp`) and the cost modifier are **independent dimensions** — a draft
PR that only touched `code/webapp/**` runs `webapp-ci` (changed scope) + its changed Cypress specs
and skips `api-ci`.

### Title / draft-state edits

`ci.yml` triggers on `pull_request` `edited` (title modifier transitions) and `ready_for_review` /
`converted_to_draft` (the draft↔ready transition). `analyze-pr` is cheap and every heavy branch
re-gates on `api_changed` / `webapp_changed` / `infra_changed` and the effective scope, so nothing
expensive runs unless the diff warrants it; `concurrency` supersedes the previous run either way.

`api-ci` runs when the run is not `[skip-ci]` and (`api_changed` **or** `infra_changed`);
`webapp-ci` likewise with `webapp_changed`. `infra_changed` is the `analyze-pr` `infra` filter over
`docker-compose*.yml`, `docker/**`, `ci.yml`, the three reusable workflows, and
`.github/scripts/ci-analyze/**` — a change there must exercise the branches it governs, or
`ci-gate` could pass on an untested pipeline change. So `infra_changed` also **overrides the draft
default to `full` scope** (unless the title carries an explicit `[skip-ci]` / `[ci-check]`): an
infra change runs the full surface suites + full Cypress + Sonar even on a draft, since a shallow
run would hand the reusable workflows empty file lists and prove nothing about the pipeline edit.

---

## Quality order & fail-fast

Inside `api-ci` (`_api-ci.yml`):

```
swagger-validate ─┐
                  ├─► phpunit shards ─► coverage-merge ─► api-sonar
lint ─────────────┘                └─► junit-merge (timing summary — never a gate)
```

`api-junit-merge` (`_api-ci.yml`) and `cypress-timing` (`_e2e-ci.yml`) are reporting-only jobs with
**job-level** `continue-on-error: true` — so *any* failure inside them (a missing/failed artifact
download, the timing generator crashing) never fails `api-ci` / `e2e-ci` / `ci-gate`. Nothing gates
on a summary.

- **lint and Swagger generation both block PHPUnit.** A Pint failure or an invalid OpenAPI
  annotation stops the API branch before the shard matrix (and its Postgres containers) starts.
- On a **full-scope run only**, `coverage-merge` runs if every shard passed and `api-sonar` runs
  if `coverage-merge` passed. On a `[ci-check]` / draft-default run there is no `coverage-merge`
  and no `api-sonar` — just lint, swagger, and the PR's own changed `*Test.php` on one shard.

Inside `webapp-ci` (`_webapp-ci.yml`): `lint + typecheck → vitest → [coverage-merge → webapp-sonar]`,
same gating and the same full-scope-only coverage/Sonar.

`e2e-ci` runs **after** every applicable `api-ci` / `webapp-ci` branch has passed (or was skipped
because its surface wasn't touched).

| Case | Failure | Effect |
|---|---|---|
| any | API/Webapp lint fails | Tests don't run. |
| any | Tests fail | Coverage / Sonar don't run. |
| full run | Sonar fails | E2E doesn't run. |
| draft | any branch fails | `ci-gate` is skipped anyway (draft blocks the merge); fix and re-push. |
| ready, full | any applicable branch fails | `ci-gate` red. |
| ready, full | every applicable branch green | `ci-gate` green → manual review / merge. |
| ready, shallow modifier still on title | — | `ci-gate` red: "remove the modifier". |

---

## E2E selection

The effective E2E intent comes from `parse-mode.js`'s `resolveCi().e2eIntent` and
`select-e2e.js` maps it against the PR's changed files:

### `pr-specs` — exact PR Cypress files (draft default / `[ci-check]`)

```
pr_cypress_specs = Cypress specs added or modified by this PR
```

Deterministic, no impact analysis. **Zero changed specs → no E2E runs** (not a failure — the
retired `[e2e-test]` empty-guard is gone). A spec the PR **deleted** is dropped from the changed
list by `analyze-pr` (it's no longer in the checkout), so a deletion-only PR resolves to `none`
rather than selecting a `pr-specs` run that `_e2e-ci.yml` couldn't resolve. The reusable
`_e2e-ci.yml` is only called when `analyze-pr` resolved a non-`none` selection.

### `full` — the whole suite (ready default / `[ci-check-all]`)

The entire `cypress/e2e/**/*.cy.ts` set, split across 6 shards, run whenever any `code/**` file,
any changed `.cy.ts`, or pipeline/E2E infra changed; else no E2E. `_e2e-ci.yml`'s `plan` job fails
closed if a `full` selection ever resolves **zero** specs (a removed spec, an empty `cypress/e2e/`
directory) — `ci-gate` must never approve an E2E run that executed nothing.

There is no `targeted` selection and no `.github/e2e-impact-map.json` any more — both were tied to
the retired `[wip]` mode (#598).

---

## `ci-gate` — the one stable required check

`ci-gate` is the single context branch protection points at. Its name never changes, so changing a
shard count inside `_api-ci.yml` / `_webapp-ci.yml` / `_e2e-ci.yml` never requires a
branch-protection edit.

- **`if: !draft`** — skipped entirely on a draft PR. GitHub treats a skipped required check as
  satisfied; the draft status itself is what blocks the merge.
- **Fails closed**: if `analyze-pr` did not succeed (change detection itself broke), `ci-gate` is
  red regardless of anything else.
- **Ready PR still carrying `[skip-ci]` / `[ci-check]`** → **red** with "remove the `[skip-ci]` /
  `[ci-check]` modifier from the title to run the full regression and enable the merge". This is
  the only `ci-gate` red that is not a real test failure. `/finish-pr` Phase 7.5a strips the
  modifier before `gh pr ready`, so the promotion path never hits it.
- **Ready PR, full run** → green only when every applicable branch is `success` or legitimately
  `skipped` (surface not touched). A documentation / non-pipeline-config-only PR short-circuits to
  a fast green.

---

## Documentation / config-only PRs

`analyze-pr` computes `verify_needed` = "did this PR touch **any** `code/api/**`, `code/webapp/**`,
pipeline-infra (`docker/**`, `ci.yml`, the reusable workflows, `ci-analyze`), or `.github/scripts/**`
file?". When it is **false** — a PR that changed only `doc/**`, `*.md`, `LICENSE`, an operational
workflow like `deploy-preview.yml`, etc. — every heavy branch already gates itself off, and on a
**ready** PR `ci-gate` short-circuits to a fast green ("documentation/config-only PR — nothing to
verify"). `verify_needed` is computed by `.github/scripts/ci-analyze/verify-scope.js` and
unit-tested.

## `scripts-tests`

A change under `.github/scripts/**` (and the run is not `[skip-ci]`) runs `scripts-tests` —
`node --test` for the test-timing report helpers, the `ci-analyze` module, and the sprint-audit
module. It is the only branch a test-timing-only change triggers (it does **not** pull in
`api-ci` / `webapp-ci` / `e2e-ci`). This replaces `api-tests.yml`'s old `api-timing-script-tests`
job.

---

## What stays independent

`deploy-preview.yml`, `update-iteration-progress.yml` (badge), and `wif-smoke-test.yml` are
operational workflows, not PR validation — they are **not** part of this DAG and remain
independently runnable.

---

## Local commands

The pipeline runs the same commands you run locally in dev-lab (see the workspace `CLAUDE.md`):

```bash
cd code/api    && ./vendor/bin/pint --test && php artisan l5-swagger:generate && php artisan test --coverage
cd code/webapp && npm run lint && npm run typecheck && npx vitest run --coverage
make cypress-run WORKSPACE=sushigo-a          # full Cypress suite
node --test .github/scripts/ci-analyze/tests/*.test.js   # the analyze-pr logic
```
