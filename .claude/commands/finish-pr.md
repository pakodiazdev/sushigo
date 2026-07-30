---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh api:*), Bash(gh project:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(git merge-base:*), Bash(git reset:*), Bash(git rebase:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(date:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Read, Edit, Write, WebFetch
description: Validate a PR is ready to merge and perform the final housekeeping (squash commits, finalize the issue in place, archive it locally, sync sprint/README, move the issue to Done) — never merges automatically
argument-hint: [pr-number]
---

# Finish PR — #$ARGUMENTS

You are closing out a GitHub Pull Request for the SushiGo monorepo: verifying it is actually ready
to merge, then doing every piece of bookkeeping a human would otherwise have to do by hand before
merging — **except the merge itself**.

**Call this only after the human has manually tested the PR and approved it.** Your job is to
confirm review threads and mergeable state, then finish the paperwork — squash the branch to one
commit, finalize the GitHub issue itself (time tracking, checklist, retrospective), archive it
locally as a closing snapshot, move the issue to Done on the project board, and update the sprint
document and root README — and only then check CI and the automated review (Devin/DeepWiki), once,
against the final commit that push produced. Doing it in that order (paperwork before the CI/Devin
check, not after) means Phases 2–7 add no restarts at all, since they only commit locally — the
only push whose result actually gets checked is Phase 7.5's. A pre-flight rebase (Phase 1b) or a
late rebase (Phase 7.6c) still pushes and still restarts CI/Devin, same as any other push to the
branch, but that restart is irrelevant: nothing reads its result before Phase 7.5 pushes again
anyway. You report a checklist at the end. **You never run `gh pr merge`.** The user merges by
hand once your report says everything is green.

Per [TD-01](../../doc/decisions/td-01-single-source-issue-tracking.md), the GitHub issue is the
only live document for this work up to this point — nothing under `doc/tasks/` exists yet for it.
This command is the **only** place that creates the local archive, and it does so exactly once,
after the issue itself is fully finalized.

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

CI status and the Devin/DeepWiki scan are deliberately **not** checked here: Phase 7.5 is the only
push in this entire command (Phases 2, 3, 6, 7 only commit locally — see those phases), and every
push force-restarts both CI and the Devin scan. A result captured now would just describe a commit
that's about to be replaced, and Phase 8 would end up reporting stale status. They're checked
authoritatively in **Phase 7.6**, right after that single final push — that is the real gate before
Phase 8 declares the PR ready to merge.

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

`mergeStateStatus` must be `CLEAN`.

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
    continue with the rest of Phase 1. This push does trigger a new CI run and restarts the
    Devin/DeepWiki scan, same as any push — that's harmless, not avoided, since neither is checked
    until Phase 7.6, which validates whatever commit sits on the branch tip after Phase 7.5's own
    push, regardless of how many earlier pushes (this one included) happened before it.
  - If the rebase **hits conflicts**, capture the conflicting files *before* aborting — `git
    rebase --abort` discards the conflict state, so the list is unrecoverable afterward:
    ```bash
    git diff --name-only --diff-filter=U
    git rebase --abort
    ```
    Report that file list and stop — do not attempt to resolve conflicts automatically. Tell the
    user to run `/rebase-main` (or resolve manually) before retrying `/finish-pr`.
- If it is `DIRTY` (conflicts) or `BLOCKED`, report the reason and stop.

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
git log --format='%B' --reverse origin/<baseRefName>..HEAD
```

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
git reset --soft origin/<baseRefName>
git commit -m "<synthesized message>"
```

Verify nothing was lost — the squashed single-commit diff must be identical to the pre-squash
diff:

```bash
git diff origin/<baseRefName> HEAD --stat
```

Compare against the file list you already have from `gh pr diff <N> --name-only` (Phase 0/1). If
they don't match, stop and report — do not push a divergent diff.

Do **not** push yet — this commit is local-only scaffolding for Phase 7.5's final squash+push, the
single push point in this command.

---

## PHASE 3 — Finalize the GitHub issue

The issue itself is the only copy of this work's record so far (per TD-01) — everything below is
written **directly to the issue**, not to a local file. There is no separate "sync" step because
there is nothing else to sync with.

```bash
gh issue view <NNN> --repo <owner>/<repo> --json body -q .body > /tmp/finish-pr-issue-body.md
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
gh issue edit <NNN> --repo <owner>/<repo> --body-file /tmp/finish-pr-issue-body.md
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

```bash
mkdir -p doc/tasks/<yyyy-mm>
gh issue view <NNN> --repo <owner>/<repo> --json title,body -q '"# " + .title + "\n\n" + .body' > doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
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
3. **§1 Executive Summary** — update the `Progress as of <date>:` line: increment the completed
   count, recompute the percentage (`completed / scope_issues`), add this issue to the list, and
   update the date to today.
4. **§4 Sprint Timeline** — update the `Progress (Issues completed)` row the same way.

Do **not** touch round-total footer rows, §10's aggregate table, or any other issue's row — per
`doc/conventions/sprints.md` §9, an implementation agent may only update the row and evidence tied
to its own issue, never aggregate totals (those are recalculated by the coordination agent at
round/sprint boundaries, not per-PR).

Commit separately. Local only — do not push; Phase 7.5 pushes everything once at the end:

```bash
git add doc/sprints/
git commit -m "📚 [#NNN] - Update sprint progress for #NNN 📊

- 📊 Mark #NNN complete in Round table and Execution Evidence
- 📊 Update sprint progress percentage in Executive Summary and Timeline"
```

---

## PHASE 7 — Update the root README Sprints table

Skip this phase if Phase 6 was skipped (issue not part of the current sprint).

In the root `README.md`'s `## Sprints` table, find the current sprint's row. Since the sprint is
not yet closed, its `Completed` cell shows the running progress percentage (matching Phase 6's
recomputed value) instead of a date — that cell only becomes the actual completion date once the
sprint formally closes (`doc/conventions/sprints.md` §6, `completed` metadata field is filled).

Local only — do not push:

```bash
git add README.md
git commit -m "📚 [#NNN] - Update README sprint progress for #NNN 📊

- 📊 Refresh the Completed cell with the current sprint progress percentage"
```

---

## PHASE 7.5 — Final squash and single push

Phases 2–7 commit incrementally on purpose (so partial progress is never lost to a mid-flow typo
or crash), but none of them push. Phase 1b may already have pushed once, if it had to auto-rebase
a `BEHIND` branch — that push's CI/Devin result was never read, though, so it doesn't count against
what follows: this phase's push is the one whose result Phase 7.6 actually checks. Folding
everything into one commit here, instead of after every phase, means CI and the Devin/DeepWiki
scan restart at most once between here and Phase 7.6's check, instead of on every intermediate
housekeeping commit:

```bash
git fetch origin <baseRefName>
git diff origin/<baseRefName> HEAD --name-only | sort > /tmp/finish-pr-files-before.txt
git reset --soft origin/<baseRefName>
```

Write one final commit message that is the Phase 2 message with any genuinely new substance from
Phases 4/6/7 folded in as trailing bullets (issue archived, sprint/README progress updated) — do
not just concatenate every intermediate commit message verbatim.

```bash
git commit -m "<final consolidated message>"
git diff origin/<baseRefName> HEAD --name-only | sort > /tmp/finish-pr-files-after.txt
diff /tmp/finish-pr-files-before.txt /tmp/finish-pr-files-after.txt && echo "MATCH"
git push --force-with-lease origin HEAD
```

If the diff doesn't match, stop and report — do not push a divergent diff.

If Phase 7.6 (next) finds a real bug that needs a code fix, fix it, commit it, then repeat Phase
7.5 (and then 7.6 again) so the branch still ends at exactly one commit and the final CI/Devin
check runs against the commit that will actually be merged.

---

## PHASE 7.6 — Final validation (the real gate)

This is the only point in the flow where CI and the Devin/DeepWiki scan are checked. Phase 1b's
pre-flight rebase may have pushed earlier, but Phase 7.5's push is the last one before this check
runs, so it's the only push result that ever actually gets read — checking any earlier push would
just describe a commit that's since been replaced. It also re-checks mergeable state (7.6c), since
Phase 1's `CLEAN` result can go stale while Phases 2–7.5 run.

### 7.6a. Wait for CI

```bash
gh pr checks <N> --repo <owner>/<repo> --watch
```

This blocks until every check finishes running. If any check's conclusion is not `SUCCESS`, list
it by name and stop — do not declare the PR ready to merge, but do **not** revert the Phase 7.5
push either. The housekeeping is already committed and pushed; the user (or a follow-up code fix)
just needs a new commit, after which Phases 7.5–7.6 alone can be re-run.

### 7.6b. Automated review — Devin / DeepWiki (best-effort)

This project is on Devin's free tier, so the only review surface available is the public
DeepWiki-mirrored review page — check it for reported bugs instead of a paid private review.

If `mcp__claude-in-chrome__*` tools are available (load them via `ToolSearch` if deferred), open
`https://app.devin.ai/review/<owner>/<repo>/pull/<N>` and read the **Bugs** count and any
**Flags** panel (screenshot + `get_page_text`/`find` as needed — the page is a client-rendered SPA,
so a plain `WebFetch` will only return an empty shell and is not sufficient here).

- The scan restarts on the Phase 7.5 push and needs time to finish. If the page still shows
  "in progress"/"scanning" on first load, wait and re-check (a short poll loop, or
  `ScheduleWakeup` if running as a background task) rather than reporting an incomplete result.
- If the browser extension is not connected: try `tabs_context_mcp` once, and if it still fails,
  ask the user whether to wait for them to connect it or skip this sub-check as best-effort. Do
  not block indefinitely on this — it is supplementary to 7.6a and the review threads already
  validated in Phase 1, not a hard gate, since Copilot's review already runs automatically on
  every PR in this repo.
- Record: bug count, and the title + severity label of every flag (`Investigate` flags are worth
  surfacing to the user even though they aren't a hard blocker; `Informational` flags are FYI
  only).
- If a real **bug** (not a flag) is reported, treat it as a blocker like a failing check — tell
  the user what it is and stop before Phase 8 declares anything ready.

### 7.6c. Re-validate mergeable state

Phase 1's `mergeStateStatus: CLEAN` check ran before Phases 2–7.5, which can take a while (issue
finalization, sprint doc, README, waiting on CI/Devin above). If `main` advanced during that
window — someone else's PR merged — the branch can have silently gone `BEHIND` since Phase 1, and
the Phase 8 report would otherwise claim "clean, no conflicts" on stale information.

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeable,mergeStateStatus
```

`mergeStateStatus` must still be `CLEAN`. If it is now `BEHIND` (someone else's PR merged into
`<baseRefName>` while Phases 2–7.6 ran), auto-rebase the same way as Phase 1b instead of stopping:

```bash
git fetch origin <baseRefName>
git rebase origin/<baseRefName>
```

- If it **succeeds**, the branch is already a single commit from Phase 7.5, so the rebase replays
  cleanly as one commit. Re-validate against the file list Phase 7.5 already proved correct
  (`finish-pr-files-after.txt`, captured post-squash against the *old* base) — preserve it under
  its own name first, since the next command overwrites `finish-pr-files-after.txt` in place:
  ```bash
  cp /tmp/finish-pr-files-after.txt /tmp/finish-pr-files-preverify.txt
  git diff origin/<baseRefName> HEAD --name-only | sort > /tmp/finish-pr-files-after.txt
  diff /tmp/finish-pr-files-preverify.txt /tmp/finish-pr-files-after.txt && echo "MATCH"
  ```
  A clean rebase replays the same patch onto a new parent, so this must still match — a mismatch
  means the rebase silently dropped or altered files and should be treated like a failed diff
  check anywhere else in this command (stop, do not push). Once it matches, push:
  ```bash
  git push --force-with-lease origin HEAD
  ```
  This push restarts CI and the Devin/DeepWiki scan, so re-run 7.6a–7.6c from the top against the
  new commit before Phase 8 declares anything ready — do not reuse the pre-rebase results.
- If it **hits conflicts**, capture the conflicting files *before* aborting — same as Phase 1b:
  ```bash
  git diff --name-only --diff-filter=U
  git rebase --abort
  ```
  Report that file list and stop before Phase 8 (the housekeeping commits already pushed before
  this rebase attempt are not lost — resolve manually, or run `/rebase-main`, then re-run 7.5–7.6).

If `DIRTY`/`BLOCKED` instead, report the reason and stop.

---

## PHASE 8 — Final report

```
## Finish PR #<N> — Ready to merge?

### Pre-flight checks (Phase 1)
- [x] Review threads: all resolved (<M> total)
- [x] Mergeable: clean, no conflicts (as of Phase 1 — re-validated below)

### Final housekeeping (Phases 2–7.5)
- [x] Commits squashed: <before> → 1 (`<sha>`)
- [x] GitHub issue #<NNN> finalized — Tracked <Xh Ym>, checklist ticked, Retrospective added
- [x] Issue archived to doc/tasks/<yyyy-mm>/<NNN>-<slug>.md
- [x] GitHub Project status → Done
- [x] Sprint doc updated — progress now <X>/<Y> (<Z%>) (or: not part of the current sprint, skipped)
- [x] README Sprints table updated (Completed: <Z%>) (or: skipped, same reason)

### Final validation on the merge-ready commit (Phase 7.6)
- [x] CI checks: <M>/<M> passing
- [x] Devin/DeepWiki: 0 bugs (<M> flags — <list Investigate-severity ones, if any>)
- [x] Mergeable: still clean, no conflicts (re-checked post-push — `main` didn't move under us)

### ✅ Ready to merge
Everything above is green. I have not merged it — that's on you:
  gh pr merge <N> --merge      (branch is already a single commit, no need for --squash)
```

If Phase 1 failed, print only that checklist (with the failing items marked ❌ and what's
blocking them) and stop — do not run Phases 2–7.6. If Phase 7.6 failed, print all three sections
(Phase 1 and the housekeeping already happened) with 7.6's failing items marked ❌, and stop before
the "Ready to merge" line.

**Never run `gh pr merge` yourself, regardless of how clean the checklist is.**
