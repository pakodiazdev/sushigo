# TD-06 · One orchestrated PR CI run with a single stable merge gate and title-driven execution modes

## Decision

PR validation is orchestrated by **one workflow**, `.github/workflows/ci.yml`, that presents the
entire quality flow as **one dependency graph in one workflow run**. It has:

- a single `analyze-pr` job — the only place path/change detection and PR execution-mode parsing
  happen;
- three reusable branches called from it — `_api-ci.yml`, `_webapp-ci.yml`, `_e2e-ci.yml`;
- one stable required check, **`ci-gate`**, whose name never changes with internal shard counts.

The PR execution mode comes from the PR title's optional third bracket, `[#NNN][x][<mode>]`:

| Mode | Runs | Merge-eligible |
|---|---|---|
| `[e2e-test]` | Only the Cypress specs the PR added/modified | No |
| `[wip]` | API/Webapp `lint → tests → coverage → sonar`, then **targeted** Cypress by functional impact | No |
| (no bracket) → **final** | All applicable API/Webapp branches, then the **full** Cypress suite, then `ci-gate` | Yes |

`[e2e-test]` with zero changed specs fails loudly (`e2e-test-empty-guard`) instead of a green
no-op. `[wip]` targeted selection uses `.github/e2e-impact-map.json` and falls back to the full
suite whenever a code change matches no entry — it never runs "no E2E" for a code change. Full
reference: [`doc/conventions/ci/pipeline.md`](../conventions/ci/pipeline.md).

Branch protection depends only on `ci-gate`. `deploy-preview`, the iteration-progress badge, and
WIF diagnostics stay independent workflows.

## Justification

**Why one run instead of the previous ~6 independent workflows?**
`api-lint`, `api-swagger`, `api-tests`, `webapp-lint`, `webapp-tests` and `cypress-e2e` each showed
only a slice of the pipeline. A reviewer could not see the ordering, the fail-fast behavior, or
which branches applied to a given PR as one picture. Branch protection also required matrix-shard
context names (`webapp-tests (shard 1/4)`, …), so the merge contract broke whenever a shard count
changed — exactly the kind of internal detail a stable gate should hide.

**Why title-driven modes?**
The common case while building or fixing Cypress specs is iterating on one or two `.cy.ts` files;
paying for the whole API + Webapp + full-Cypress pipeline on every push adds little value there.
`[e2e-test]` gives a fast diagnostic loop, `[wip]` keeps full quality signal without the full
Cypress cost, and removing the bracket is the single, explicit action that makes a PR a merge
candidate. `[review]` is unnecessary because review/correction has the same CI semantics as WIP.

**Why reusable sub-workflows rather than one inline YAML?**
`api-tests.yml` alone is ~360 lines; inlining API + Webapp + E2E + analyze + gate would be an
unreviewable single file. Reusable workflows still render as one run with one expandable graph, so
"one visible DAG" holds while each surface stays independently readable and keeps its existing
shard / coverage-merge / Sonar / E2E-stack lessons (from the standalone workflows) verbatim.

**The cutover.**
The unified DAG was first proven green — the full populated graph and every execution mode
(`[e2e-test]` including its empty-guard, `[wip]`, final) exercised on live CI — and only then were
the six standalone workflows (`api-lint` / `api-swagger` / `api-tests` / `webapp-lint` /
`webapp-tests` / `cypress-e2e`) deleted and `main`'s branch protection switched to require the
single `ci-gate` context (dropping the eight shard-name / legacy contexts). `api-tests.yml`'s
`api-timing-script-tests` job moved into `ci.yml` as `scripts-tests`, gated on `.github/scripts/**`.
A documentation / non-pipeline-config-only PR (`verify_needed=false`) short-circuits `ci-gate` to a
fast green in final mode rather than running the arsenal against nothing.

## Alternatives considered

- **One monolithic `ci.yml`.** Rejected: unreviewable; no upside over reusable workflows for graph
  visibility.
- **A `[review]` mode distinct from `[wip]`.** Rejected: identical CI semantics — extra state with
  no behavior.
- **Test Impact Analysis for `[e2e-test]`.** Rejected as out of scope; `[e2e-test]` is
  deliberately the simple, deterministic "just my changed specs" loop. `[wip]` carries the
  (lightweight, glob-based) impact map instead.
- **Making `ci-gate` neutral (not red) in `[wip]`/`[e2e-test]`.** Rejected: GitHub treats a
  never-reported required check and a skipped one inconsistently; an explicit red with a clear
  "not a merge candidate" message is unambiguous.

---

## Amendment (#598) — draft status is the merge block; the title bracket only scopes CI cost

**Supersedes** the original `[wip]` / `[e2e-test]` execution-mode model above. `[wip]` and
`[e2e-test]`, the `e2e-test-empty-guard` job, the `targeted` E2E selection, and
`.github/e2e-impact-map.json` are all **removed**. (#596/#597's abandoned `merge-gate` /
`merge-gate-hold` / `merge-gate-report` approach — a green-but-merge-blocking check — is likewise
rejected: GitHub has no check state that is both green and merge-blocking, and it did nothing for
CI cost or latency.)

**New model:**

- **Merge-blocking = native GitHub draft status.** The issue slash-commands
  (`/start-issue`, `/issue`, `/issue-full`, `/issue-no-review`, `/issue-devin-interactive`) open the
  PR with `gh pr create --draft`. A draft PR cannot be merged; `ci-gate` has `if: !draft` and is
  *skipped* on it (GitHub treats a skipped required check as satisfied — the draft itself blocks the
  merge). `/finish-pr` Phase 7.5a promotes with `gh pr ready`, firing `pull_request:
  ready_for_review` and the full-regression run.

- **CI cost while iterating = an optional title modifier bracket** after `[#NNN][x]`, matched by
  content, case-insensitively:

  | Modifier | Tests |
  |---|---|
  | `[skip-ci]` | none at all (not even lint) |
  | `[ci-check]` | only the test files this PR added/modified, within touched surfaces — 1 shard, no coverage, no Sonar |
  | `[ci-check-all]` | the full suite of every touched surface + full Cypress + coverage + Sonar |
  | *(none)* | draft → `[ci-check]` · ready → `[ci-check-all]` |

  Lint + typecheck run in every mode except `[skip-ci]`. Narrowest modifier wins if several appear.
  A no-modifier **draft that changes pipeline infra** (`ci.yml`, the reusable workflows,
  `ci-analyze`, `docker/**`) is forced to `[ci-check-all]` — a shallow run would hand the reusable
  workflows empty file lists and never exercise the edited pipeline before it governs `main`. An
  explicit `[skip-ci]` / `[ci-check]` still opts out.

- **`ci-gate`** is `if: !draft`. On a ready PR it is `success` iff the effective run was full
  (`[ci-check-all]` level) and every applicable branch passed; on a ready PR whose title still
  carries `[skip-ci]` / `[ci-check]` it is `failure` with a "remove the modifier" message (the only
  `ci-gate` red that is not a real test failure — `/finish-pr` strips the modifier before promoting).

- **`/finish-pr`** promotes (`gh pr ready`) + verifies read-only — CI, the **Codex** review
  (`chatgpt-codex-connector`, body `### 💡 Codex Review`), and the **SonarCloud** quality gate — and
  reports readiness "app-doctor" style: each unmet merge requirement plus the one action that clears
  it. It never opens a browser, never checks Devin/DeepWiki, and never merges. A `BLOCKED` mergeable
  state whose sole cause is a pending required approval (`reviewDecision == REVIEW_REQUIRED`, checks
  green, threads resolved, no conflict) is reported as "all gates green — pending your approval", not
  a hard stop, so the unattended `/issue*` pipelines don't hang on it.

**Branch protection:** unchanged — still requires only `ci-gate`. No admin action beyond keeping
that one context (no `merge-gate*` context is or was added).

Canonical reference: [`doc/conventions/ci/pipeline.md`](../conventions/ci/pipeline.md) and
[`doc/conventions/git/pull-requests.md`](../conventions/git/pull-requests.md) → "PR Title CI-Cost
Modifiers".
