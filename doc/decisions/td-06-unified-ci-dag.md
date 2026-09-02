# TD-06 · One orchestrated PR CI run with a single stable merge gate and title-driven execution modes

## Decision

PR validation is orchestrated by **one workflow**, `.github/workflows/ci.yml`, that presents the
entire quality flow as **one dependency graph in one workflow run**. It has:

- a single `analyze-pr` job — the only place path/change detection and PR execution-mode parsing
  happen;
- three reusable branches called from it — `_api-ci.yml`, `_webapp-ci.yml`, `_e2e-ci.yml`;
- two stable required checks whose names never change with internal shard counts:
  **`ci-gate`** ("did everything that ran pass?", evaluated identically in every mode) and
  **`merge-gate`** ("may this PR merge now?" — see the amendment below).

The PR execution mode comes from the PR title's optional third bracket, `[#NNN][x][<mode>]`:

| Mode | Runs | Merge-eligible |
|---|---|---|
| `[e2e-test]` | Only the Cypress specs the PR added/modified | No |
| `[wip]` | API/Webapp `lint → tests → coverage → sonar`, then **targeted** Cypress by functional impact | No |
| (no bracket) → **final** | All applicable API/Webapp branches, then the **full** Cypress suite, then `ci-gate`, then `merge-gate` | Yes |

`[e2e-test]` with zero changed specs fails loudly (`e2e-test-empty-guard`) instead of a green
no-op. `[wip]` targeted selection uses `.github/e2e-impact-map.json` and falls back to the full
suite whenever a code change matches no entry — it never runs "no E2E" for a code change. Full
reference: [`doc/conventions/ci/pipeline.md`](../conventions/ci/pipeline.md).

Branch protection depends on `ci-gate` **and** `merge-gate` (see amendment below). `deploy-preview`,
the iteration-progress badge, and WIF diagnostics stay independent workflows.

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
- **Making `ci-gate` neutral (not red) in `[wip]`/`[e2e-test]`.** Originally rejected in favour of
  an explicit red `ci-gate`. **Superseded — see amendment below:** the red `ci-gate` conflated
  "held for `[wip]`" with "a check failed", so the merge-candidacy question was split into its own
  `merge-gate` check.
- **A job-level `if:`-skipped `merge-gate`, or a `neutral` conclusion.** Rejected: GitHub's
  *passing* set for a required status check is exactly `{success, skipped, neutral}` — a skipped
  job **and** a `neutral` conclusion both let the merge through. `merge-gate` is therefore a
  Checks-API check run posted with **`action_required`** in `[wip]` / `[e2e-test]` — the
  least-alarming conclusion that is not in that passing set.

## Amendment — split the merge gate (2026-09)

`ci-gate` used to conclude **red** in `[wip]` / `[e2e-test]` "even when every check is green".
That made a `[wip]` PR indistinguishable at a glance from one with a real failing test.

The merge-candidacy question is now a **separate required check, `merge-gate`**, posted via the
Checks API (`actions/github-script`) by two jobs, last-write-wins:

- **final mode, `ci-gate` passed** → `merge-gate` = `success`
- **final mode, `ci-gate` failed**, or `analyze-pr` broke → `merge-gate` = `failure`
- **`[wip]` / `[e2e-test]`** → `merge-gate` = **`action_required`** — an "action needed" state,
  not a red failure X; blocks merge because `action_required` is not in GitHub's passing set
  `{success, skipped, neutral}`.

`merge-gate-hold` has **no `needs`** — it parses the mode from the PR title itself and posts the
`[wip]` / `[e2e-test]` verdict the instant the workflow starts; `merge-gate-report`
(`needs: analyze-pr, ci-gate`) posts the authoritative final-mode verdict. The split closes a race
where adding `[wip]` to an already-final PR — a title-only edit, no new commit — would leave the
previous `merge-gate: success` valid on that SHA for as long as it took `ci-gate` to re-run. The
residual window is the irreducible GitHub-Actions event→runner latency (~10–20s); no workflow can
flip a check in zero time.

`ci-gate` is now evaluated **identically in every mode** — green whenever the jobs that ran passed
— so a red `ci-gate` always means a real lint/test/e2e failure. Branch protection must require
**both** `ci-gate` and `merge-gate`.
