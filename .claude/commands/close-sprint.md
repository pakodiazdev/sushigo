---
allowed-tools: Bash(gh issue create:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh project item-add:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh api:*), Bash(gh workflow run:*), Bash(gh run list:*), Bash(gh run view:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git mv:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(basename:*), Bash(ls:*), Bash(grep:*), Bash(find:*), Bash(sort:*), Bash(tail:*), Bash(date:*), Read, Edit, Write
description: Formally close the current sprint and promote the next one — sprint docs, both README indexes, the GitHub Project Iteration field's date windows, and the committed progress badge, all in one pass
---

# Close sprint — promote the next one

You are formally closing the current sprint and promoting the next planned one, following
`doc/conventions/sprints.md` §4: a sprint is only `Completed` once its own closure checklist is
done **and** the next sprint is promoted. This command assumes the closure checklist work itself
(evidence, time tracking, lessons learned, etc. — §18's other boxes) is already done, by a separate
issue/PR if needed — this command's job is specifically the **promotion** step and everything that
depends on it: both sprint indexes, the GitHub Project's `Iteration` field dates, and the committed
badge. It was written and validated against the Sprint 003 → 004 promotion (`#460`).

**Never merge the PR this command opens.** Same rule as every sibling command — report the URL and
stop; the user merges after review.

---

## PHASE 0 — Preconditions

```bash
ls doc/sprints/*.md | grep -v README | sort | tail -1        # current sprint doc
ls doc/sprints/planned/*.md 2>/dev/null | sort                # candidate next sprint(s)
```

- **Current sprint doc**: read its `§18. Sprint Closure Checklist`. Every box must be `[x]` except
  possibly the last one (`The next sprint was promoted...`) — that's the one this command exists to
  tick. If any *other* box is unticked, **stop** and tell the user the closure checklist itself
  isn't done yet; this command does not do that work.
- **Next sprint candidate**: exactly one file must exist under `doc/sprints/planned/` with the next
  sequential number. If zero exist, stop and ask the user to create/plan one first — do not
  fabricate a sprint document. If more than one exists, stop and ask which one to promote — do not
  guess by filename order alone.
- Confirm the working tree is clean (`git status --short`) before branching.

---

## PHASE 1 — Create the tracking issue

This work needs its own GitHub issue per `doc/conventions/git/commits.md` (no commit without
`[#NNN]`). Follow `doc/conventions/tasks.md`'s Feature template (Description / Reason / Objective +
`## ⏱️ Time` with an empty `Sessions` array). Description covers: closing the outgoing sprint,
promoting the incoming one, correcting the GitHub Project `Iteration` field dates, and refreshing
the badge. Reason cites the outgoing sprint's real delivery date vs. its still-open `status` (per
§4) and the badge drift this causes. Objective: both sprint docs correct, both indexes
synchronized, Iteration dates corrected, badge refreshed.

```bash
gh issue create --repo pakodiazdev/sushigo --title "📚 Promote Sprint <NNN>, close Sprint <MMM>" --body-file <path>
gh project item-add 7 --owner pakodiazdev --url "https://github.com/pakodiazdev/sushigo/issues/<NNN>"
```

Link Status only — never set Iteration on this issue itself as a side effect of filing it (same
rule `/start-issue` follows).

---

## PHASE 2 — Branch and promote the sprint doc

```bash
git fetch origin main
git checkout -b docs/<NNN>-promote-sprint-<next> origin/main
git mv doc/sprints/planned/sprint-<next>-*.md doc/sprints/sprint-<next>-*.md
```

**Incoming sprint's frontmatter**: `status: In Progress`, `started: <today>`,
`last_updated: <today>`, `base_commit:` current `origin/main` short SHA. Leave `previous`/`next` as
already written (the planned doc already points at its siblings correctly).

**Outgoing sprint's frontmatter**: `status: Completed`, `completed: <today>`,
`last_updated: <today>`.

**Outgoing sprint's body** — tick the last `§18` checklist box
(`The next sprint was promoted...`) with the promoting issue number and date; update its intro
note (if the doc has one, like Sprint 003's did) from "not yet formally closed" language to
"formally closed" language; if the outgoing doc's own closure issue left any other now-stale
"still open" / "pending merge" references elsewhere in the doc (§13 Execution Evidence rows,
§15.2 counts, §17 Follow-up rows) because it was written before its own PR merged, correct those
too — a completed sprint document should not contain a self-contradiction about its own closure
state. Mark the `§17` follow-up row that named this exact promotion as `✅`, referencing this
command's issue number.

**Incoming sprint's `§5.4 Opportunistic Work`** — add a row for this promotion issue itself,
mirroring how `sprint-003...md` recorded `#443` (the Sprint 002→003 promotion) as its own
opportunistic entry. This is the established precedent: the promoting issue is recorded in the
sprint it promotes *into*, not the one it closes.

**Both indexes** (`doc/conventions/sprints.md` §2 — updating only one is a repeat of `#386`'s
mistake):
- `doc/sprints/README.md`: outgoing row → `Completed`; add incoming row → `In Progress (current)`.
- Root `README.md`'s `## Sprints` table: outgoing row's `Completed` cell → the real date; add a row
  for the incoming sprint (`Started` = today, `Completed`/`Parallelization` = `—`, `Target` = the
  incoming doc's own `§4` "Planned end" if it states one).

Commit locally (don't push yet):
```bash
git add doc/sprints/ README.md
git commit -m "📚 [#NNN] - Promote Sprint <next>, formally close Sprint <prev> 📅"
```

---

## PHASE 3 — Correct the GitHub Project Iteration field dates

**Context — read before running any mutation.** The `Iteration` field
(`.github/scripts/iteration-progress/normalize.js`'s `pickActiveIteration()`) picks whichever
iteration's `[startDate, startDate+duration)` window contains today, with zero regard for issue
completion. Fixed-cadence windows drift behind actual delivery pace when the team ships faster than
the default (usually 14-day) duration — that drift is exactly what makes the committed badge show a
stale sprint. This phase re-tiles the affected iterations' date windows to match the real sprint
boundaries just recorded in Phase 2's frontmatter.

**Known risk (verified working as of `#460`, but re-verify every run — don't skip Step 3):** the
`updateProjectV2Field` mutation's `iterationConfiguration.iterations` input
(`ProjectV2Iteration { startDate, duration, title }`) has **no `id` field** — it replaces the whole
iterations list. It is not publicly documented whether GitHub preserves existing iteration IDs (and
therefore every issue's existing `Iteration` field assignment) when the list is resent, or
regenerates them. Step 1's snapshot and Step 3's verification are **mandatory**, not optional
hygiene — they are what makes this mutation safe to run unattended.

### Step 1 — Snapshot before touching anything

```bash
gh api graphql -f query='
  query($owner: String!, $number: Int!, $itemsCursor: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        iterationField: field(name: "Iteration") {
          ... on ProjectV2IterationField {
            id
            configuration { iterations { id title startDate duration } }
          }
        }
        items(first: 100, after: $itemsCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            iteration: fieldValueByName(name: "Iteration") {
              ... on ProjectV2ItemFieldIterationValue { iterationId title }
            }
          }
        }
      }
    }
  }
' -f owner=pakodiazdev -F number=7
```

Page through with `itemsCursor` until `hasNextPage` is false. Save the full `{itemId ->
iterationId}` map and the pre-mutation `{iterationId -> title, startDate, duration}` list to a
scratch file — this is the rollback source of truth if Step 3 finds anything broken.

### Step 2 — Compute and apply corrected dates

Using the just-completed and just-promoted sprints' real frontmatter dates from Phase 2:

- The iteration whose **title matches the outgoing sprint** (`"Sprint " + parseInt(outgoing sprint
  number)` — e.g. doc `sprint-003` ↔ GH iteration titled `Sprint 3`; this direct numeric mapping is
  the established convention, confirmed against `sprint-003...md` §18's own text): `startDate` =
  outgoing's `started` frontmatter value, `duration` = (`completed` − `started` in days) + 1, so its
  window ends inclusive of the real completion date.
- The iteration whose **title matches the incoming sprint**: `startDate` = the day immediately
  after the outgoing iteration's new end (= the incoming sprint's `started` date). Leave its
  `duration` unchanged — it's a placeholder that gets corrected at *its own* future closure, by this
  same command. Do not touch any iteration beyond this one.
- If today's date was matched by an *earlier* iteration than the outgoing sprint's own (drift
  accumulated across more than one promotion without correction — check by re-running Step 1's
  query's date ranges against today), shrink that earlier iteration too, so its window ends the day
  before the outgoing iteration's corrected `startDate`. Chain corrections contiguously back to
  whichever iteration is currently active by date — never leave a date gap between two iterations,
  since `pickActiveIteration()` renders the "no active iteration" empty-state badge for any
  uncovered day.
- The mutation resends the **entire** `iterations` list — every iteration not being corrected must
  still be included with its title/startDate/duration unchanged, or it is dropped from the field
  entirely.

```bash
gh api graphql -f query='
  mutation($fieldId: ID!, $iterations: [ProjectV2Iteration!]!) {
    updateProjectV2Field(input: {
      fieldId: $fieldId
      iterationConfiguration: { startDate: "<earliest-startDate-in-list>", duration: 14, iterations: $iterations }
    }) {
      clientMutationId
    }
  }
' -f fieldId=<iteration-field-id> -F iterations='<json array of {startDate,duration,title} for every iteration>'
```

### Step 3 — Verify immediately (mandatory)

Re-run Step 1's query. Compare against the pre-mutation snapshot:
- Same iteration titles present, corrected dates in place.
- Same per-title item counts.
- Ideally, same `iterationId` values per item (if the field lets you compare item `id` → `iteration:
  { iterationId }` before/after).

If IDs changed and item associations were dropped: reassign every affected item back to the correct
iteration via `updateProjectV2ItemFieldValue`, using the Step 1 snapshot as ground truth, then
re-verify. **Report this loudly in the final report if it happens** — do not silently patch and
move on; the user needs to know the mutation's ID-preservation behavior turned out to be unsafe.

---

## PHASE 4 — Refresh the badge

Don't wait for the next scheduled run:

```bash
gh workflow run update-iteration-progress.yml --repo pakodiazdev/sushigo
gh run list --repo pakodiazdev/sushigo --workflow=update-iteration-progress.yml --limit 1
```

Poll `gh run view <run-id> --repo pakodiazdev/sushigo` until `status` is `completed`, then confirm
`.github/badges/iteration-progress.svg` on `main` now shows the iteration title matching the sprint
promoted in Phase 2. This workflow commits directly to `main` on success (it has no `on: push`
trigger, so it can't loop on its own commit) — nothing here needs to fetch/merge that commit into
this branch, since it touches a file this branch doesn't otherwise change.

---

## PHASE 5 — Push and open the PR

```bash
git push -u origin <branch-name>
```

Title: `📚 [#NNN][<workspace-letter>] - Promote Sprint <next>, close Sprint <prev> 📅`. Body:
`Closes #NNN`, `Devin Review:` (added post-creation, per convention), `## Manual Testing` (open
both README indexes and confirm the lifecycle states match; re-open the GitHub Project and confirm
the `Iteration` field's current window matches the promoted sprint), `## Workspace` footer.

```bash
PR_URL=$(gh pr create --title "..." --body "$(cat <<'EOF'
...
EOF
)")
N=$(basename "$(tail -1 <<< "$PR_URL")")
gh pr edit "$N" --body-file <path-with-Devin-Review-line-inserted>
```

**Never merge.** Report the PR URL and stop.

---

## PHASE 6 — Final report

```
## Sprint <prev> closed, Sprint <next> promoted

### Sprint docs
- `sprint-<prev>-*.md` → Completed (<date>)
- `sprint-<next>-*.md` → In Progress, promoted from planned/
- Both indexes (doc/sprints/README.md, root README.md) synchronized

### GitHub Project Iteration dates
| Iteration | Before | After |
|---|---|---|
| <title> | <startDate>/<duration> | <startDate>/<duration> |
...
- Item associations verified intact: <yes / NO — see rollback note below>

### Badge
.github/badges/iteration-progress.svg now shows: "<title>" at <percent>%

### PR
<PR URL> — not merged, awaiting your review
```

If Phase 3's verification found dropped associations, add a `### ⚠️ Iteration mutation risk
materialized` section describing exactly what was reassigned and how, so the user can independently
confirm the Project board looks right before merging.
