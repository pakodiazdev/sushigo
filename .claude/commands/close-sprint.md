---
allowed-tools: Bash(gh issue create:*), Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh project item-add:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh api:*), Bash(gh workflow run:*), Bash(gh run list:*), Bash(gh run view:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git mv:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(basename:*), Bash(ls:*), Bash(grep:*), Bash(find:*), Bash(sort:*), Bash(tail:*), Bash(date:*), Bash(python3:*), Read, Edit, Write
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
- **Next sprint candidate**: `doc/sprints/planned/` may legitimately hold several sprints planned
  ahead of time (e.g. `sprint-005-...md` and `sprint-006-...md` coexisting) — that's normal, not an
  error. Select the one file whose sprint number is exactly the current sprint's number **+1**; the
  rest stay untouched in `planned/`. If no file has that exact next number, stop and ask the user to
  create/plan it first — do not fabricate a sprint document, and do not promote a later-numbered
  sprint out of order even if it's the only one that happens to exist.
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

`<next>`/`<prev>` below are the sprint numbers (e.g. `004`/`003`) — the issue number (`<NNN>`,
referenced by every later phase) isn't known until `gh issue create` returns it, so capture it
before linking the project item:

```bash
ISSUE_URL=$(gh issue create --repo pakodiazdev/sushigo --title "📚 Promote Sprint <next>, close Sprint <prev>" --body-file <path>)
NNN=$(basename "$ISSUE_URL")
gh project item-add 7 --owner pakodiazdev --url "$ISSUE_URL"
```

Link Status only — never set Iteration on this issue itself as a side effect of filing it (same
rule `/start-issue` follows).

---

## PHASE 2 — Branch and promote the sprint doc

```bash
git fetch origin main
git checkout -b docs/<NNN>-promote-sprint-<next> origin/main
SPRINT_FILE=$(basename doc/sprints/planned/sprint-<next>-*.md)
git mv "doc/sprints/planned/$SPRINT_FILE" "doc/sprints/$SPRINT_FILE"
```

The destination side of a `git mv` does not glob-expand — only the source does. Resolving the real
filename first and reusing it as the destination's basename avoids literally renaming the file to
`sprint-<next>-*.md`.

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

**Known risk (empirically confirmed destructive during `#460` — do not soften this on a future
edit):** the `updateProjectV2Field` mutation's `iterationConfiguration.iterations` input
(`ProjectV2Iteration { startDate, duration, title }`) has **no `id` field** — it replaces the
**entire** iteration history, not just the entries you send. Observed behavior, not a theoretical
risk:
- Every iteration's internal ID is regenerated on **every** call, including ones you didn't touch.
  This immediately drops every issue's existing `Iteration` field assignment project-wide, not only
  for the sprints being corrected.
- `completedIterations` is **not** part of the input and is **not** preserved automatically — if a
  historical (already-completed) iteration isn't included in the `iterations` array you send, it is
  deleted from the field's history entirely, with no way to recreate it as the same entity again.
  During `#460`'s first call, sending only the current/future iterations silently erased `Sprint 1`
  from the project's history.

Because of this, **Step 3's reassignment is the expected normal outcome of every run, not a rare
failure path** — plan for it, don't treat it as an exception. Step 1's snapshot is the only way to
recover, so treat the file it writes as read-only for the rest of this phase: **never write a later
query's output to the same path** (this happened for real during `#460`'s recovery and destroyed
the original mapping, forcing a slower, less certain reconstruction from the sprint documents
instead — see that PR's `## ⚠️ Needs Human Judgment` section for what that cost).

### Step 1 — Snapshot before touching anything (read-only afterward)

```bash
gh api graphql -f query='
  query($owner: String!, $number: Int!, $itemsCursor: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        iterationField: field(name: "Iteration") {
          ... on ProjectV2IterationField {
            id
            configuration {
              iterations { id title startDate duration }
              completedIterations { id title startDate duration }
            }
          }
        }
        items(first: 100, after: $itemsCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content { ... on Issue { number title repository { nameWithOwner } } }
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

Page through with `itemsCursor` until `hasNextPage` is false. Save to a **uniquely named** file —
e.g. `snapshot-before-<issue-number>.json`, never a fixed/reusable name like `snapshot-before.json`
that a later verification pass in this same phase might overwrite:
- The full `{itemId -> issueNumber, repo, iterationTitle}` map (issue number + repo, not just the
  raw `iterationId`, since every ID becomes invalid after Step 2's mutation anyway — the title is
  what you'll re-resolve against after the mutation).
- Both `iterations` **and** `completedIterations` — you need every historical iteration's
  `title`/`startDate`/`duration` to resend the full history in Step 2.

### Step 2 — Compute and apply corrected dates

Using the just-completed and just-promoted sprints' real frontmatter dates from Phase 2:

- The iteration whose **title matches the outgoing sprint** (`"Sprint " + parseInt(outgoing sprint
  number)` — e.g. doc `sprint-003` ↔ GH iteration titled `Sprint 3`; this direct numeric mapping is
  the established convention, confirmed against `sprint-003...md` §18's own text): `startDate` =
  outgoing's `started` frontmatter value, `duration` = `completed` − `started` **in days, with no
  +1**. `pickActiveIteration()`'s window is `[startDate, startDate+duration)` — exclusive at the
  end — so this makes the outgoing iteration's boundary land exactly on `completed`, i.e. it covers
  up through the day *before* `completed`, not `completed` itself. Getting this +1 wrong is exactly
  what made `#460`'s own promotion still show the outgoing sprint as current on promotion day —
  don't reintroduce it.
- The iteration whose **title matches the incoming sprint**: `startDate` = the outgoing iteration's
  new (exclusive) boundary, which by construction now equals `completed`, which equals the incoming
  sprint's `started` date — all three are the same day, and Phase 4's verification depends on that:
  the badge must show the incoming sprint starting the same day this command runs, not the day
  after. Leave `duration` unchanged — it's a placeholder that gets corrected at *its own* future
  closure, by this same command. Do not touch any iteration beyond this one.
- If today's date was matched by an *earlier* iteration than the outgoing sprint's own (drift
  accumulated across more than one promotion without correction — check by re-running Step 1's
  query's date ranges against today), shrink that earlier iteration too, so its window ends the day
  before the outgoing iteration's corrected `startDate`. Chain corrections contiguously back to
  whichever iteration is currently active by date — never leave a date gap between two iterations,
  since `pickActiveIteration()` renders the "no active iteration" empty-state badge for any
  uncovered day.
- **The mutation resends the entire iteration history — past, current, and future.** Include every
  iteration from both Step 1's `iterations` and `completedIterations` lists, title/startDate/duration
  unchanged for anything not being corrected. Omitting a completed iteration deletes it permanently
  (see the risk note above) — this is not optional cleanup, it is required every single call.

`gh api graphql -f`/`-F` cannot carry an array-of-objects variable (`-F iterations=<json>` fails
with "Expected ... to be a key-value object") — build the full request body and pipe it through
`--input -` instead:

```bash
python3 -c "
import json, subprocess
iterations = [
    # one entry per iteration in the FULL history (completed + current + future),
    # corrected dates only for the outgoing/incoming pair per the rules above
    {'startDate': '<YYYY-MM-DD>', 'duration': <int>, 'title': '<title>'},
    # ...
]
mutation = '''
mutation(\$fieldId: ID!, \$startDate: Date!, \$duration: Int!, \$iterations: [ProjectV2Iteration!]!) {
  updateProjectV2Field(input: {
    fieldId: \$fieldId
    iterationConfiguration: { startDate: \$startDate, duration: \$duration, iterations: \$iterations }
  }) {
    projectV2Field {
      ... on ProjectV2IterationField {
        configuration { iterations { id title startDate duration } completedIterations { id title startDate duration } }
      }
    }
  }
}
'''
payload = {'query': mutation, 'variables': {
    'fieldId': '<iteration-field-id>',
    'startDate': iterations[0]['startDate'],
    'duration': iterations[0]['duration'],
    'iterations': iterations,
}}
out = subprocess.run(['gh', 'api', 'graphql', '--input', '-'], input=json.dumps(payload), capture_output=True, text=True)
print(out.stdout, out.stderr)
if out.returncode != 0 or '\"errors\"' in out.stdout:
    raise SystemExit(f'Iteration mutation failed (exit {out.returncode}) — stopping before Step 3. Nothing was reassigned yet, but the field\'s date/iteration-list state may already be partially changed; re-run Step 1\'s read query to check before retrying.')
"
```

`subprocess.run()` does not raise on a nonzero exit by itself — the explicit `returncode`/`\"errors\"`
check above (and the `SystemExit` it raises) is what actually stops this phase on failure. Without
it, a failed mutation only prints to stderr and Step 3 proceeds to reassign items against
whatever the field's state actually ended up being, which may not match what was intended.

### Step 3 — Reassign every item, then verify (mandatory, expect to need it)

Re-run Step 1's query. The response's `iterations`/`completedIterations` IDs will differ from the
snapshot — that alone is not a problem, since Step 1 recorded issue number/repo/title rather than
raw IDs. What matters:

1. Build `{title -> new iterationId}` from this fresh query.
2. For every item in Step 1's snapshot, call `updateProjectV2ItemFieldValue` to set its `iterationId`
   to the new ID matching its recorded title (match by the item's real `content.number`+`repo`
   against a freshly-fetched current item list, not by the now-invalid old `itemId`/`iterationId`
   alone — item IDs can also change across saves). Track which calls fail (nonzero exit or an
   `"errors"` key in the response) instead of assuming every call succeeds.
3. **Retry every failed call once** before re-verifying — a single transient API error should not
   escalate to a stop.
4. Re-run Step 1's query a second time and confirm per-title item counts match the original
   snapshot's counts exactly.

Step 2 clears every item's Iteration value project-wide (see the risk note above), so a Step 3
failure does not just skip a badge update — it leaves the live project board in a genuinely
incomplete state until every item is reassigned. Because of that:

- **If every count matches after the retry: continue to Phase 4.**
- **If any count still doesn't match for the outgoing or incoming sprint specifically** (the two
  this run is actively correcting, and the ones the badge and Phase 4's verification depend on):
  **stop here.** Do not proceed to Phase 4 (badge refresh) or Phase 5 (PR) with the board in this
  state. Report the exact mismatch (sprint title, expected vs. actual count, which items are
  unaccounted for) and ask the user how to proceed — retry manually, or accept the gap and continue
  explicitly on their say-so — the same way `#460`'s own run stopped and asked before continuing
  through a blocked classifier action.
- **If a mismatch is confined to an older, already-closed sprint** unrelated to today's promotion
  (as happened during `#460` — two historical sprints came back one item short each, from a snapshot
  reconstruction issue, not a live board corruption): report it clearly in the final report and
  it's fine to continue, since it doesn't affect the badge or any active work — but state this
  explicitly rather than silently treating "no match" the same way regardless of which sprint it's
  on.

---

## PHASE 4 — Refresh the badge

Don't wait for the next scheduled run. `gh workflow run` doesn't reliably hand back the run it just
created, and a plain `gh run list --limit 1` right after dispatching can instead return an unrelated
run — the daily `schedule` trigger firing at the same moment, or a run from a completely different
workflow if timing is unlucky. Record a timestamp before dispatching, then filter by trigger type
and creation time instead of trusting "most recent":

```bash
DISPATCH_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run update-iteration-progress.yml --repo pakodiazdev/sushigo
sleep 5   # give the dispatch a moment to register as a queued/in-progress run
RUN_ID=$(gh run list --repo pakodiazdev/sushigo --workflow=update-iteration-progress.yml \
  --json databaseId,event,createdAt --jq \
  "[.[] | select(.event == \"workflow_dispatch\" and .createdAt >= \"$DISPATCH_TIME\")] | first | .databaseId")
```

If `RUN_ID` is empty, the run hasn't registered yet — wait a few more seconds and re-query rather
than falling back to `--limit 1`. Poll `gh run view "$RUN_ID" --repo pakodiazdev/sushigo` until
`status` is `completed`, then confirm the badge on the dedicated `badges` branch (see `#462` — it
no longer lives on `main`) now shows the iteration title matching the sprint promoted in Phase 2:

```bash
curl -fsSL https://raw.githubusercontent.com/pakodiazdev/sushigo/badges/iteration-progress.svg | grep -o 'Sprint [0-9]*'
# or: git show origin/badges:iteration-progress.svg | grep -o 'Sprint [0-9]*'
```

This workflow amends a single commit on `badges` and force-pushes it (it has no `on: push` trigger,
so it can't loop on its own commit) — nothing here needs to fetch/merge that commit into this
branch, since `badges` holds nothing this branch otherwise touches.

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
`badges` branch now shows: "<title>" at <percent>%

### PR
<PR URL> — not merged, awaiting your review
```

If Phase 3's verification found dropped associations, add a `### ⚠️ Iteration mutation risk
materialized` section describing exactly what was reassigned and how, so the user can independently
confirm the Project board looks right before merging.
