---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh pr ready:*), Bash(gh pr comment:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh api:*), Bash(gh project:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git status:*), Bash(git branch:*), Bash(git merge-base:*), Bash(git reset:*), Bash(git rebase:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(date:*), Bash(sleep:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Bash(cd:*), Bash(sort:*), Bash(diff:*), Bash(cp:*), Bash(tail:*), Bash(wc:*), Read, Edit, Write, WebFetch
description: Validate a PR is ready to merge and perform the final housekeeping (squash commits, finalize the issue in place, archive it locally, update the sprint doc's per-issue row, move the issue to Done) — never merges automatically
argument-hint: [pr-number]
---

# Finish PR — #$ARGUMENTS

You are closing out a GitHub Pull Request for the SushiGo monorepo: verifying it is actually ready
to merge, then doing every piece of bookkeeping a human would otherwise have to do by hand before
merging — **except the merge itself**.

**Call this after a PR is ready to close out — either by hand once you've manually tested and
approved it, or automatically as `/issue*`'s (or a sibling variant's) own Phase 9.** The input is
normally a **draft** PR (#598): merge-blocking is native draft status now, and this command's
Phase 7.5a is what promotes it (`gh pr ready`) once the paperwork is done. Your job is to confirm
review threads, finish the paperwork — squash the branch to one commit, finalize the GitHub issue
itself (time tracking, checklist, retrospective), archive it locally as a closing snapshot, move
the issue to Done on the project board, and update the sprint document's own row for this issue —
then promote the draft and only then check CI, the Codex review, and the SonarCloud quality gate,
once, against the full-regression run the promotion fires. Doing it in that order (paperwork before
the promote + check, not after) means Phases 2–6 add no restarts at all, since they only commit
locally — the only run whose result actually gets checked is the one Phase 7.5a's `gh pr ready`
triggers. A pre-flight rebase (Phase 1b) or a late rebase (Phase 7.6c) still pushes and still
restarts CI, same as any other push, but that restart is irrelevant: nothing reads its result
before Phase 7.5a promotes anyway. You report an "app-doctor" checklist at the end. **You never run
`gh pr merge`.** The user merges by hand once your report says everything is green.

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

**A draft PR is the expected input** (#598): merge-blocking is native GitHub draft status, and the
`/issue*` pipelines and `/start-issue` all open the PR with `gh pr create --draft`. Do **not** stop
on `isDraft: true` — Phase 7.5a is what promotes it (`gh pr ready`) once the housekeeping is done
and the full-regression run is about to fire. Record the draft state; you'll need it in 7.5a.

**Stop immediately** (report to the user, do nothing further) if:
- `state` is not `OPEN` (already merged or closed — nothing to finish).

---

## PHASE 1 — Validate readiness (pre-flight gate)

Build a checklist for the items that survive the rest of this flow unchanged. Do **not** proceed
to Phase 2+ unless every item here passes.

CI status, the Codex review, and the SonarCloud quality gate are deliberately **not** checked here:
Phase 7.5 is the only push in this entire command (Phases 2, 4, and 6 only commit locally — see
those phases; Phase 3 only edits the GitHub issue via `gh issue edit`, no local git commit), and
Phase 7.5a's `gh pr ready` promotion is what fires the full-regression CI run in the first place. A
result captured now would just describe a commit / a suppressed-scope draft run that's about to be
replaced, and Phase 8 would end up reporting stale status. They're checked authoritatively in
**Phase 7.6**, right after the promote + single final push — that is the real gate before Phase 8
declares the PR ready to merge.

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

**Paginate.** `reviewThreads(first: 100)` alone silently truncates at the 100th thread on a
heavily-reviewed PR — `--paginate` follows `pageInfo` automatically as long as the query names its
cursor variable `$endCursor` (gh CLI's documented convention for GraphQL pagination):

```bash
gh api graphql --paginate -f query='
  query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100, after: $endCursor) {
          nodes { id isResolved path }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
' -f owner=<owner> -f repo=<repo> -F pr=<N> --jq '.data.repository.pullRequest.reviewThreads.nodes[]'
```

Every thread across **every page** must have `isResolved: true`. List unresolved ones (path) if any
exist — do not attempt to resolve them yourself here; that is `/pr-comments`'s job, not this
command's. Tell the user to run `/pr-comments <N>` first if any are open.

### 1b. Mergeable state

**If the PR is still a draft** (the expected input — see Phase 0), `mergeStateStatus` is `DRAFT`
(or `BLOCKED`), which masks `CLEAN`/`BEHIND`. It never surfaces `DIRTY` either, so the `DIRTY`
check below cannot detect a conflict on a draft. Use the **`mergeable` enum** instead — it is the
raw git-level merge result and *is* computed for drafts:

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeable,mergeStateStatus
```

- `mergeable == "CONFLICTING"` → the branch has merge conflicts with the base. **Stop now**, before
  any Phase 2+ housekeeping marks an issue done that can't actually merge. Tell the user to run
  `/rebase-main` (or resolve manually) then retry `/finish-pr`.
- `mergeable == "UNKNOWN"` → GitHub hasn't finished computing it. Re-fetch after a short wait
  (`sleep 5`, up to ~3×); if still `UNKNOWN`, note it in the Phase 8 report and continue — 7.6c
  re-checks against the real post-promotion state.
- `mergeable == "MERGEABLE"` → no conflict. Skip the rest of 1b; the authoritative `CLEAN`/`BEHIND`
  gate runs in **Phase 7.6c** after Phase 7.5a's `gh pr ready` promotion makes it visible. A
  `BEHIND` draft is still handled there: 7.6c auto-rebases it.

For a **non-draft** PR (a human ran `/finish-pr` on an already-promoted PR), `mergeStateStatus`
must be `CLEAN`:

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
  - If the rebase **succeeds**, push the rewritten history and re-fetch PR metadata to confirm
    `mergeStateStatus` is now `CLEAN` before continuing:
    ```bash
    git push --force-with-lease origin HEAD
    gh pr view <N> --repo <owner>/<repo> --json mergeStateStatus
    ```
    Report how many commits arrived on `<baseRefName>` and that the rebase/push completed, then
    continue with the rest of Phase 1. This push does trigger a new CI run, same as any push —
    that's harmless, not avoided, since CI is not checked until Phase 7.6, which validates whatever
    commit sits on the branch tip after Phase 7.5's own push, regardless of how many earlier pushes
    (this one included) happened before it.
  - If the rebase **hits conflicts**, capture the conflicting files *before* aborting — `git
    rebase --abort` discards the conflict state, so the list is unrecoverable afterward:
    ```bash
    git diff --name-only --diff-filter=U
    git rebase --abort
    ```
    Report that file list and stop — do not attempt to resolve conflicts automatically. Tell the
    user to run `/rebase-main` (or resolve manually) before retrying `/finish-pr`.
- If it is `DIRTY` (conflicts), report the file list and stop.
- If it is `BLOCKED`, apply the **pending-approval carve-out** — but only after actually confirming
  *why* it's `BLOCKED`. `BLOCKED` is GitHub's single status for several distinct branch-protection
  causes (an unmet required status check, an unresolved conversation, a missing approval, a missing
  signature, …); `reviewDecision`/`mergeable` alone don't say which one fired, so read the real
  rules first:
  ```bash
  gh api repos/<owner>/<repo>/branches/<baseRefName>/protection
  gh api repos/<owner>/<repo>/rules/branches/<baseRefName>
  ```
  The first call reads **classic branch protection only**. Repository- and organization-level
  **rulesets** are a separate system it never reports: a ruleset can impose its own required status
  checks, required reviews, required signatures, a linear-history or non-fast-forward rule, a merge
  queue, or required deployments. If one of those is the real reason for `BLOCKED`, the classic
  `/protection` payload still looks clean and the carve-out below would wrongly pass. So also read
  `rules/branches/<baseRefName>` (the effective rules from every active ruleset on this branch, each
  with a `type` and `parameters`) and evaluate the carve-out against the **union** of both sources.

  Proceed past Phase 1 (marking it "pending approval" for the Phase 8 report) only when **every**
  one of these holds — a `BLOCKED` state whose *sole* remaining cause is a required-review approval
  that hasn't been given yet is not a hard stop for a pipeline running unattended, but anything else
  named below **is**:
  - `required_status_checks.contexts` (classic) **and** every `required_status_checks` ruleset
    rule's checks name only contexts this command already tracks (in this repo, just `ci-gate`) —
    an unfamiliar required context from *either* source means a rule this command doesn't verify
    exists, and that's a real stop, not a carve-out.
  - `required_pull_request_reviews.required_approving_review_count > 0` **or**
    `require_code_owner_reviews == true` (classic), **or** a `pull_request` ruleset rule with
    `required_approving_review_count > 0` / `require_code_owner_review == true` — i.e. an approval
    is *actually* required, not just a stray `reviewDecision` value with nothing backing it.
  - `reviewDecision == "REVIEW_REQUIRED"` (never `CHANGES_REQUESTED`) — the specific missing piece
    is the approval itself.
  - `required_conversation_resolution.enabled == true` (classic) **or** a `pull_request` ruleset
    rule with `required_review_thread_resolution == true` → every review thread from 1a is resolved
    (this rule blocks on its own, independent of reviews, and 1a already verifies it).
  - **No signature rule** from either source: classic `required_signatures.enabled == false` and no
    `required_signatures` ruleset rule (or, if one is present, every commit on the branch is
    signed) — do not carve out a state where an unmet signature rule is the real blocker.
  - **No linear-history rule** from either source: classic `required_linear_history.enabled ==
    false` and no `required_linear_history` ruleset rule — **or**, if one is present, the branch
    already satisfies it (a single commit from Phase 2 / already linear). When a linear-history
    rule *is* active, carry that fact forward: Phase 8 must then recommend `gh pr merge --squash`,
    never `--merge` (a merge commit is forbidden under linear history and GitHub rejects it).
  - **`update` (restrict updates)** — if this rule is active on the base branch, only actors in the
    ruleset's bypass list can update that ref, and a PR merge *is* an update: an ordinary reviewer
    who runs the Phase 8 merge command gets a 4xx. This does **not** fail the carve-out on its own
    (the PR is still mergeable — by a bypass actor), but carry a "base ref is update-restricted"
    flag forward so Phase 8 can spell out that caveat next to the merge command.
  - **No other ruleset rule** whose `type` falls outside the recognised set
    (`required_status_checks`, `pull_request`, `required_signatures`, `required_linear_history`,
    `update` as handled just above, plus the genuinely merge-irrelevant `non_fast_forward` /
    `creation` / `deletion`). An active `merge_queue`, `required_deployments`, or any unrecognised
    rule `type` is one this command cannot verify — a real stop, not a carve-out.
  - `mergeable != "CONFLICTING"`.
  **Do not** require CI to be green *here* — at Phase 1, 7.6a has not run yet, so a "CI is green"
  precondition could never pass and would wrongly stop an already-ready PR that is fine. CI is
  still gated authoritatively in **7.6a** against the `required_status_checks.contexts` read above,
  and 7.6c re-confirms this entire carve-out (protection rules included) against the post-promotion
  state — if 7.6a finds CI red, the run stops there regardless. If any condition above does not
  hold, `BLOCKED` is a real stop here — report which protection rule is actually unmet and stop.

### Report the checklist

```
## PR #<N> — Pre-flight check
- [x/❌] Review threads: all resolved (<M> total)
- [x/❌] Mergeable: clean / draft (real gate deferred to 7.6c) / pending-approval only
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

## PHASE 7.5 — Final squash and single push

Phases 2–6 commit incrementally on purpose (so partial progress is never lost to a mid-flow typo
or crash), but none of them push. Phase 1b may already have pushed once, if it had to auto-rebase
a `BEHIND` branch — that push's CI result was never read, though, so it doesn't count against
what follows: this phase's push, followed by Phase 7.5a's `gh pr ready` promotion, is what Phase
7.6 actually checks. Folding everything into one commit here, instead of after every phase, means
CI restarts at most once (plus the promotion) between here and Phase 7.6's check, instead of on
every intermediate housekeeping commit:

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

If Phase 7.6 (next) finds a real bug that needs a code fix, fix it, commit it, then repeat Phase
7.5 (and then 7.5a is a no-op the second time — the PR is already `ready` — and 7.6 again) so the
branch still ends at exactly one commit and the final CI check runs against the commit that will
actually be merged.

---

## PHASE 7.5a — Promote the draft (strip modifiers, `gh pr ready`)

Merge-blocking is native draft status (#598). Until now the PR has been a **draft**, so `ci-gate`
was skipped and — with a title modifier or the draft default — CI ran a suppressed/shallow scope.
Promoting it here is what fires the **full regression** whose result Phase 7.6a gates on.

1. **Strip any CI-cost modifier from the title.** A ready PR still carrying `[skip-ci]` /
   `[ci-check]` / `[ci-check-all]` makes `ci-gate` go red with a "remove the modifier" message.
   Fetch the current title, drop a `[skip-ci]`, `[ci-check]`, or `[ci-check-all]` bracket
   (case-insensitive, whitespace-tolerant) if present, leaving `<emoji> [#NNN][x] - … <emoji>`:
   ```bash
   gh pr view <N> --repo <owner>/<repo> --json title --jq .title
   # only if it changed:
   gh pr edit <N> --repo <owner>/<repo> --title "<stripped title>"
   ```
2. **Mark it ready for review** — fires `pull_request: ready_for_review`, which re-runs CI in the
   full-regression mode and un-skips `ci-gate`:
   ```bash
   gh pr ready <N> --repo <owner>/<repo>
   ```
   If the PR is **already** non-draft (a human ran `/finish-pr` on an already-promoted PR, or this
   is a re-run after a 7.6 fix), this is a no-op — `gh pr ready` on a ready PR just reports it's
   already ready; the title strip in step 1 still runs. Removing the modifier in step 1 on an
   already-ready PR is itself an `edited` trigger that re-runs CI in full mode, so either path
   lands on the same full-regression run for 7.6a to wait on.

---

## PHASE 7.6 — Final validation (the real gate)

This is the only point in the flow where CI, the Codex review, and the SonarCloud quality gate are
checked. Phase 1b's pre-flight rebase may have pushed earlier, but Phase 7.5's push + Phase 7.5a's
promotion are the last events before this check runs, so that full-regression run is the only
result that ever actually gets read — checking any earlier push (or the draft's suppressed run)
would just describe a commit/scope that's since been superseded. It also re-checks mergeable state
(7.6c), since the real state is only visible after 7.5a's promotion.

### 7.6a. Wait for CI

Right after Phase 7.5a's `gh pr ready` / title edit, GitHub Actions takes several seconds to
register the new run's checks. A blocking `--watch` issued too early can return "no checks
reported" and exit `0` against the *old* (draft) run's leftover state. So poll a plain
`gh pr checks` (no `--watch`) until a check for the promoted run appears, then hand off to
`--watch`:

```bash
# poll until `gh pr checks` lists a pending/running check for the promoted run (retry ~6×, ~10s
# apart — sleep 10 between attempts)
gh pr checks <N> --repo <owner>/<repo>
# once the run has registered:
gh pr checks <N> --repo <owner>/<repo> --watch --json name,state,bucket,link
```

`--watch` blocks until every check finishes, then judge the run the **same way `ci-gate` itself
does** — do **not** stop merely because some check is skipped. `gh pr checks --json … bucket`
reports exactly one of **`pass`, `fail`, `pending`, `skipping`, `cancel`** per check (see
`gh pr checks --help`) — match on those literals, not on guessed names like `cancelled`/`timed_out`:

- **`ci-gate` must be present with `bucket == "pass"`.** On a ready full-regression run it is no
  longer skipped; if it is *still* `skipping`, 7.5a's promotion didn't take — re-run 7.5a.
- **`bucket == "fail"` or `bucket == "cancel"` on any *applicable* check** → list it by name and
  stop. `cancel` counts as a failure here: a cancelled check did not finish, so its result is
  unknown. Do **not** revert the Phase 7.5 push; the housekeeping is already committed and pushed,
  and the user (or a follow-up code fix) just needs a new commit, after which Phases 7.5–7.6 alone
  can be re-run.
- **`bucket == "pending"`** → `--watch` should have blocked until this cleared; if a check is still
  `pending` after `--watch` returns, re-run the `--watch` once, then treat a persistent `pending`
  as `fail` (stop) rather than assuming it passed.
- **`bucket == "skipping"`** → expected, not a failure. `.github/workflows/ci.yml` deliberately
  skips non-applicable branches (`api-ci` / `webapp-ci` / `e2e-ci` / `scripts-tests` when their
  surface wasn't touched); the `bucket` field distinguishes `skipping` from `fail` for exactly this
  reason. `ci-gate == "pass"` already means every applicable branch passed.
- A `ci-gate` red whose message is "remove the `[skip-ci]` / `[ci-check]` modifier from the title"
  means 7.5a's strip step missed a modifier — fix the title and re-run 7.6a.

### 7.6b. Automated review — Codex + SonarCloud (read-only, best-effort)

No browser automation, no Devin/DeepWiki, no assumed Copilot review. Check the Codex review and the
external SonarCloud quality gate on the merge-ready commit:

**Codex review** — the `chatgpt-codex-connector` GitHub App. It is not known in advance which
surface it uses in a given repo, so check **all three**, each `--paginate`d (`gh api` returns only
the first 30 items otherwise, and on a long PR the newest Codex entry sits on a later page):

```bash
# 1. formal PR reviews — commit_id is required, not just submitted_at: freshness is decided by
#    matching commit_id to HEAD_SHA below, and submitted_at alone cannot tell which commit a
#    review was submitted against.
gh api --paginate repos/<owner>/<repo>/pulls/<N>/reviews  --jq '.[] | select(.user.login=="chatgpt-codex-connector") | {t:.submitted_at, commit_id, state, body}'
# 2. top-level issue/PR comments (body carries a `### 💡 Codex Review` heading)
gh api --paginate repos/<owner>/<repo>/issues/<N>/comments --jq '.[] | select(.user.login=="chatgpt-codex-connector") | {t:.created_at, body}'
# 3. inline review-thread comments — the surface Codex uses in THIS repo (one P1/P2 finding per
#    thread). Paginated the same way as Phase 1a — reviewThreads(first:100) alone would silently
#    drop findings past the 100th thread on a heavily-reviewed PR.
gh api graphql --paginate -f query='
  query($o:String!,$r:String!,$p:Int!,$endCursor:String){
    repository(owner:$o,name:$r){
      pullRequest(number:$p){
        reviewThreads(first:100, after:$endCursor){
          nodes{ isResolved comments(first:10){ nodes{ author{login} createdAt body } } }
          pageInfo{ hasNextPage endCursor }
        }
      }
    }
  }' -f o=<owner> -f r=<repo> -F p=<N> \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | . as $th | .comments.nodes[] | select(.author.login=="chatgpt-codex-connector") | {t:.createdAt, resolved:$th.isResolved, body:.body}'
```

An **unresolved** Codex review-thread is an open finding — treat it exactly like an unresolved
Phase 1a thread: it blocks the "Ready to merge" verdict, and the fix is `/pr-comments <N>`.

**Deciding whether Codex has reviewed the merge-ready commit — match the head SHA, never a local
timestamp.** Resolve the promoted head first:

```bash
git rev-parse HEAD   # HEAD_SHA — the commit Phase 7.5a promoted
```

- **Formal review (surface 1):** it carries a `commit_id`. It counts as fresh only if
  `commit_id == HEAD_SHA`. A review whose `submitted_at` is newer than the local squash commit's
  `committer.date` but whose `commit_id` is the *previous* head is a stale review of the old commit
  — do not accept it (this is a real race: earlier pushes trigger Codex activity while Phase 7.5
  does local-only work).
- **Top-level comment / inline thread (surfaces 2–3):** no `commit_id`. It counts as fresh only if
  it was posted **after** a `@codex review` trigger comment that you yourself posted *after* the
  Phase 7.5 push — track that trigger comment's `created_at`, not the squash commit's
  `committer.date`.
- **If no fresh Codex response exists** by either rule, post one `@codex review` and wait, bounded
  (~30s polls via `sleep 30`, ~10 min cap), for one whose `commit_id` / post-time matches per the
  rules above. If none arrives in the window, note "Codex did not re-review the merge-ready commit
  in time" and continue — best-effort, not a hard gate. **But** any thread still `isResolved:false`
  is a blocker regardless of which commit it was filed against, until `/pr-comments` closes it.
  ```bash
  gh pr comment <N> --repo <owner>/<repo> --body "@codex review"
  ```
- If Codex has **never** posted on this PR at all — on *any* of the three surfaces — record
  "Codex: N/A (no review posted)" and continue — not a blocker.
- Summarize any concrete findings for Phase 8. A finding that is a real defect is a blocker — tell
  the user and stop before Phase 8 declares ready. A style/opinion note is surfaced, not blocking.

**SonarCloud quality gate** — the authoritative signal is the **external SonarCloud decoration
check**, named `SonarCloud Code Analysis` (its context is prefixed with the project key, e.g.
`[sushigo-api] SonarCloud Code Analysis`, `[sushigo-webapp] SonarCloud Code Analysis`). This is a
*different* check from this workflow's own `api-sonar` / `webapp-sonar` jobs — those only run the
scanner action (`_api-ci.yml` / `_webapp-ci.yml`) without `sonar.qualitygate.wait`, so their
`pass` means "scan submitted", **not** "quality gate passed". Do not accept an `api-sonar` /
`webapp-sonar` job's `pass` as the gate, and do not match on "any context containing `sonar`".

Read the `bucket` of the external `SonarCloud Code Analysis` check(s) from the same
`gh pr checks --json name,bucket` output as 7.6a:

- Every scanned surface's external `SonarCloud Code Analysis` check is `pass` → record and continue.
- Any is `fail` → surface which condition failed (new-code coverage < 80%, new issues, security
  hotspots) and stop before Phase 8 declares ready. (`/sonar-review` is the tool to clear it.)
- A surface ran its full `*-ci` branch (so a scan *was* submitted — its `api-sonar` / `webapp-sonar`
  job is `pass`) but **no external `SonarCloud Code Analysis` check has appeared** → the decoration
  is delayed or the webhook is missing. Wait and re-read `gh pr checks` (`sleep 30`, up to ~5×). If
  it still hasn't posted, note "SonarCloud: decoration missing for `<surface>` — verify on
  sonarcloud.io" and treat it as **not satisfied** (a ❌ blocker), not a pass.
- **No Sonar scan ran at all** (no `*-sonar` job, no external check) → the expected state for a
  `verify_needed=false` documentation / non-pipeline-config-only PR, or any PR that touched no
  `code/**`. Record "SonarCloud: N/A (no code surface scanned)" and continue — **not** a blocker;
  the Phase 8 checklist row carries that N/A verbatim rather than a ✅/❌.

### 7.6c. Re-validate mergeable state

The real `mergeStateStatus` is only visible now, after Phase 7.5a's promotion (a draft masks it as
`DRAFT`). And `main` may have advanced while Phases 2–7.5 ran, silently pushing the branch
`BEHIND`.

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeable,mergeStateStatus,reviewDecision
```

`mergeStateStatus` must be `CLEAN`, **or** `BLOCKED` under the Phase 1b pending-approval carve-out —
re-run that carve-out's full check (branch protection **and rulesets** re-fetched — both
`branches/<baseRefName>/protection` and `rules/branches/<baseRefName>` — every condition re-verified
against the union: only `ci-gate` named as a required context by either source, an approval actually
required, `reviewDecision == REVIEW_REQUIRED`, 1a threads resolved if conversation resolution is
required, no unmet signature rule, no linear-history/merge-queue/deployment or other unrecognised
ruleset rule, `mergeable != CONFLICTING`) against the **post-promotion** state, not the Phase 1
snapshot — protection settings, rulesets, or the review state can all have changed since. Carry the
linear-history flag **and the `update` (restrict-updates) flag** forward to Phase 8 the same way. Only then does Phase 8 report "all gates green — pending your approval" instead of a stop, so
the unattended `/issue*` pipelines don't hang on a required human approval. If it is now `BEHIND`
(someone else's PR merged into
`<baseRefName>` while Phases 2–6, 7.5, and 7.6 ran), auto-rebase the same way as Phase 1b instead
of stopping:

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
  This push restarts CI, so re-run 7.6a–7.6c from the top against the new commit before Phase 8
  declares anything ready — do not reuse the pre-rebase results.
- If it **hits conflicts**, capture the conflicting files *before* aborting — same as Phase 1b:
  ```bash
  git diff --name-only --diff-filter=U
  git rebase --abort
  ```
  Report that file list and stop before Phase 8 (the housekeeping commits already pushed before
  this rebase attempt are not lost — resolve manually, or run `/rebase-main`, then re-run 7.5–7.6).

If `DIRTY` instead, report the reason and stop. If `BLOCKED` and the Phase 1b pending-approval
carve-out does **not** apply (something other than a missing approval blocks it), report the reason
and stop.

---

## PHASE 8 — Final report ("app-doctor" style)

Report the state of every merge requirement. For each one that is **not** met, name the single
action that clears it — this command fixes nothing itself and never merges.

```
## Finish PR #<N> — merge readiness

### Housekeeping (Phases 2–6, 7.5) — done
- [x] Commits squashed: <before> → 1 (`<sha>`)
- [x] GitHub issue #<NNN> finalized — Tracked <Xh Ym>, checklist ticked, Retrospective added
- [x] Issue archived to doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
- [x] GitHub Project status → Done
- [x] Sprint doc row updated (or: not part of the current sprint, skipped)

### Promotion (Phase 7.5a)
- [x] Title modifier stripped: `[<modifier>]` → none  (or: none was present)
- [x] `gh pr ready` — PR promoted out of draft

### Merge requirements (Phase 7.6)
- [x/❌] Review threads: all resolved (<M> total)          — ❌ → run `/pr-comments <N>`
- [x/❌] CI — `ci-gate`: <SUCCESS>  (applicable branches: <pass/skipped list>)  — ❌ → <failing job(s) + fix path>
- [x/N/A/❌] Codex review: <no findings / N findings addressed / did not re-review / N/A — none posted>  — ❌ → address the finding, re-run 7.5–7.6
- [x/N/A/❌] SonarCloud (external `SonarCloud Code Analysis` per surface): <all passing / condition that failed / decoration missing / N/A — no code surface scanned>  — ❌ → run `/sonar-review` (or check sonarcloud.io if the decoration is missing)
- [x/⏳/❌] Mergeable: <CLEAN / pending your approval / conflict>         — ❌ → <rebase / resolve conflict>

An `N/A` row is a satisfied requirement, not a gap — do not treat it as ❌ and do not let it block
the "Ready to merge" verdict.

### <✅ Ready to merge  |  ⏳ All automated gates green — pending your approval  |  ❌ Not ready>
<If ready:>  Everything above is green. I have not merged it — that's on you:
  gh pr merge <N> --merge      (branch is already a single commit, no need for --squash)
  <If a linear-history rule is active on `<baseRefName>` — classic `required_linear_history` or a
  ruleset rule, per the Phase 1b / 7.6c read — recommend `gh pr merge <N> --squash` instead: a
  `--merge` commit is forbidden under linear history and GitHub rejects it. The branch is already
  one commit, so `--squash` lands it unchanged.>
  <If the `update` (restrict-updates) flag is set — a ruleset restricts updates to `<baseRefName>` —
  add: "the merge will 4xx unless you are in that ruleset's bypass list (or a repo admin); ask an
  admin to merge, or add yourself to the bypass list first.">
<If pending approval:>  Every automated gate is green; the only thing left is a human approving
  the PR (`reviewDecision: REVIEW_REQUIRED`). Approve it, then `gh pr merge <N> --merge` (or
  `gh pr merge <N> --squash` if a linear-history rule is active on `<baseRefName>`, as above; and
  the same bypass-actor caveat applies if the `update` restrict-updates flag is set).
<If not ready:>  The ❌ rows above each name the one action that clears them. Nothing was merged.
```

If Phase 1 failed, print only its checklist (failing items ❌ with the clearing action) and stop —
do not run Phases 2–6, 7.5, 7.5a, or 7.6. If Phase 7.6 failed, print all sections (housekeeping and
promotion already happened) with 7.6's failing rows ❌ and stop before the "Ready to merge" line.

**Never run `gh pr merge` yourself, regardless of how clean the checklist is.**
