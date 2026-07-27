# Sprint Documentation Convention

> **Location:** `doc/conventions/sprints.md`  
> **Applies to:** all SushiGo sprint documents  
> **Source of truth:** the repository  
> **Operational platform:** GitHub Projects, Issues, Pull Requests, and Actions

---

## 1. Purpose

Sprint documents preserve the permanent engineering history of SushiGo.

GitHub is used to operate the work:

- backlog management;
- Issue discussion and assignment;
- Pull Request review;
- checks and automation;
- project-board visualization.

The repository preserves the evidence:

- sprint purpose and context;
- selected scope;
- value ranking;
- execution rounds;
- dependencies;
- file-conflict analysis;
- estimates and actual time;
- technical and product decisions;
- delivered value;
- quality results;
- lessons learned.

> **GitHub is the operational workspace. The repository is the permanent engineering record.**

A sprint document must remain understandable even if SushiGo is migrated to another project-management platform.

External links may be included, but the document must also preserve the relevant Issue numbers, titles, summaries, estimates, decisions, results, and evidence.

---

## 2. Directory Structure

Sprint documentation lives under:

```text
doc/
├── conventions/
│   └── sprints.md
└── sprints/
    ├── README.md
    ├── sprint-000-introduction.md
    ├── sprint-001-attendance-payroll-quality.md
    ├── sprint-002-<delivered-value>.md
    └── planned/
        └── sprint-003-<expected-value>.md
```

### `doc/sprints/`

This directory contains:

- the current sprint;
- every completed sprint;
- `sprint-000-introduction.md`;
- the sprint index in `README.md`.

The sprint with the **highest sequential number directly inside `doc/sprints/`** is the current sprint.

Every lower-numbered sprint directly inside `doc/sprints/` is completed.

There must never be more than one current sprint.

### `doc/sprints/planned/`

This directory contains future sprints that have been identified but have not started.

It may normally be empty.

A planned sprint should be created only when enough discovered work exists to define another coherent increment of business or engineering value.

When a planned sprint starts, its document is moved to `doc/sprints/` without changing its filename:

```bash
git mv   doc/sprints/planned/sprint-003-purchase-traceability.md   doc/sprints/sprint-003-purchase-traceability.md
```

After this move:

- the promoted sprint becomes current;
- the previous highest-numbered sprint becomes completed.

---

## 3. File Naming Convention

Sprint files follow this format:

```text
sprint-NNN-short-value-title.md
```

Examples:

```text
sprint-000-introduction.md
sprint-001-attendance-payroll-quality.md
sprint-002-inventory-reliability.md
sprint-003-purchase-traceability.md
```

### Naming rules

1. The `sprint-` prefix is mandatory.
2. `NNN` is a sequential number with **exactly three digits** (`000`–`999`), giving the project a capacity of 999 sprints — a two-digit scheme (`00`–`99`) would cap out at 99.
3. Sprint numbers are never reused.
4. Filenames use lowercase `kebab-case`.
5. The title summarizes the principal business or engineering value sought by the sprint.
6. The title does not need to list every Issue, module, or technical change.
7. Dates, statuses, estimates, and tracked time must not appear in the filename.
8. The filename must remain unchanged throughout the sprint lifecycle.
9. A sprint file may move only from `planned/` to `doc/sprints/`.
10. Completed sprint files must not be renamed or moved.
11. `sprint-000-introduction.md` documents the transition to sprint-based development. It does not represent the beginning of the SushiGo product.

### Valid examples

```text
sprint-004-stock-reliability.md
sprint-005-payroll-period-integrity.md
sprint-006-component-consistency.md
```

### Invalid examples

```text
Sprint001.md
sprint_001_attendance.md
completed-sprint-001-attendance.md
sprint-1-misc.md
sprint-01-attendance.md
sprint-002-2026-07-26-attendance.md
sprint-003-fix-issues-325-and-328.md
```

---

## 4. Sprint Lifecycle

The normal lifecycle is:

```text
Planned
   ↓
In Progress
   ↓
Completed
```

The sprint location determines its lifecycle role:

| Location | Meaning |
|---|---|
| `doc/sprints/planned/` | Planned but not started |
| Highest-numbered sprint in `doc/sprints/` | Current / In Progress |
| Lower-numbered sprints in `doc/sprints/` | Completed |

### Lifecycle rules

- A planned sprint number must be greater than the current sprint number.
- A planned sprint does not start until it is moved to `doc/sprints/`.
- The current sprint remains current until the next sprint is promoted.
- A sprint may finish implementation before its evidence, metrics, and lessons are fully consolidated.
- A sprint is formally completed when its closure checklist is complete and the next sprint becomes current.
- Completed sprint documents are historical records and should be treated as immutable.
- Completed documents may be changed only to fix typos, broken links, missing evidence, or factual errors.
- Historical work must not be removed merely to make the sprint appear cleaner.
- A cancelled planned sprint must remain documented, must include its cancellation reason, and its number must not be reused.

---

## 5. Work Item Status Markers

Every Issue or task listed in a sprint must use exactly one status marker.

| Marker | Status | Meaning |
|---|---|---|
| ⏳ | Pending | Approved for the sprint but not started |
| 🚧 | In Progress | Implementation, review, or validation has started |
| ✅ | Completed | Acceptance criteria were met and evidence was recorded |
| ⚠️ | Deprecated | The work or approach was superseded and should no longer be used |
| ❌ | Cancelled | Explicitly removed or no longer required |

### Status rules

- Every listed work item must have one marker.
- `⚠️ Deprecated` and `❌ Cancelled` entries must remain in the document.
- A deprecated item must identify its replacement or superseding decision.
- A cancelled item must include its reason.
- A blocked item remains `⏳ Pending` and records its blocker in `Dependencies` or `Notes`.
- Status markers must be updated as work advances.
- Emoji markers support readability and evidence tracking; they do not replace GitHub Issue state or acceptance criteria.

Example:

```markdown
| Status | Issue | Title | Notes |
|---|---:|---|---|
| ✅ | #325 | Fix attendance dialog overlay | Delivered in PR #341 |
| 🚧 | #328 | Correct recorded attendance event | Frontend review pending |
| ⏳ | #306 | Add explicit button types | Starts after #328 |
| ⚠️ | #318 | Track TODO tags manually | Superseded by automated rule |
| ❌ | #85 | Flutter mobile bootstrap | Removed from this sprint |
```

---

## 6. Required Sprint Metadata

Every sprint document begins with YAML front matter.

```yaml
---
sprint: "001"
title: Attendance, Payroll & Quality
status: In Progress

created: 2026-07-25
started: 2026-07-26
completed:
last_updated: 2026-07-26

base_branch: main
base_commit: 079a316
scope_issues: 26

github_project:
github_milestone:

previous: sprint-000-introduction.md
next:
---
```

### Allowed sprint status values

```text
Planned
In Progress
Completed
Cancelled
```

`Deprecated` is a work-item state, not a sprint lifecycle state.

### Date definitions

| Field | Meaning |
|---|---|
| `created` | Date when the sprint was designed or documented |
| `started` | Date when execution actually began |
| `completed` | Date when the sprint was formally closed |
| `last_updated` | Date of the latest material document update |

### Metadata rules

- Dates use ISO 8601: `YYYY-MM-DD`.
- Lifecycle dates belong inside the document, never in the filename.
- `sprint` must be quoted (`sprint: "001"`, not `sprint: 001`) — some YAML 1.1 parsers treat an unquoted leading-zero value as an octal/number literal and silently drop the padding, breaking the stable 3-digit ID.
- `base_commit` records the repository state used during planning.
- `scope_issues` records the number of Issues initially selected.
- `started` remains empty while the sprint is planned.
- `completed` remains empty until formal closure.
- `previous` points to the preceding sprint filename.
- `next` is filled only when the next sprint is known.
- GitHub fields may remain empty when no corresponding resource exists.

---

## 7. Time and Duration Rules

Calendar duration and engineering effort are different measurements.

A sprint may remain open for several calendar days while accumulating fewer effective work hours.

Both must be documented.

### Sprint timeline

```markdown
## Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-07-25 |
| Started | 2026-07-26 |
| Completed | 2026-08-12 |
| Calendar duration | 18 days |
| Active workdays | 9 days |
```

### Consolidated effort

```markdown
## Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | 4h | 4.5h | +0.5h |
| Implementation | 38h | 39h | +1h |
| Code review and validation | 4h | 3h | -1h |
| Documentation | 2h | 2h | 0h |
| Rework and corrections | 3h | 1.5h | -1.5h |
| **Total** | **51h** | **50h** | **-1h** |
```

### Time-tracking rules

- Original estimates must not be overwritten.
- Revised estimates must be recorded separately with their reason.
- Tracked time should come from the sessions recorded in each GitHub Issue.
- Sprint totals must equal the sum of their underlying Issue totals.
- Implementation time should be separated from planning, review, validation, documentation, and rework when those values are available.
- Estimate variance must be calculated per round and for the complete sprint.
- Negative variance means execution beat the estimate.
- Positive variance means execution exceeded the estimate.

---

## 8. Standard Sprint Document Structure

Every sprint document must use the following section order.

Mandatory headings must remain stable to improve navigation, migration, automation, and AI retrieval.

A section may state `Not applicable`, but it must not be silently removed.

**Exception:** `sprint-000-introduction.md` does not follow this structure — per Naming Rule 11, it documents the transition to sprint-based development using a narrative format instead, since it predates the process it introduces.

The template below is shown inside a fenced block so its own `#`/`##` headings do not become part of this convention document's heading hierarchy. It uses four backticks so the nested three-backtick examples inside it (Sprint Goal, Route B, Estimate Tracking, Closure Checklist) render correctly without closing the outer fence early.

---

````markdown
# Sprint NNN — Sprint Title

> One or two sentences describing the principal increment of value expected from the sprint.

## 1. Executive Summary

Summarize:

- the sprint goal;
- the principal business or engineering value;
- the number and type of Issues included;
- the planned execution strategy;
- the expected outcome.

This section must be understandable without reading the full document.

## 2. Context

Explain why the sprint exists.

Include relevant information such as:

- current product or operational needs;
- technical debt or quality conditions;
- previous work already completed;
- repository branch and base commit;
- constraints discovered during Issue analysis;
- why the selected work belongs in the same sprint.

## 3. Sprint Goal

State one primary goal.

```markdown
**Sprint Goal:** Improve attendance and payroll reliability while reducing
high-risk frontend quality debt without creating file conflicts between agents.
```

A sprint may contain several Issues, but it must communicate one coherent increment of value.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | YYYY-MM-DD |
| Started | YYYY-MM-DD |
| Completed | — |
| Calendar duration | — |
| Active workdays | — |

## 5. Scope

### 5.1 Included

List the business areas, features, defects, quality improvements, and technical work included.

### 5.2 Excluded

Record work intentionally left outside the sprint.

### 5.3 Scope Changes

Record all additions, removals, deprecations, and cancellations made after sprint start.

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| YYYY-MM-DD | ❌ | #000 | Removed from sprint | Reason |
| YYYY-MM-DD | ⚠️ | Previous approach | Superseded | Replacement |

Items must never disappear from sprint history without an entry here.

## 6. Value Ranking

Classify work by value and urgency before defining execution order.

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | #000 | Security, data integrity, or production correctness |
| **High** | #000, #000 | Direct product or operational value |
| **Medium** | #000 | Functional risk, accessibility, or developer productivity |
| **Low** | #000 | Maintainability or non-urgent cleanup |
| **Deferred** | #000 | Valid work intentionally assigned the lowest priority |

### Ordering principle

> **Value first, parallelism second.**

High-value work is scheduled as early as possible.

Lower-value work may be included as conflict-free filler when agent capacity is available, but filler must never displace critical or high-value work.

## 7. Route A — Execution Rounds

Organize Issues into rounds that are conflict-free by default.

A round represents work that may be executed in parallel when enough agents or workspaces are available.

### Round 1 — Round Objective

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #000 | Issue title | Critical | 1h | 2h | — | — | Priority or conflict note |
| ⏳ | #000 | Issue title | High | 2h | 4h | — | — | Independent work |
| ⏳ | #000 | Issue title | Low | 0.5h | 1h | — | — | Conflict-free filler |
|  |  | **Round total** |  | **3.5h** | **7h** | **—** |  |  |

Repeat the same structure for every round.

### Round rules

- Issues in the same round must not modify the same files unless explicitly coordinated.
- Round order represents the recommended default execution order.
- Rounds are not hard dependencies unless Route B identifies a dependency.
- When agent capacity is limited, highest-value Issues start first.
- Filler work starts only when higher-value work is already assigned or blocked.
- Every Issue row must retain its title, value, estimates, status, evidence, and relevant notes.

## 8. Route B — Sequential Dependencies

Record product-level, technical, and file-level ordering constraints.

```text
#000 (Round 1) → #000 (Round 2)
Reason: both modify the same component; the smaller fix must land first.

#000 (Round 2) → #000 and #000 (Round 3)
Reason: the first Issue changes a shared contract required by later work.
```

For every dependency, identify:

- predecessor;
- successor;
- dependency type;
- why the order matters;
- evidence that the predecessor is complete.

If no product-level dependency exists, state that explicitly.

## 9. Conflict Risk Map

List files touched by two or more sprint Issues.

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|
| `path/to/file.tsx` | #000, #000 | 1, 2 | Must land sequentially |
| `path/to/service.php` | #000, #000, #000 | 1, 3, 4 | High-conflict node |

### Conflict methodology

Explain how affected files were identified, for example:

- GitHub Issue affected locations;
- SonarCloud findings;
- repository audit;
- code search;
- confirmed files from Issue scoping;
- generated dependency graph.

Two Issues conflict when they modify the same file or when one changes a contract consumed by the other.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 0 | 0h | 0h | — | — | — |
| Round 2 | 0 | 0h | 0h | — | — | — |
| **Grand total** | **0** | **0h** | **0h** | **—** | **—** | **—** |

Calculations:

```text
vs Opt.  = Tracked total - Optimistic total
vs Pess. = Tracked total - Pessimistic total
```

Update the comparison as each round finishes.

Do not wait until sprint closure, because a slow round may be hidden by faster work elsewhere.

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | — | — | — |
| Implementation | — | — | — |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **—** | **—** | **—** |

## 12. Notes on Estimate Confidence

Explain the origin and confidence of the estimates.

Possible sources include:

- Issue body estimates;
- prior implementation history;
- affected-file count;
- complexity analysis;
- agent-generated rough sizing;
- direct technical scoping.

Clearly distinguish technically scoped estimates from preliminary planning estimates.

## 13. Execution Evidence

Record the relation between Sprint, Issues, Pull Requests, and commits.

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #000 | Delivered result | #000 | `abcdef1` | 2.5h | Acceptance criteria passed |
| ❌ | #000 | Removed from scope | — | — | 0h | Cancellation reason |
| ⚠️ | #000 | Replaced by #000 | #000 | `abcdef2` | 1h | Superseding approach |

Do not record only a link.

Include enough identifiers and text to reconstruct the history after a platform migration.

## 14. Quality Results

Record relevant before-and-after evidence.

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Tests passing | — | 100% | — | ⏳ |
| Coverage | — | — | — | ⏳ |
| SonarCloud Issues | — | — | — | ⏳ |
| Technical debt | — | — | — | ⏳ |
| Bugs fixed | 0 | — | — | ⏳ |
| Security findings | — | 0 new | — | ⏳ |

Possible evidence includes:

- automated tests;
- SonarCloud Quality Gate;
- coverage;
- static analysis;
- manual acceptance validation;
- screenshots;
- release or deployment verification;
- production observation.

## 15. Results

### 15.1 Delivered Value

Describe what changed for the restaurant, users, maintainers, or future development.

### 15.2 Planned vs. Actual

Summarize:

- planned Issue count;
- completed Issue count;
- deprecated or cancelled work;
- estimated and tracked time;
- scope changes;
- deviations from the original execution route.

### 15.3 Known Limitations

Record incomplete behavior, accepted debt, deferred risks, and follow-up work.

Do not leave limitations documented only in closed GitHub Issues.

## 16. Lessons Learned

Record conclusions that should affect future sprints.

Examples:

- estimation accuracy;
- agent coordination;
- workspace capacity;
- conflict-analysis accuracy;
- testing gaps;
- architecture discoveries;
- changes needed in conventions or templates.

Lessons must be specific enough to change future behavior.

## 17. Follow-up Work

Record newly discovered work without silently expanding the current sprint.

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | #000 | Follow-up title | Discovered during #000 | Next sprint |
| ⚠️ | — | Superseded idea | Replaced by another approach | None |

Follow-up work belongs in the backlog or in a future document under `planned/`.

## 18. Sprint Closure Checklist

```markdown
- [ ] All included work items have a final status marker.
- [ ] Completed items include Pull Request or commit evidence.
- [ ] Deprecated items identify their replacement.
- [ ] Cancelled items include a reason.
- [ ] Scope changes are recorded.
- [ ] Tracked time was synchronized from Issue sessions.
- [ ] Round totals and sprint totals were recalculated.
- [ ] Estimate variance was calculated.
- [ ] Consolidated effort was completed.
- [ ] Dependencies reflect actual execution.
- [ ] Conflict notes reflect actual execution.
- [ ] Tests and relevant quality metrics were recorded.
- [ ] Delivered value and known limitations were documented.
- [ ] Follow-up work was created or recorded.
- [ ] Lessons learned were captured.
- [ ] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created when applicable.
```
````

A sprint must not be considered closed until this checklist is complete.

---

## 9. Multi-Agent Editing Rules

SushiGo may be implemented by several AI agents in parallel.

Sprint documentation must therefore minimize shared-file conflicts and preserve stable ownership.

### Ownership

- The project owner or a designated coordination agent owns sprint structure, value ranking, round definitions, dependencies, conflict maps, and aggregate totals.
- Implementation agents may update only the row, evidence, status, and tracked time associated with their assigned Issue.
- Implementation agents must not reorder rounds, change priorities, or rewrite unrelated sections.
- Aggregate totals should be recalculated by the coordination agent at round boundaries and sprint closure.

### Safe updates by implementation agents

An implementation agent may update:

- its Issue status marker;
- tracked time;
- Pull Request;
- merge commit;
- concise result summary;
- evidence notes.

It must not modify:

- another agent's Issue row;
- value ranking;
- dependency ordering;
- unrelated conflict-map entries;
- completed sprint documents.

### Preservation rules

- Never delete a historical row.
- Never renumber a sprint.
- Never reuse a cancelled or skipped sprint number.
- Never rewrite completed history to match the latest architecture.
- Record corrections explicitly when the original history was materially wrong.
- Prefer small, scoped documentation commits during an active sprint.
- Avoid broad formatting rewrites while multiple agents are working.

---

## 10. Minimal Sprint Template

Use this template when creating a new sprint document.

```markdown
---
sprint: "NNN"
title: Sprint Value Title
status: Planned

created: YYYY-MM-DD
started:
completed:
last_updated: YYYY-MM-DD

base_branch: main
base_commit:
scope_issues: 0

github_project:
github_milestone:

previous:
next:
---

# Sprint NNN — Sprint Value Title

> Brief description of the expected increment of value.

## 1. Executive Summary

## 2. Context

## 3. Sprint Goal

**Sprint Goal:** ...

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | YYYY-MM-DD |
| Started | — |
| Completed | — |
| Calendar duration | — |
| Active workdays | — |

## 5. Scope

### 5.1 Included

### 5.2 Excluded

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|

## 7. Route A — Execution Rounds

### Round 1 — Objective

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #000 | Title | High | 0h | 0h | — | — | — |
|  |  | **Round total** |  | **0h** | **0h** | **—** |  |  |

## 8. Route B — Sequential Dependencies

## 9. Conflict Risk Map

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| **Grand total** | **0** | **0h** | **0h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | — | — | — |
| Implementation | — | — | — |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **—** | **—** | **—** |

## 12. Notes on Estimate Confidence

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|

## 15. Results

### 15.1 Delivered Value

### 15.2 Planned vs. Actual

### 15.3 Known Limitations

## 16. Lessons Learned

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|

## 18. Sprint Closure Checklist

- [ ] All work items have a final status.
- [ ] Evidence and tracked time are complete.
- [ ] Estimates and totals were recalculated.
- [ ] Consolidated effort was completed.
- [ ] Quality results were recorded.
- [ ] Scope changes and limitations were documented.
- [ ] Follow-up work and lessons learned were captured.
- [ ] Metadata was updated.
```
