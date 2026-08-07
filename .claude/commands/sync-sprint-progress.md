---
allowed-tools: Bash(git fetch:*), Bash(git rebase:*), Bash(git reset:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh issue view:*), Bash(ls:*), Bash(grep:*), Bash(python3:*), Read, Edit, Write
description: Squash the current branch to one commit, then refresh the current sprint document and README with each scoped issue's real merge status
---

# Sync sprint progress

Two things, always together: unify the current branch's commits into one, and make the sprint
document / README stop lying about which issues are actually merged. Run this any time you've been
working a long PR and other sprint issues have merged to `main` in the meantime — the numbers this
PR wrote when it was opened (or last refreshed) are stale by the time it's ready.

## Steps

### 1. Squash the current branch to one commit

```bash
git status --short
git branch --show-current
```

- If there are uncommitted changes, stop and tell the user to commit or stash first.
- If the branch is already a single commit ahead of `origin/main` (`git log --oneline origin/main..HEAD | wc -l` = 1), skip to step 2 — nothing to squash yet, but the doc refresh still needs to happen.

```bash
git fetch origin main
git diff origin/main HEAD --name-only | sort > /tmp/sync-sprint-files-before.txt
git log --format='%B' --reverse origin/main..HEAD   # read every commit message before squashing
git reset --soft origin/main
```

Synthesize **one** commit message covering every squashed commit's substance (same rules as
`/finish-pr` Phase 2: dominant emoji, merge near-duplicate bullets, drop pure bookkeeping bullets,
reuse the issue number already used on the branch). Commit it, then verify nothing was lost:

```bash
git commit -m "<synthesized message>"
git diff origin/main HEAD --name-only | sort > /tmp/sync-sprint-files-after.txt
diff /tmp/sync-sprint-files-before.txt /tmp/sync-sprint-files-after.txt && echo MATCH
```

If the diff doesn't match, stop and report — do not push a divergent diff. Don't push yet; the
doc refresh in the next steps amends into this same commit so the branch stays at exactly one.

### 2. Find the current sprint document

```bash
ls doc/sprints/*.md | grep -v README | sort | tail -1
```

### 3. Collect every issue/PR pair the document tracks

Scan the sprint doc's `## 13. Execution Evidence` table (and the `## 7.`/Route round tables, and
`### 5.4 Opportunistic Work` if present) for every `PR #NNN` reference, paired with its issue
number. Include issues outside the formally scoped count too (Opportunistic work) — they get their
own wording fixed even though they don't move the scoped percentage.

### 4. Check each PR's real state

For every `PR #NNN` found:

```bash
gh pr view <NNN> --repo pakodiazdev/sushigo --json number,state,mergedAt,mergeCommit
```

Build a mapping of `PR number -> short merge commit SHA` for every PR where `state == "MERGED"`.
Leave anything still `OPEN` alone — its row must keep saying so, not get silently marked merged.

Also check the linked issue's own state as a sanity signal (`gh issue view <NNN> --json
state,closed,closedAt`) — if an issue is `CLOSED` while its own tracked PR is still `OPEN` (closed
without merging, or by some other path), that's an anomaly. Don't silently paper over it: surface
it to the user in the final report as its own line, and don't count that issue as "merged" in the
recomputed percentage just because it happens to be closed.

### 5. Rewrite every now-merged row

For each `PR #NNN` that is now merged and whose row doesn't yet reflect it, update in place across
every section that mentions it (Round tables, Execution Evidence, Executive Summary, Timeline,
Opportunistic Work):

- **Execution Evidence's `Merge Commit` column**: replace the placeholder (`—`) with the short SHA
  in backticks.
- **Result Summary / Notes trailing clauses**: replace phrases like `PR open, not yet merged`, `PR
  ready, merge pending`, or `PR #NNN open` with `merged to \`main\` (\`sha\`)` (or an equivalent
  phrase matching the surrounding sentence).
- Leave every row whose PR is still genuinely `OPEN` completely untouched — including its own
  "PR ready, merge pending" wording, which is still true for it.

A small Python script scanning line-by-line for `| PR #NNN |` (or the equivalent inline form) per
mapped PR number is more reliable than manual edits here — there are usually 10+ scattered
occurrences across sections and hand-editing each one risks missing one or touching the wrong row.

### 6. Recompute the scoped completion count

Recount "Issues completed" using the *scoped* issue list only (`scope_issues` in the doc's
frontmatter, and the actual list of issue numbers the doc scopes — not Opportunistic work, which
tracks separately and never moves this percentage). An issue counts as completed here only if its
PR is `MERGED` (or, for the one PR still open when this command is run for its own in-progress
work, if it's fully implemented and reviewed and just awaiting merge — match whatever phrasing
convention the document already uses for that "done, not yet merged" case).

Update the recomputed `N / scope_issues (P%)` figure and its accompanying issue list everywhere it
appears:
- `## 1. Executive Summary`'s "Progress as of `<date>`" line — also bump the date to today.
- `## 4. Sprint Timeline`'s "Progress (Issues completed)" row.
- The root `README.md`'s `## Sprints` table, the current sprint's `Completed` cell (percentage
  format, e.g. `71.4% (10/14)` — only becomes an actual date once the sprint formally closes, per
  `doc/conventions/sprints.md` §6).

### 7. Amend the doc changes into the same commit

```bash
git add doc/sprints/ README.md
git commit --amend --no-edit
```

If step 1 needed a real commit-message synthesis (not skipped), fold a short trailing bullet into
that message instead of using `--no-edit` — e.g. `📊 Refreshed Sprint NNN progress to X/Y (Z%) and
backfilled real merge commit SHAs for N other sprint issues merged during review`.

### 8. Push

```bash
git push --force-with-lease origin HEAD
```

### 9. Report

```
## Sprint progress synced

### Commits
Squashed <before> → 1 (`<sha>`) (or: already a single commit, nothing to squash)

### Sprint doc: <sprint-file>
- Issues newly marked merged: #NNN (PR #NNN, `sha`), ...
- Progress: <old N>/<scope> (<old P%>) → <new N>/<scope> (<new P%>)

### README
Sprints table Completed cell updated to <new P%>

### Anomalies (if any)
- #NNN: issue closed but PR #NNN still open — not counted as merged, flagged for you to check
```
