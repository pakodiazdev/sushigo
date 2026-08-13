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

## Roadmap planning aliases

Large initiatives may use short aliases to group prospective Issues while the roadmap is being
designed. These aliases are **planning coordinates, not task identifiers**. The GitHub Issue number
is still the only permanent ID once an Issue exists.

### Format

```text
<LANE>-<NN>
```

- `LANE` is an uppercase, documented acronym of 2–5 letters.
- `NN` is a zero-padded sequence starting at `01` within that lane and roadmap.
- A roadmap must define its lane glossary before using an alias.
- Sequence numbers express grouping/order only; they do not imply priority, sprint, or execution
  status.

Example:

```text
DES-01  Design the target architecture
CAT-03  Redesign the Variant contract
OPS-02  Implement purchase receiving
STK-01  Harden concurrent Stock mutations
```

### Standard Inventory roadmap lanes

| Alias | Full name | Scope | Examples |
|---|---|---|---|
| `DES` | Design & Discovery | Architecture, domain decisions, contracts, migration and UI-flow design before implementation | ERD, ADR, API outline, migration plan |
| `CAT` | Catalog | Master/catalog data that defines what is managed, independent of a transaction | Products, Variants, Brands, Categories, Purchase Presentations |
| `OPS` | Inventory Operations | Business transactions and commercial configuration that operate on catalog data | Suppliers, receipts, acquisition cost, price lists |
| `STK` | Stock & Integrity | Stock balances, movements, replenishment, authorization scope and structural cleanup | Concurrency, reversals, thresholds, Operating Unit access |

Within an Inventory roadmap, `OPS` always means **Inventory Operations**, never DevOps. Platform or
developer-experience work uses its existing `dev-tooling`/platform terminology; if it ever needs a
roadmap alias, define a distinct acronym instead of overloading `OPS`.

### Usage rules

1. Use aliases only in a roadmap/design document or its GitHub roadmap index while work is being
   decomposed.
2. Do not place the alias in the GitHub Issue title, branch name, commit, PR title, session record,
   or archive filename. Those use the real `#<number>` identity and the existing conventions.
3. When the Issues are created, add one mapping table to the roadmap:

   ```markdown
   | Planning alias | GitHub Issue |
   |---|---:|
   | DES-01 | #421 |
   | CAT-01 | #422 |
   ```

4. From that point forward, dependencies and execution evidence must reference `#421`, `#422`,
   etc., not only `DES-01` or `CAT-01`.
5. Never maintain a second live Issue body under the alias. The roadmap may retain a frozen summary
   and mapping, but scope, checklists, estimates, Sessions, and Retrospective live only on GitHub.
6. An alias is unique only inside its declared roadmap. Cross-roadmap communication must use the
   GitHub Issue number and title to avoid collisions such as two unrelated `CAT-01` entries.
7. If a new lane is needed, document its acronym, full name, scope boundary, and examples here or in
   the domain's convention before using it. Prefer an existing lane when the boundary already fits.
8. Reclassifying an Issue never changes its GitHub number. Update the roadmap mapping/glossary and
   dependency explanation; do not rename historical IDs as if they were permanent task numbers.

### What aliases do not encode

Planning aliases never encode:

- GitHub Issue identity.
- Priority or value tier.
- GitHub Project Status.
- Sprint label or Iteration.
- Backend/frontend ownership.
- Completion state.

Those remain explicit GitHub fields, labels, Issue references, and sprint evidence.

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
