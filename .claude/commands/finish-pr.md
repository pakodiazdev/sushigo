---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr edit:*), Bash(gh pr diff:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh api:*), Bash(gh project:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(git merge-base:*), Bash(git reset:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(date:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Read, Edit, Write, WebFetch
description: Validate a PR is ready to merge and perform the final housekeeping (squash commits, sync issue/sprint/README time tracking, move the issue to Done) — never merges automatically
argument-hint: [pr-number]
---

# Finish PR — #$ARGUMENTS

You are closing out a GitHub Pull Request for the SushiGo monorepo: verifying it is actually ready
to merge, then doing every piece of bookkeeping a human would otherwise have to do by hand before
merging — **except the merge itself**.

**Call this only after the human has manually tested the PR and approved it.** Your job is to
confirm review threads and mergeable state, then finish the paperwork — squash the branch to one
commit, close out the task file, sync time tracking back to the GitHub issue, move the issue to
Done on the project board, and update the sprint document and root README — and only then check
CI and the automated review (Devin/DeepWiki), once, against the final commit that push produced.
Doing it in that order (paperwork before the CI/Devin check, not after) means CI and Devin's scan
each restart exactly once instead of on every intermediate push. You report a checklist at the
end. **You never run `gh pr merge`.** The user merges by hand once your report says everything is
green.

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

`mergeStateStatus` must be `CLEAN`. If it is `BEHIND`, tell the user to run `/rebase-main` first.
If it is `DIRTY` (conflicts) or `BLOCKED`, report the reason and stop.

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
  — that history now lives in the task file's Sessions and in the Retrospective added in Phase 3,
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

## PHASE 3 — Close out the local task file

Find the task file: `doc/tasks/**/<NNN>-*.md` (it has already moved out of `backlog/` if
`/start-issue` was used — if it's still in `backlog/`, that's a sign the issue was never formally
started; move it to the current month's folder first).

1. Recompute `Tracked` in `## ⏱️ Time` → Estimates as the sum of every session in the `Sessions`
   JSON array (do not trust a stale value — recompute from the raw start/end pairs).
2. Cross-check every unticked `[ ]` box in the Technical Tasks / Acceptance Criteria sections
   against what actually shipped in this PR's diff. Tick any that are genuinely done. Never tick
   a box for work you can't verify landed in this PR.
3. Add a `## 📊 Retrospective` section per `doc/conventions/tasks.md` §5 — actual total (with the
   per-session minute breakdown), variance vs. optimistic and pessimistic, and a narrative
   justification. The justification must explain *why* the tracked time came out the way it did —
   scope changes requested mid-flight, review-response cycles, rework — not just restate *what*
   was built.

Commit this as its own commit (separate from the squashed feature commit). Local only — do not
push; Phase 7.5 pushes everything once at the end:

```bash
git add doc/tasks/...
git commit -m "🔧 [#NNN] - Finalize task #NNN before merge 📊

- 📊 Fill Tracked time and add Retrospective per doc/conventions/tasks.md
- ✅ Tick completed Technical Task / Acceptance Criteria boxes"
```

---

## PHASE 4 — Sync the GitHub issue

```bash
gh issue view <NNN> --repo <owner>/<repo> --json body
```

Replace the issue body's `## ⏱️ Time` section with the task file's final `Estimates` and
`Sessions` (identical content — the issue is the second copy the CLAUDE.md task-closing checklist
requires), and append the same `## 📊 Retrospective` section added in Phase 3.

```bash
gh issue edit <NNN> --repo <owner>/<repo> --body "<updated body>"
```

Do **not** close the issue here — merging the PR closes it automatically via `Closes #NNN`.

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

For every project the issue is linked to:

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

---

## PHASE 6 — Update the current sprint document

Determine the current sprint: the **highest-numbered** `sprint-NNN-*.md` file directly under
`doc/sprints/` (not `doc/sprints/planned/`).

```bash
ls doc/sprints/*.md | grep -v README | sort | tail -1
```

In that file:

1. **§7 Route A execution rounds** — find the row for this issue in whichever round table
   contains it. Update: status marker → `✅`, `Tracked` → the task file's final Tracked value
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
or crash), but none of them push — this phase is the **only** push in the whole command. Folding
everything into one commit here, instead of after every phase, means CI and the Devin/DeepWiki
scan (Phase 7.6) each run exactly once instead of restarting on every intermediate push:

```bash
git fetch origin <baseRefName>
git diff origin/<baseRefName> HEAD --name-only | sort > /tmp/finish-pr-files-before.txt
git reset --soft origin/<baseRefName>
```

Write one final commit message that is the Phase 2 message with any genuinely new substance from
Phases 3/6/7 folded in as trailing bullets (task file finalized, sprint/README progress updated) —
do not just concatenate every intermediate commit message verbatim.

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

This is the only point in the flow where CI and the Devin/DeepWiki scan are checked, because
Phase 7.5's push is the only push in the whole command — checking earlier would just describe a
commit that's since been replaced. It also re-checks mergeable state (7.6c), since Phase 1's
`CLEAN` result can go stale while Phases 2–7.5 run.

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

Phase 1's `mergeStateStatus: CLEAN` check ran before Phases 2–7.5, which can take a while (task
file writeup, sprint doc, README, waiting on CI/Devin above). If `main` advanced during that
window — someone else's PR merged — the branch can have silently gone `BEHIND` since Phase 1, and
the Phase 8 report would otherwise claim "clean, no conflicts" on stale information.

```bash
gh pr view <N> --repo <owner>/<repo> --json mergeable,mergeStateStatus
```

`mergeStateStatus` must still be `CLEAN`. If it is now `BEHIND`, tell the user to run
`/rebase-main` — same as Phase 1b, just caught late — and stop before Phase 8 declares anything
ready (the housekeeping commits already pushed are not lost; re-run only 7.5–7.6 after the rebase
lands, no need for the whole command again). If `DIRTY`/`BLOCKED`, report the reason and stop.

---

## PHASE 8 — Final report

```
## Finish PR #<N> — Ready to merge?

### Pre-flight checks (Phase 1)
- [x] Review threads: all resolved (<M> total)
- [x] Mergeable: clean, no conflicts (as of Phase 1 — re-validated below)

### Final housekeeping (Phases 2–7.5)
- [x] Commits squashed: <before> → 1 (`<sha>`)
- [x] Task file closed — Tracked <Xh Ym>, Retrospective added
- [x] GitHub issue #<NNN> Time section synced
- [x] GitHub Project status → Done
- [x] Sprint doc updated — progress now <X>/<Y> (<Z%>)
- [x] README Sprints table updated (Completed: <Z%>)

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
