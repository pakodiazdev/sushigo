---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh pr comment:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh api:*), Bash(gh project:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git status:*), Bash(git branch:*), Bash(git merge-base:*), Bash(git reset:*), Bash(git rebase:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(date:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Bash(cd:*), Bash(sort:*), Bash(diff:*), Bash(cp:*), Bash(tail:*), Bash(wc:*), Read, Edit, Write, WebFetch
description: Validate a PR is ready to merge and perform the final housekeeping (squash commits, finalize the issue in place, archive it locally, update the sprint doc's per-issue row, move the issue to Done) — never merges automatically
argument-hint: [pr-number]
---

# Finish PR — #$ARGUMENTS

You are closing out a GitHub Pull Request for the SushiGo monorepo: verifying it is actually ready
to merge, then doing every piece of bookkeeping a human would otherwise have to do by hand before
merging — **except the merge itself**.

**Call this only after the review — manual or automated — has left the PR ready.** Your job is
verification plus paperwork, "app-doctor" style: confirm review threads and mergeable state,
finish the bookkeeping — squash the branch to one commit, finalize the GitHub issue itself (time
tracking, checklist, retrospective), archive it locally as a closing snapshot, move the issue to
Done on the project board, and update the sprint document's own row for this issue — then
**promote the PR out of `[wip]`** (Phase 7.5a strips the execution-mode bracket) and, only after
that, check the final-mode CI run, the Codex review, and the SonarCloud quality gate once against
the commit that push produced. Doing it in that order (paperwork before the final CI check, not
after) means Phases 2–6 add no restarts at all, since they only commit locally — the only push
whose result actually gets checked is Phase 7.5's. A pre-flight rebase (Phase 1b) or a late rebase
(Phase 7.6c) still pushes and still restarts CI and the Codex re-review, same as any other push to
the branch, but that restart is irrelevant: nothing reads its result before Phase 7.5 pushes again
anyway. You **do not fix anything** — if a merge requirement is unmet, you report exactly what and
stop. You report a checklist at the end. **You never run `gh pr merge`.** The user merges by hand
once your report says everything is green.

Per [TD-01](../../doc/decisions/td-01-single-source-issue-tracking.md), the GitHub issue is the
only live document for this work up to this point — nothing under `doc/tasks/` exists yet for it.
This command is the **only** place that creates the local archive, and it does so exactly once,
after the issue itself is fully finalized.

### Safe working-directory rule for file-list captures

Every `git diff ... | sort > /tmp/finish-pr-...` capture below must run from the correct
`workspaces/sushigo-<x>` clone. Resolve the expected clone from the active `/finish-pr` session and
the PR's `headRefName`, then change to that known path in a **standalone Bash tool call with no pipe
or redirection**. Do not use `git rev-parse --show-toplevel` to discover the clone before entering
it: from the dev-lab root or another repository, that would resolve the wrong toplevel.

```bash
cd <expected-workspace-root>
```

In another standalone call, verify that the directory is the expected clone and has the PR branch
checked out before capturing anything:

```bash
git rev-parse --show-toplevel
git branch --show-current
```

Only after that call succeeds, run the capture in a second Bash tool call. Never construct
`cd <dir> && git diff ... > /tmp/...` (and never hide the same combination behind `git -C` in the
redirecting call): Claude Code's safety classifier correctly requires manual approval for that
compound shape. Keeping directory selection and output redirection in separate tool calls preserves
the zero-interruption contract without weakening permissions.

Every file-list capture uses the three-dot form
`git diff origin/<baseRefName>...HEAD --name-only`. Three dots compare `HEAD` with the merge base,
so files changed only on an advancing base branch never pollute the PR's file list. Do not replace
it with the two-endpoint form `git diff origin/<baseRefName> HEAD`: Phase 1b and Phase 7.6c can
rebase onto a newer base between captures, and two-endpoint lists are not stable across that move.

---

## PHASE 0 — Resolve the PR and the linked issue

```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
```

Resolve the PR number:
- If `$ARGUMENTS` is a number, use it directly.
- Otherwise (no argument), resolve the PR attached to the **current branch**:
  ```bash
  gh pr view --json number,title,state,isDraft,headRefName,baseRefName,body
  ```
  This only works if the current working directory's checked-out branch has an open PR — if it
  doesn't, ask the user for a PR number instead of guessing.

Fetch full PR metadata:

```bash
gh pr view <N> --repo <owner>/<repo> --json number,title,body,state,isDraft,headRefName,baseRefName,mergeable,mergeStateStatus,reviewDecision
```

Extract the linked issue number from the title (`[#NNN]`) or body (`Closes #NNN`). If neither is
present, ask the user which issue this PR closes — do not guess.

**Stop immediately** (report to the user, do nothing further) if:
- `state` is not `OPEN` (already merged or closed — nothing to finish).
- `isDraft` is `true` (mark it ready for review first).

---

## PHASE 1 — Validate readiness (pre-flight gate)

Build a checklist for the items that survive the rest of this flow unchanged. Do **not** proceed
to Phase 2+ unless every item here passes.

CI status, the Codex review, and the SonarCloud quality gate are deliberately **not** checked here:
Phase 7.5 is the only push in this entire command (Phases 2, 4, and 6 only commit locally — see
those phases; Phase 3 only edits the GitHub issue via `gh issue edit`, no local git commit), and
every push force-restarts CI and the Codex re-review. Phase 7.5a also strips the `[wip]` bracket,
which moves CI into final mode — so any CI/Codex result captured now describes both a stale commit
*and* the wrong execution mode. They're checked authoritatively in **Phase 7.6**, right after that
single final push in final mode — that is the real gate before Phase 8 declares the PR ready to
merge.

Before the checks below (and therefore before any Phase 1b auto-rebase), follow the safe
working-directory rule above. Refresh the base ref first in its own Bash call so a stale local
`origin/<baseRefName>` cannot make base commits already contained in `HEAD` look like PR changes:

```bash
git fetch origin <baseRefName>
```

Only after that fetch succeeds, capture the branch's current file list in a separate Bash call:

```bash
git diff origin/<baseRefName>...HEAD --name-only | sort > /tmp/finish-pr-<N>-files-before.txt
```

### 1a. Review threads

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) { nodes { id isResolved path } }
      }
    }
  }
' -f owner=<owner> -f repo=<repo> -F pr=<N>
```

Every thread must have `isResolved: true`. List unresolved ones (path) if any exist — do not
attempt to resolve them yourself here; that is `/pr-comments`'s job, not this command's. Tell the
user to run `/pr-comments <N>` first if any are open.

### 1b. Mergeable state

`mergeStateStatus` must be `CLEAN` — **or** `BLOCKED` for the single expected reason that the PR
title still carries a `[wip]` / `[e2e-test]` execution-mode bracket, which makes the required
`merge-gate` check `action_required` (`ci-gate` itself is still green in `[wip]` when the checks
pass). That is not a real blocker here: Phase 7.5a strips the bracket and Phase 7.6 re-validates in
final mode.

`BLOCKED` is coarse — it does not say *why*. Before accepting the bracket exception, prove the
bracket is the **only** cause. Fetch the extra fields:

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeStateStatus,mergeable,reviewDecision
```

Treat it as `CLEAN` for the purpose of continuing **only when every one** of these holds:
- `ci-gate` and every non-`skipped` branch job (`api-ci`, `webapp-ci`, `e2e-ci`, `scripts-tests`)
  on the current head concluded `success`;
- `merge-gate` is `action_required` (not `failure`);
- `mergeable` is not `CONFLICTING` (no merge conflicts);
- `reviewDecision` is **not** `CHANGES_REQUESTED` — a reviewer has actively blocked it, which
  removing the bracket will not clear;
- `reviewDecision` is **not** `REVIEW_REQUIRED` — branch protection wants an approval that is not
  there yet. (The `/issue*` pipelines run this automatically and never have one, so their Phase 9
  notes override this bullet for that path; a human running `/finish-pr` standalone must get the
  approval first — stop and say so, do not start the housekeeping.)

If any of those fails — `ci-gate`/a branch job failing, a conflict, `CHANGES_REQUESTED`,
`REVIEW_REQUIRED` on a standalone run, or `BLOCKED` with any other cause — treat it as a real
`BLOCKED` below and stop **before** Phase 2, so no issue/board/sprint bookkeeping runs on a PR that
is not actually one promotion away from mergeable.

- If it is `BEHIND`, auto-rebase instead of stopping — this is the common case (main moved while
  the PR sat waiting for review) and rebases cleanly almost every time. First confirm the working
  tree is clean — do not rebase over local changes:
  ```bash
  git status --short
  ```
  - If that prints anything, stop and tell the user to stash or commit first.
  - Otherwise, fetch and rebase:
    ```bash
    git fetch origin <baseRefName>
    git rebase origin/<baseRefName>
    ```
  - If the rebase **succeeds**, push the rewritten history:
    ```bash
    git push --force-with-lease origin HEAD
    gh pr view <N> --repo <owner>/<repo> --json mergeStateStatus
    ```
    Do **not** expect `CLEAN` here: the force-push just restarted CI, so `mergeStateStatus` will
    read `BLOCKED` / `UNKNOWN` / `UNSTABLE` for the minutes the fresh run is pending (and `BLOCKED`
    anyway while the `[wip]` bracket is still on). That is fine — Phase 7.6 is the authoritative
    CI + mergeable gate, run after Phase 7.5's own push. Only stop here if it now reads `DIRTY`
    (the rebase surfaced a conflict the conflict path below should already have caught). Otherwise
    report how many commits arrived on `<baseRefName>` and that the rebase/push completed, then
    continue with the rest of Phase 1. Restarting CI and the Codex re-review is harmless — neither
    is read until Phase 7.6.
  - If the rebase **hits conflicts**, capture the conflicting files *before* aborting — `git
    rebase --abort` discards the conflict state, so the list is unrecoverable afterward:
    ```bash
    git diff --name-only --diff-filter=U
    git rebase --abort
    ```
    Report that file list and stop — do not attempt to resolve conflicts automatically. Tell the
    user to run `/rebase-main` (or resolve manually) before retrying `/finish-pr`.
- If it is `DIRTY` (conflicts), or `BLOCKED` for any reason other than the `[wip]` / `[e2e-test]`
  bracket described above, report the reason and stop.

### Report the checklist

```
## PR #<N> — Pre-flight check
- [x/❌] Review threads: all resolved (<M> total)
- [x/❌] Mergeable: clean, no conflicts
```

If anything failed, stop here — do not touch the branch, the issue, or any documentation.

---

## PHASE 2 — Squash the branch to one commit

Skip this phase entirely (report "already a single commit") if `git log --oneline
origin/<base>..HEAD | wc -l` is already `1`.

```bash
git fetch origin <baseRefName>
git log --format='%B' --reverse $(git merge-base origin/<baseRefName> HEAD)..HEAD
```

Use `$(git merge-base origin/<baseRefName> HEAD)` — real shell command substitution, not a
placeholder to fill in by hand — everywhere this phase needs the branch's starting point. Recompute
it fresh in each command rather than carrying a value across separate Bash tool calls: shell state
(including variables) does not persist between calls, only the working directory does. Recomputing
is safe here because nothing re-fetches `origin/<baseRefName>` again until Phase 7.5, so every
command in this phase resolves to the same commit regardless of when it runs.

Read every commit message in the branch. Synthesize **one** new commit message that follows this
repo's mandatory convention (`doc/conventions/git/commits.md` / root `CLAUDE.md`):

```
:emoji [#NNN] - short description :emoji

- :emoji Activity 1
- :emoji Activity 2
```

Rules for the synthesis:
- Pick the emoji matching the PR's dominant change type (✨ feat is usually right for a PR that
  is mostly new behavior with a fix or two mixed in; use 🔒/🐛/🔨 etc. only if the PR is
  overwhelmingly that single category).
- The bullet list must cover the substantive changes from **every** squashed commit — this is the
  permanent historical record once the intermediate commits are gone, so do not drop real content.
  Merge near-duplicate bullets (e.g. a style tweak a later commit re-tweaked) into one bullet
  describing the final state, not each intermediate step.
- Drop pure bookkeeping bullets (`Start work session`, `Close work session`, `Tracked: Xh total`)
  — that history now lives in the issue's Sessions array and in the Retrospective added in Phase 3,
  not in the commit log.
- Reuse the issue number already used throughout the branch's commits.

Apply it:

```bash
git reset --soft $(git merge-base origin/<baseRefName> HEAD)
git commit -m "<synthesized message>"
```

Verify nothing was lost — the squashed single-commit diff must be identical to the pre-squash
diff:

```bash
git diff origin/<baseRefName>...HEAD --stat
```

Follow the safe working-directory rule above, then capture the post-squash list in its own Bash
call and compare it with Phase 1's pre-rebase/pre-squash capture:

```bash
git diff origin/<baseRefName>...HEAD --name-only | sort > /tmp/finish-pr-<N>-files-after.txt
diff /tmp/finish-pr-<N>-files-before.txt /tmp/finish-pr-<N>-files-after.txt && echo "MATCH"
```

If they don't match, stop and report — do not push a divergent diff.

Do **not** push yet — this commit is local-only scaffolding for Phase 7.5's final squash+push, the
single push point in this command.

---

## PHASE 3 — Finalize the GitHub issue

The issue itself is the only copy of this work's record so far (per TD-01) — everything below is
written **directly to the issue**, not to a local file. There is no separate "sync" step because
there is nothing else to sync with.

```bash
gh issue view <NNN> --repo <owner>/<repo> --json body -q .body > /tmp/finish-pr-<N>-issue-body.md
```

1. In the `## ⏱️ Time` → `Sessions` JSON array, close any session still showing `"end": "?"` with
   the current local time, then recompute `Tracked` as the sum of every session's duration (do not
   trust a stale value — recompute from the raw start/end pairs).
2. Cross-check every unticked `[ ]` box in the issue's Technical Tasks / Acceptance Criteria
   sections against what actually shipped in this PR's diff. Tick any that are genuinely done.
   Never tick a box for work you can't verify landed in this PR.
3. Append a `## 📊 Retrospective` section per `doc/conventions/tasks.md` — actual total (with the
   per-session minute breakdown), variance vs. optimistic and pessimistic, and a narrative
   justification. The justification must explain *why* the tracked time came out the way it did —
   scope changes requested mid-flight, review-response cycles, rework — not just restate *what*
   was built.

Write the updated body back:

```bash
gh issue edit <NNN> --repo <owner>/<repo> --body-file /tmp/finish-pr-<N>-issue-body.md
```

Do **not** close the issue here — merging the PR closes it automatically via `Closes #NNN`.

---

## PHASE 4 — Archive the finished issue locally

This is the **only** point in the whole lifecycle where a file under `doc/tasks/` is created for
this issue. Write the now-finalized issue (title + body, exactly as it stands after Phase 3) to:

```
doc/tasks/<current yyyy-mm>/<NNN>-<slug>.md
```

`<slug>` is a short kebab-case description derived from the issue title. `<current yyyy-mm>` is
today's month, not when the issue was opened — this is a closing snapshot, not a backdated one.

The body alone doesn't carry the issue's `investment:` label (labels are a separate GitHub field,
not part of the body text) — without capturing it here, the archived snapshot loses the Investment
Type classification the moment the issue closes, even though `doc/conventions/tasks.md` →
"Investment Type" requires every issue to carry exactly one. Prepend it as a one-line **Labels**
metadata line so the archive stays self-contained:

```bash
mkdir -p doc/tasks/<yyyy-mm>
gh issue view <NNN> --repo <owner>/<repo> --json title,body,labels \
  -q '"# " + .title + "\n\n**Labels:** " + ([.labels[].name] | join(", ")) + "\n\n" + .body' \
  > doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
```

Commit this as its own commit. Local only — do not push; Phase 7.5 pushes everything once at the
end:

```bash
git add doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
git commit -m "📚 [#NNN] - Archive issue #NNN 📂

- 📂 Snapshot the finalized GitHub issue to doc/tasks/<yyyy-mm>/ per doc/conventions/tasks.md"
```

---

## PHASE 5 — Move the issue to "Done" on its GitHub Project

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $issue: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $issue) {
        id
        projectItems(first: 10) {
          nodes {
            id
            project { id number title }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }
' -f owner=<owner> -f repo=<repo> -F issue=<NNN>
```

Every issue should already be linked to the **SushiGo Admin** project (`/start-issue` Phase 1a
checks this) — for every project the issue is linked to:

```bash
gh api graphql -f query='
  query($project: ID!) {
    node(id: $project) {
      ... on ProjectV2 {
        field(name: "Status") {
          ... on ProjectV2SingleSelectField { id options { id name } }
        }
      }
    }
  }
' -f project=<project-id>
```

Find the option named `Done` (case-insensitive). If the project has no `Status` field or no
`Done` option, skip that project with a note — do not fail the whole command over it.

```bash
gh api graphql -f query='
  mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $project
      itemId: $item
      fieldId: $field
      value: { singleSelectOptionId: $option }
    }) {
      projectV2Item { id }
    }
  }
' -f project=<project-id> -f item=<item-id> -f field=<status-field-id> -f option=<done-option-id>
```

Do **not** touch the `Iteration` field here — sprint assignment is a decision the user makes
explicitly, never a side effect of finishing a PR.

---

## PHASE 6 — Update the current sprint document

Determine the current sprint: the **highest-numbered** `sprint-NNN-*.md` file directly under
`doc/sprints/` (not `doc/sprints/planned/`).

```bash
ls doc/sprints/*.md | grep -v README | sort | tail -1
```

Only proceed with this phase if the issue is actually listed in that sprint document already (i.e.
a human previously assigned it there) — an issue with no `Iteration` set and no row in the sprint
doc is not part of the current sprint, and this phase does not apply to it.

In that file, sourcing `Tracked` from the GitHub issue's `## ⏱️ Time` section as finalized in
Phase 3 (not a local file — there isn't one until Phase 4, and even that is just a mirror):

1. **§7 Route A execution rounds** — find the row for this issue in whichever round table
   contains it. Update: status marker → `✅`, `Tracked` → the issue's final Tracked value
   (convert to decimal hours, e.g. `2h35m` → `2.6h`), `PR / Commit` → `PR #<N>`, `Notes` → a
   concise one-line result summary ending in `PR ready, merge pending` (matching the phrasing
   already used for other rows in this document awaiting merge).
2. **§13 Execution Evidence** — find or add the row for this issue. Update: status marker → `✅`,
   `Result Summary` → 1–2 sentence description of what shipped, `Pull Request` → `PR #<N>`,
   `Merge Commit` → `—` (still unmerged), `Tracked` → same value as above, `Evidence Notes` →
   test counts, linter results, review-response summary.

Do **not** touch round-total footer rows, §1's Executive Summary, §4's Sprint Timeline, §10's
aggregate table, the root `README.md`, or any other issue's row — per `doc/conventions/sprints.md`
§9, an implementation agent may only update the row and evidence tied to its own issue, never
aggregate totals. With dev-lab running several parallel workspaces, more than one PR can finish in
the same window; each one recomputing the same aggregate percentage from its own local view means
whichever merges last silently clobbers the others' numbers. The sprint doc's aggregate percentage
and README's `Completed` cell are therefore a deliberate manual concern from here on: run
`/sync-sprint-progress` yourself, against a stable target, whenever you want them refreshed — this
command does not touch either as a side effect of closing a single PR.

Commit separately. Local only — do not push; Phase 7.5 pushes everything once at the end:

```bash
git add doc/sprints/
git commit -m "📚 [#NNN] - Mark #NNN's row complete in the sprint doc 📊

- 📊 Mark #NNN complete in Round table and Execution Evidence"
```

---

## PHASE 7.5 — Promote out of `[wip]`, final squash, single push

### 7.5a. Promote the PR to final mode

```bash
gh pr view <N> --repo <owner>/<repo> --json title --jq .title
```

Remove **every** `[wip]` and `[e2e-test]` token from the title (a title may legitimately carry
both while iterating — `pull-requests.md` rule 4 — and leaving either one keeps CI out of final
mode). Match by **content**, the same way CI parses it
(`.github/scripts/ci-analyze/parse-mode.js`: `/\[\s*wip\s*\]/i`, `/\[\s*e2e-test\s*\]/i`) — do not
key off position: the token is normally the last bracket before the ` - `, right after `[x]`, but
on a standalone-Docker PR with no `[x]` workspace bracket it sits one position left. Change nothing
else about the title.

```bash
gh pr edit <N> --repo <owner>/<repo> --title "<same title, every [wip]/[e2e-test] token removed>"
```

This is the promotion the review flow was waiting on: the `pull_request: edited` trigger re-runs
CI in **final mode** — the full Cypress suite runs and the `merge-gate` check, `action_required`
while the bracket was present, is re-posted as `success` (iff `ci-gate` passes). The squash
force-push below supersedes that run within seconds via the `ci-*` concurrency group, so Phase 7.6a
ends up watching a single final-mode run against the squashed commit. If the title contained no
such token, this is a no-op — record it as "already final" and continue.

### 7.5b. Final squash and single push

Phases 2–6 commit incrementally on purpose (so partial progress is never lost to a mid-flow typo
or crash), but none of them push. Phase 1b may already have pushed once, if it had to auto-rebase
a `BEHIND` branch — that push's CI/Codex result was never read, though, so it doesn't count
against what follows: this phase's push is the one whose result Phase 7.6 actually checks. Folding
everything into one commit here, instead of after every phase, means CI and the Codex re-review
restart at most once between here and Phase 7.6's check, instead of on every intermediate
housekeeping commit:

Follow the safe working-directory rule above. Run its `cd` as a standalone Bash call first; only
then run this separate capture/reset call:

```bash
git fetch origin <baseRefName>
SQUASH_BASE=$(git merge-base origin/<baseRefName> HEAD)
git diff origin/<baseRefName>...HEAD --name-only | sort > /tmp/finish-pr-<N>-files-before.txt
git reset --soft "$SQUASH_BASE"
```

Do not reset to the freshly fetched `origin/<baseRefName>` tip. If the base advanced during
Phases 2–6, that would create a commit whose tree reverses the newly merged base work. Keeping the
pre-squash merge base as the new commit's parent also keeps both three-dot captures anchored to the
same starting point; Phase 7.6c handles any resulting `BEHIND` state with its validated rebase path.

Write one final commit message that is the Phase 2 message with any genuinely new substance from
Phases 4/6 folded in as trailing bullets (issue archived, sprint doc row updated) — do
not just concatenate every intermediate commit message verbatim.

After committing, confirm the shell is still at the resolved workspace root, then run the
post-squash capture as a separate Bash call — never prefix it with `cd ... &&`:

```bash
git commit -m "<final consolidated message>"
git diff origin/<baseRefName>...HEAD --name-only | sort > /tmp/finish-pr-<N>-files-after.txt
diff /tmp/finish-pr-<N>-files-before.txt /tmp/finish-pr-<N>-files-after.txt && echo "MATCH"
```

If the diff doesn't match, stop and report — do not push a divergent diff. Only after the
comparison succeeds, push in a separate Bash call:

```bash
git push --force-with-lease origin HEAD
```

If Phase 7.6 (next) finds a real bug that needs a code fix, **do not fix it yourself** — report it
(app-doctor style: name the failing requirement and what a fix looks like) and stop before Phase 8.
The user (or a follow-up run) adds the fix commit, after which Phases 7.5b–7.6 alone can be re-run
against the commit that will actually be merged. 7.5a's promotion is idempotent — re-running it on
an already-final title is a no-op.

---

## PHASE 7.6 — Final validation (the real gate)

This is the only point in the flow where the final-mode CI run, the Codex review, and the
SonarCloud quality gate are checked. Phase 1b's pre-flight rebase may have pushed earlier, but
Phase 7.5b's push is the last one before this check runs, so it's the only push result that ever
actually gets read — checking any earlier push would just describe a commit that's since been
replaced. It also re-checks mergeable state (7.6c), since Phase 1's `CLEAN` result can go stale
while Phases 2–6 and 7.5 run.

### 7.6a. Wait for CI (final mode)

```bash
gh pr checks <N> --repo <owner>/<repo> --watch
```

This blocks until every check finishes running. The PR is now in final mode (7.5a), so both
required checks — `ci-gate` **and** `merge-gate` — must conclude `SUCCESS`; `merge-gate` flipping
from `action_required` to `success` is the proof the bracket is really gone. If any check's
conclusion is not `SUCCESS` (or a
legitimate `SKIPPED` for a surface this PR didn't touch), list it by name and stop — do not declare
the PR ready to merge, but do **not** revert the Phase 7.5b push either. The
housekeeping is already committed and pushed; the user (or a follow-up code fix) just needs a new
commit, after which Phases 7.5b–7.6 alone can be re-run.

### 7.6b. Automated review — Codex review + SonarCloud quality gate

No browser automation. This sub-check *reports* Codex + Sonar status; it never fixes anything and
never enters a fix loop. It **may** post one `@codex review` comment — Codex does not reliably
re-review a push on its own (this repo's integration starts a pass from an `@codex review` comment;
see `doc/tasks/2026-08/478-issue-no-review-command.md`), and Phases 7.5a/7.5b just rewrote the
merge-ready commit, so getting Codex to look at *that* commit is this command's job.

**Codex review** — the automated reviewer on this repo is Codex (`chatgpt-codex-connector`); it
posts a PR review whose body starts `### 💡 Codex Review` and names a `Reviewed commit:` SHA.

```bash
git rev-parse HEAD
gh pr view <N> --repo <owner>/<repo> --json reviews \
  --jq '[.reviews[] | select(.author.login=="chatgpt-codex-connector")] | last'
```

- Read the latest Codex review's `Reviewed commit:` SHA. **If it already matches the current
  branch `HEAD`** (the commit 7.5b pushed), evaluate it directly — go to the last bullet.
- **If it is an older SHA, or there is no Codex review yet**, post the trigger **once** and wait:
  ```bash
  gh pr comment <N> --repo <owner>/<repo> --body "@codex review"
  ```
  Then poll `gh pr view <N> --json reviews` on the same ~30s / ~10min cadence as `issue.md`'s
  Phase 8. If a fresh review lands with `Reviewed commit:` == `HEAD`, evaluate it. If the ~10min
  window elapses with no fresh review, report `Codex review: did not post on the merge-ready
  commit <sha> within 10 min` and stop before Phase 8 — an honest "not verified" outcome, not a
  hang. Do **not** post the trigger a second time.
- **Evaluate the matching review:** if it reports a **major / blocking** finding (Codex marks
  these distinctly from minor suggestions), list each one and stop before Phase 8 — a blocking
  review finding is an unmet merge requirement, exactly like a failing check. Minor suggestions
  are FYI only; surface the count, don't block on them.

**SonarCloud quality gate** — from the same `gh pr checks <N>` output as 7.6a, the SonarCloud
checks must all be `SUCCESS` (or a legitimate `SKIPPED` when that surface wasn't touched):
`[sushigo-api] SonarCloud Code Analysis`, `[sushigo-webapp] SonarCloud Code Analysis`, and the
`api-ci / api-sonar` / `webapp-ci / webapp-sonar` jobs. A `FAILURE` or still-`PENDING` Sonar gate
is an unmet merge requirement — list it and stop before Phase 8.

### 7.6c. Re-validate mergeable state

Phase 1's `mergeStateStatus: CLEAN` check ran before Phases 2–6 and 7.5, which can take a while
(issue finalization, sprint doc, waiting on CI/Codex above). If `main` advanced during that
window — someone else's PR merged — the branch can have silently gone `BEHIND` since Phase 1, and
the Phase 8 report would otherwise claim "clean, no conflicts" on stale information.

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeable,mergeStateStatus,reviewDecision
```

`mergeStateStatus` must still be `CLEAN` — **or** `BLOCKED` with `reviewDecision ==
REVIEW_REQUIRED`, which by now (7.5a promoted the PR, so `merge-gate` is `success` and every
required check 7.6a saw is green) most likely means only a pending human approval. Accept it here
**only when** all of these hold:
- 7.6a's checks were all green (`ci-gate` + `merge-gate` + every branch job);
- `mergeable` is not `CONFLICTING`;
- `reviewDecision` is **not** `CHANGES_REQUESTED`;
- **re-run Phase 1a's review-thread query** — every thread must still be `isResolved: true`. The
  promotion push can attract a fresh automated-review thread; an unresolved one is a real stop
  (point the user at `/pr-comments <N>`), not "pending approval".

`REVIEW_REQUIRED` does **not** prove a pending approval is the *sole* blocker — a `BLOCKED` state
can also carry a required check this command doesn't know to look for, a CODEOWNERS review, a
"require linear history" rule, etc. So do not assert "approval is the only thing left". Record it
for Phase 8 as: *"All gates this command checks are green. GitHub still reports the merge blocked
(`reviewDecision: REVIEW_REQUIRED`) — approve the PR, and if it stays blocked after that, a branch-
protection rule outside this command's view (CODEOWNERS, linear history, another required check) is
also in play."* A human running `/finish-pr` standalone is expected to approve first; this is not
a hard stop. The `/issue*` pipelines rely on this exception (they run unattended, never carry an
approval) — see their Phase 9 notes.

If it is now `BEHIND` (someone else's PR merged into `<baseRefName>` while Phases 2–6, 7.5, and
7.6 ran), auto-rebase the same way as Phase 1b instead of stopping:

```bash
git fetch origin <baseRefName>
git rebase origin/<baseRefName>
```

- If it **succeeds**, the branch is already a single commit from Phase 7.5, so the rebase replays
  cleanly as one commit. Re-validate against the file list Phase 7.5 already proved correct
  (`finish-pr-<N>-files-after.txt`, captured post-squash against the *old* base) — preserve it under
  its own name first. Follow the safe working-directory rule again: make the workspace root current
  in a standalone Bash call, then run the copy/re-diff below in a separate call. Never combine its
  output redirection with `cd` or `git -C`:
  ```bash
  cp /tmp/finish-pr-<N>-files-after.txt /tmp/finish-pr-<N>-files-preverify.txt
  git diff origin/<baseRefName>...HEAD --name-only | sort > /tmp/finish-pr-<N>-files-after.txt
  diff /tmp/finish-pr-<N>-files-preverify.txt /tmp/finish-pr-<N>-files-after.txt && echo "MATCH"
  ```
  A clean rebase replays the same patch onto a new parent, so this must still match — a mismatch
  means the rebase silently dropped or altered files and should be treated like a failed diff
  check anywhere else in this command (stop, do not push). Once it matches, push:
  ```bash
  git push --force-with-lease origin HEAD
  ```
  This push restarts CI and the Codex re-review, so re-run 7.6a–7.6c from the top against the
  new commit before Phase 8 declares anything ready — do not reuse the pre-rebase results.
- If it **hits conflicts**, capture the conflicting files *before* aborting — same as Phase 1b:
  ```bash
  git diff --name-only --diff-filter=U
  git rebase --abort
  ```
  Report that file list and stop before Phase 8 (the housekeeping commits already pushed before
  this rebase attempt are not lost — resolve manually, or run `/rebase-main`, then re-run 7.5–7.6).

If `DIRTY`, or `BLOCKED` for any reason other than the bare `REVIEW_REQUIRED` carve-out above,
report the reason and stop.

---

## PHASE 8 — Final report

```
## Finish PR #<N> — Ready to merge?

### Pre-flight checks (Phase 1)
- [x] Review threads: all resolved (<M> total)
- [x] Mergeable: clean, no conflicts (as of Phase 1 — re-validated below)

### Final housekeeping (Phases 2–6, 7.5)
- [x] Commits squashed: <before> → 1 (`<sha>`)
- [x] GitHub issue #<NNN> finalized — Tracked <Xh Ym>, checklist ticked, Retrospective added
- [x] Issue archived to doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
- [x] GitHub Project status → Done
- [x] Sprint doc updated — this issue's row marked complete in Round table + Execution Evidence
      (or: not part of the current sprint, skipped)
- [x] Promoted `[wip]` → final (or: already final)

### Final validation on the merge-ready commit (Phase 7.6)
- [x] CI checks (final mode): <M>/<M> passing — `ci-gate` + `merge-gate` green
- [x] Codex review: no major findings (reviewed `<sha>`, matches HEAD) — <M> minor suggestions
- [x] SonarCloud quality gate: passed (api + webapp)
- [x] Mergeable: still clean, no conflicts (re-checked post-push — `main` didn't move under us)

### ✅ Ready to merge
Everything above is green. I have not merged it — that's on you:
  gh pr merge <N> --merge      (branch is already a single commit, no need for --squash)
```

If every gate this command checks is green but 7.6c still saw `BLOCKED` /
`reviewDecision == REVIEW_REQUIRED` (checks green, no conflict, threads resolved, not
`CHANGES_REQUESTED`), replace "✅ Ready to merge" with
`### ✅ All gates green — GitHub still reports the merge blocked`. The "Mergeable" line reads
`[ ] BLOCKED — reviewDecision: REVIEW_REQUIRED. Approve the PR; if it stays blocked, a rule outside
this command's view (CODEOWNERS, linear history, another required check) is also in play.` and the
closing line is `Approve (and clear any remaining rule), then: gh pr merge <N> --merge`.

If a merge requirement is **not** met, replace the "✅ Ready to merge" block with a
`### ❌ Not ready to merge` block that lists each unmet requirement and, for each, the one concrete
action that clears it (app-doctor style — you name the problem and the fix, you do not apply it).

If Phase 1 failed, print only that checklist (with the failing items marked ❌ and what's
blocking them) and stop — do not run Phases 2–6, 7.5, or 7.6. If Phase 7.6 failed (CI not green in
final mode, Codex review reporting a major finding or not posting on the merge-ready commit within
the wait window, or the Sonar gate not passed), print all three sections (Phase 1 and the
housekeeping already happened) with 7.6's failing items marked ❌, and stop before the "Ready to
merge" line.

**Never run `gh pr merge` yourself, regardless of how clean the checklist is.**
