# 📑 Task & Issue Tracking Convention

See [TD-01](../decisions/td-01-single-source-issue-tracking.md) for the reasoning behind this
convention and the drift problem it replaced.

## Lifecycle

1. **File the issue directly on GitHub.** No local file precedes it — `doc/tasks/backlog/` is
   retired, nothing new lands there. Link the issue to the **SushiGo Admin** GitHub Project (Status
   field only — never set **Iteration**, the sprint-equivalent field, until a human explicitly
   assigns it to a sprint).
2. **While the issue is open, the GitHub issue is the only copy.** `/start-issue` opens and closes
   work sessions by editing the issue body directly (`gh issue edit`) — no local `.md` is created or
   touched during active work.
3. **At close (`/finish-pr`), the issue is finalized in place**: `Tracked` is recomputed from the
   `Sessions` JSON already in the issue body, completed checklist items are ticked, and a
   `## 📊 Retrospective` section is appended — all directly on the GitHub issue.
4. **Only then is a local archive written**, once, to `doc/tasks/yyyy-mm/<issue-number>-slug.md` —
   a verbatim snapshot of the now-finished issue. The GitHub issue number is the file's only ID,
   forever; there is no separate local numbering scheme to keep in sync.

This keeps exactly one live copy at any point in time. The local archive exists for the reasons the
original template was born from — cheaper for an LLM working in this repo to read a local file than
to round-trip to GitHub's API, and a portability hedge if the project ever moves off GitHub Issues —
without the drift cost of editing two copies concurrently.

---

## Mandatory sections (structure otherwise flexible)

Every issue body must contain, regardless of size or type:

**Feature / enhancement:**
- `## Description` — what this is
- `## Reason` — why it's needed (the motivation, not the mechanism)
- `## Objective` — what "done" looks like

**Bug:**
- `## Bug description` — what's broken, observed vs. expected
- `## Hypothesis` — best current theory of the root cause
- `## Reproduction guide` — concrete steps to trigger it

**Always, on every issue regardless of type** — see "Time Tracking" below:
- `## ⏱️ Time` (Estimates + Sessions) — required from the moment the issue is filed
- `## 📊 Retrospective` — required only once the issue is ready to close, not while it's open;
  added by `/finish-pr`, never pre-created empty

Everything else — Technical Tasks checklists, Acceptance Criteria, backend/frontend breakdowns,
References — follows the fuller template below **when it fits the issue**. A one-file frontend
animation fix does not need a Backend Tasks section; a multi-model feature does. Use judgment, not
a checklist for the checklist's sake.

### Full template (use what applies)

```markdown
# 🐳 Short, action-oriented title with emoji

## Description
...

## Reason
...

## Objective
...

## ✅ Technical Tasks
- [ ] 📂 ...
- [ ] 🔧 ...
- [ ] 🧪 ...

## 🎯 Acceptance Criteria
- [ ] ...

## 🔗 References
- ...

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `Xh` · **Pessimistic:** `Yh` · **Tracked:** _in progress_

### 📅 Sessions
```json
[]
```
```

---

## Time Tracking

### Estimates
Two values in hours, filled when the issue is created:
- **Optimistic:** minimum time if everything goes well.
- **Pessimistic:** maximum time if issues appear.

`Tracked` starts as `_in progress_` and is only ever recomputed by `/finish-pr` from the `Sessions`
array — never edited by hand.

### Sessions
Every issue is created with an empty `Sessions` array. `/start-issue` appends an entry when it opens
a work session and fills its `end` when the session closes:

```json
[
  { "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM" }
]
```

An in-progress session has `"end": "?"`. Multiple sessions accumulate across days if work spans more
than one sitting.

---

## Retrospective (added by `/finish-pr`, mandatory when closing)

Appended directly to the GitHub issue body when the PR closing it is finalized. Compares tracked
time against the original estimates and explains any overrun — this is historical context for
future estimation, and it is what gets carried into the archived `.md` snapshot.

### Format
```markdown
## 📊 Retrospective
- **Actual total:** Xh Xm (Nm + Nm + …)
- **vs optimistic:** +Xh Xm  (or −Xh Xm if under)
- **vs pessimistic:** +Xh Xm  (or −Xh Xm if under)

**Justification:**
<narrative explaining why the task took more (or less) time than estimated.
Focus on activities not contemplated in the original scope: unplanned rework,
discovered technical debt, extra review cycles, scope additions, etc.>
```

### Rules
- **Always fill it when closing** — even if the task finished within the estimate. In that case,
  note what went well.
- **Actual total** must match the sum of every session in the `Sessions` array. Show the per-session
  breakdown in minutes.
- **Justification** must explain *why*, not just *what*. Reviewers should understand the root cause
  after reading it.
- If the task finished under the pessimistic estimate with no surprises, a one-liner justification
  is enough.
- Write in English (consistent with the project language rule).
