# 🚦 Draft-based PR lifecycle: draft blocks merge, title modifier scopes CI, full regression at promotion

**Labels:** investment: dev-platform, sprint-7

## Description

Replace the whole PR lifecycle around draft status and title-modifier CI scoping, so a
work-in-progress PR gives **fast, cheap feedback** and the **full regression only runs when the PR
is promoted for merge**.

Supersedes and closes **#596** (whose PR #597 is closed unimplemented — it built a `[wip]` title
bracket + a `merge-gate` check to block merges, which is the wrong mechanism: GitHub has no check
state that is both green and merge-blocking, and the approach did nothing for CI cost/latency).

### Merge blocking = draft status

- The issue slash commands (`/start-issue`, `/issue`, `/issue-full`, `/issue-no-review`,
  `/issue-devin-interactive`) open the PR with `gh pr create --draft`. **No `[wip]` bracket.**
- A draft PR cannot be merged (native GitHub) — all checks render normally (green when they pass),
  the merge button is disabled with "Draft — cannot be merged". No red, no `merge-gate` check.
- `/finish-pr` promotes with `gh pr ready <N>` (Phase 7.5a), which fires `ready_for_review` and the
  full-regression CI run.

### CI cost control = title modifier

`analyze-pr` reads `github.event.pull_request.draft` and an optional title modifier bracket
(matched by content, case-insensitive, same style as the retired `[wip]`). Lint + typecheck run
in every mode except `[skip-ci]`. Surface scoping is unchanged (`api-ci` runs iff `code/api/**` or
infra changed, `webapp-ci` likewise).

| Modifier | Tests that run |
|---|---|
| `[skip-ci]` | none at all |
| `[ci-check]` | only the test files **this PR added/modified** (PHPUnit `*Test.php`, Vitest `*.test.ts(x)`, Cypress `*.cy.ts`) within touched surfaces |
| `[ci-check-all]` | the **full suite** of each touched surface (api and/or webapp) + full Cypress |
| *(no modifier)* | draft → same as `[ci-check]`; ready → same as `[ci-check-all]` |

### `ci-gate` — the single required check

- `if: !draft` — skipped on drafts (the draft itself blocks the merge; a skipped required check
  counts as passing, which is fine because merge is blocked anyway).
- On a **ready** PR: `success` iff the effective run was full (`[ci-check-all]` level) and every
  applicable branch job passed.
- On a **ready** PR whose title still carries `[skip-ci]` or `[ci-check]` (a shallow / suppressed
  run): **`failure`** with a message. `/finish-pr` documents this in its report and instructs:
  *"remove the `[skip-ci]` / `[ci-check]` modifier from the title to run the full regression and
  enable the merge."* This is the only case a `ci-gate` red is not a real test failure, and it is
  self-inflicted and clearly explained.

### `/finish-pr` — promoter + verifier (carried over from #597's better half)

- Phase 7.5a: strip any `[skip-ci]` / `[ci-check]` / `[ci-check-all]` from the title, `gh pr ready
  <N>`, then wait for the full-regression run.
- Phase 0: a draft PR is now the **expected** input, not a stop.
- Phase 7.6b: read the **Codex** review (`chatgpt-codex-connector`, body `### 💡 Codex Review`) on
  the merge-ready commit and the **SonarCloud** quality-gate checks — no browser automation, no
  assumed Copilot review, no Devin/DeepWiki SPA. Post one `@codex review` and wait (bounded) only
  if the latest review predates the squash.
- Phase 7.6a: poll a plain `gh pr checks` until the run registers before the blocking `--watch`
  ("no checks reported" right after a push is not a green result).
- Phase 1b / 7.6c: a `BLOCKED` mergeable state whose sole cause is a pending required approval
  (`reviewDecision == REVIEW_REQUIRED`, checks green, no conflict, threads resolved, not
  `CHANGES_REQUESTED`) is reported as "all gates green — pending your approval", not a hard stop;
  the `/issue*` pipelines rely on this since they run unattended.
- Phase 8: "app-doctor" report — names each unmet merge requirement and the one action that clears
  it; `/finish-pr` fixes nothing and never merges.

## Reason

The `e2e-ci` full Cypress suite (6 shards, ~6–8 min each) plus the PHPUnit/Vitest shards make PR
feedback slow and expensive on **every push**, while iterating. The developer wants to:

- push scaffolding / docs / review-only changes with **no CI** (`[skip-ci]`);
- iterate with **only the tests they touched** running (`[ci-check]`, the draft default) for a
  fast loop;
- optionally run the **full surface suite early** (`[ci-check-all]`) before promoting;
- have the **full regression run exactly once**, at promotion, and gate the merge on it.

Draft status is GitHub's native "work in progress, do not merge" signal — it disables the merge
button cleanly with every check still rendering green. Re-implementing that with a title bracket
and a required check (#596/#597) added a permanently-red or non-blocking check and no speed win.

## Objective

A PR lifecycle where merge-blocking is draft status, CI cost while iterating is the developer's
explicit choice via one title modifier, the full regression runs once at promotion, and
`/finish-pr` promotes + verifies (Codex + Sonar) + reports readiness without ever merging.

## Technical Tasks

- [x] `analyze-pr`: output `is_draft`; parse `[skip-ci]` / `[ci-check]` / `[ci-check-all]` from the
      title; for `[ci-check]` (and the draft default) compute the changed test files per surface
      and the changed `.cy.ts` list from the PR diff.
- [x] `_api-ci.yml` / `_webapp-ci.yml`: accept a test-scope input — an explicit file list
      (`php artisan test <files>` / `npx vitest run <files>`) vs `full`; skip coverage + Sonar
      when the scope is not `full`.
- [x] `_e2e-ci.yml`: reuse the existing `pr-specs` selection for `[ci-check]` / draft default;
      `full` for `[ci-check-all]` / ready.
- [x] `ci.yml`: `on: pull_request: types` gains `ready_for_review` + `converted_to_draft`;
      `ci-gate` becomes `if: !draft` with the shallow/suppressed-run → `failure` rule; **remove**
      `merge-gate`, `merge-gate-hold`, `merge-gate-report`, `e2e-test-empty-guard`, and the
      `[wip]` / `[e2e-test]` handling.
- [x] `parse-mode.js` (+ its tests): replace `[wip]` / `[e2e-test]` parsing with the new modifiers.
- [x] `/start-issue`, `/issue`, `/issue-full`, `/issue-no-review`, `/issue-devin-interactive`:
      `gh pr create --draft`, no `[wip]` in the title; a first push of pure scaffolding may carry
      `[skip-ci]`.
- [x] `/finish-pr`: Phase 7.5a → strip modifiers + `gh pr ready`; Phase 0 → draft is expected;
      keep the Codex+Sonar 7.6b, the 7.6a check-registration guard, the 7.6c approval carve-out,
      and the app-doctor Phase 8 report from #597.
- [x] Docs: rewrite the execution-mode section of `doc/conventions/git/pull-requests.md`; update
      `doc/conventions/ci/pipeline.md`, `CLAUDE.md`; add a TD-06 amendment (supersede the
      `merge-gate` amendment).

## Acceptance Criteria

- [x] A PR opened by any of the five commands is a **draft**; its checks render green when they
      pass and the merge button is disabled with "Draft cannot be merged" (no red check).
- [x] Draft, no modifier → only the PR's own changed test files + changed Cypress specs run;
      no full suite, no coverage, no Sonar.
- [ ] `[skip-ci]` → no test job runs, in draft or ready.
- [x] `[ci-check-all]` in draft → full surface suites + full Cypress run.
- [ ] `gh pr ready` (or `/finish-pr` Phase 7.5a) triggers the full-regression run; `ci-gate` is
      `success` only after that run passes.
- [ ] Ready PR still carrying `[skip-ci]` / `[ci-check]` → `ci-gate` `failure` with the "remove
      the modifier" message, echoed in `/finish-pr`'s report; no other `ci-gate` red is anything
      but a real failure.
- [x] `merge-gate*`, `[wip]`, `[e2e-test]`, `e2e-test-empty-guard` are gone from `ci.yml` and the
      docs.
- [x] `/finish-pr` promotes (`gh pr ready`), verifies CI + Codex + Sonar read-only, and reports
      readiness "app-doctor" style — never merges, never opens a browser.

## Out of Scope

- "Tests that *cover* changed source" (impact analysis) — `[ci-check]` runs only test files that
  literally appear in the diff. Coverage-based test selection is a later enhancement.
- Any change to branch-protection required checks beyond dropping `merge-gate` and keeping
  `ci-gate` (the admin action is noted in the PR).

## Investment Type

`investment: dev-platform`

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `4h` · **Pessimistic:** `10h` · **Tracked:** _not started_

### 📅 Sessions

```json
[
  { "date": "2026-09-03", "start": "10:08", "end": "10:34" },
  { "date": "2026-09-03", "start": "10:50", "end": "15:17" }
]
```


## 📊 Retrospective

**Tracked:** `4h53m` (2 sessions)
- 2026-09-03 10:08–10:34 — `26m` — `/issue-no-review` run: context, plan, TDD of the ci-analyze
  modules, all workflow + command + doc edits, draft PR #602, first draft CI green. Stopped at
  `finish-pr` Phase 1a on Copilot/Codex auto-review threads (the expected `/issue-no-review`
  terminal state).
- 2026-09-03 10:50–15:17 — `4h27m` — review-response cycle: 8 findings addressed across two fix
  commits (`35c8b748` Codex threads: skipped-check tolerance, deleted-spec handling, `gh api`
  pagination, N/A states, `mergeable`-enum conflict check, approval carve-out, `sleep` perm;
  `c625ba13` infra-scope override), each with new tests and docs; a full `[ci-check-all]` draft CI
  run (4+4 test shards, coverage, both SonarCloud quality gates, 6 Cypress shards) to exercise the
  new full paths; then this `/finish-pr` close-out.

**Variance:** `+53m` over the `4h` optimistic; `-5h07m` under the `10h` pessimistic.

**Why it landed where it did.** The core implementation matched the optimistic estimate — the issue
was well-specified, and only `parse-mode.js` was locally testable so the design work was
front-loaded and clean. The overrun is entirely the review-response cycle: eight distinct
correctness findings, several structural (a P1 that `finish-pr` 7.6a would have stopped every
scoped PR by treating a legitimately skipped branch as a failure; a deletion-only PR failing draft
CI; draft infra changes never exercising the pipeline they edit). Each needed a real fix plus
tests plus doc updates, not a one-liner. Wall-clock also absorbed multiple full CI cycles: the
final `[ci-check-all]` validation run alone was ~19 minutes (6 Cypress shards), and it was the
first end-to-end proof that both the shallow `[ci-check]` and full `[ci-check-all]` scopes of the
new reusable-workflow plumbing actually work on live CI. Two ACs (`[skip-ci]` runs nothing; a
ready PR keeping a shallow modifier turns `ci-gate` red) remain for a deliberate follow-up test —
they are `if`-gate behaviors not reachable from this PR's own run without deliberately mis-titling
a promotion.

