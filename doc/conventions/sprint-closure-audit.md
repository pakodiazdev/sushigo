# Sprint Closure Audit — canonical evidence contract

> **Location:** `doc/conventions/sprint-closure-audit.md`
> **Applies to:** every sprint before it is marked `Completed` (`doc/conventions/sprints.md` §4)
> **Implementation:** `.github/scripts/sprint-audit/` (`node .github/scripts/sprint-audit/generate.js`)
> **Origin:** the Sprint 006 engineering review (issue #587) — same-window work omission,
> checklist-closure inconsistency, and sprint-metric source-of-truth drift.

---

## 1. Why this exists

Sprint closure evidence is spread across four systems that are reconciled by hand:

```text
Issue body / Sessions   → tracked time, estimates, technical tasks, retrospective
Pull Request            → implementation evidence, review findings, CI/Sonar/E2E
GitHub Project / labels → sprint assignment (Iteration), status
Sprint document         → formal scope, opportunistic work, aggregate metrics
```

Two drift classes recur when this is done manually:

1. **Work omission** — valid project work happens inside the sprint window but is never counted in
   the sprint's documented activity (Sprint 006 / #490).
2. **Closure inconsistency** — an Issue is `Closed` / `Done` while its checklist or final evidence
   still points at deliberately deferred work, with no explicit disposition.

Neither invalidates delivered code. The risk is **traceability**: once engineering reviews read
sprint metrics longitudinally, small inconsistencies compound into misleading velocity,
investment-mix, and quality conclusions.

This document defines the canonical semantics; `.github/scripts/sprint-audit/` enforces them
deterministically before closure.

---

## 2. Canonical concepts — never collapsed into one number

A sprint summary must keep these **five** figures distinct. Reporting one as if it were another is
the exact failure this contract prevents.

| Concept | Definition | Where it comes from |
|---|---|---|
| **`formal_scope_effort`** | Sum of `Tracked` (from `## 📅 Sessions`) across the Issues in the sprint document's **formal scope** (§3). | Issue `Sessions` arrays for the §3 scope list. |
| **`opportunistic_effort`** | Sum of `Tracked` across Issues recorded in the sprint document's **§5.4 Opportunistic Work** table (§4). | Issue `Sessions` arrays for the §5.4 list. |
| **`same_window_project_effort`** | Sum of **only the sessions dated inside the sprint's wall-clock window** (not the Issue's whole `Tracked` total) across Issues that are **neither** formal scope **nor** opportunistic (§5). An Issue with sessions on both sides of the window contributes only its in-window portion. | Issue `Sessions` arrays for in-window Issues outside scope. |
| **`wall_clock_window`** | Calendar interval `[started, completed]` (or `[started, today]` while the sprint is open), from the sprint document frontmatter. | Sprint document frontmatter `started` / `completed`. |
| **`tracked_quality` / metric confidence** | `high` / `medium` / `low` — degraded when any in-scope Issue has malformed, open, missing, impossible-dated, or **unsynchronized** `Sessions` evidence (a hand-edited `Tracked` value that disagrees with the `Sessions` sum). Never silently treated as a confident `0`. | Computed by the audit from every scoped Issue's `Sessions` block and stated `Tracked`. |

The engineering review reports `formal_scope_effort` as sprint velocity. `opportunistic_effort` and
`same_window_project_effort` are reported **alongside** it, never folded in — so a later reviewer
does not mistake one for total engineering activity (the Sprint 006 mistake).

---

## 3. Formal sprint scope

An Issue is in **formal sprint scope** when **all** of these hold:

- it is listed in the sprint document's **§5.1 Included** section — a table row, or a bullet with a
  trailing `` (`#NNN`) `` reference (or, for the Route-A layout, a row in a **§7 Route A** round
  table). The §5.1 count is the *initially-selected* count `scope_issues` reconciles against, even
  when §7 also enumerates a later §5.3 addition;
- it carries the `sprint-<N>` label — **exactly** `sprint-7` for Sprint 7, never a zero-padded
  `sprint-07` / `sprint-007`. The unpadded form is the only one every label-based automation sweeps
  for; a padded variant is drift the audit reports (`sprint-label-missing`), not an accepted alias;
- it is assigned to the GitHub Project **Iteration** whose title is `Sprint <N>`.

The **sprint document's §5.1 / §7 table is authoritative for membership.** The label and the
Iteration assignment are expected to *agree with* that table; when they don't, that is drift the
audit reports (§7), not a redefinition of scope.

Formal scope is fixed at planning time and changed only through **§5.3 Scope Changes** — never
silently, and never by the audit.

**Cross-repo scope.** A sprint may scope Issues from another repo (Sprint 003 included
`sushigo-dev-lab` Issues). Write them as `dev-lab#NNN` / `sushigo-dev-lab#NNN` /
`owner/repo#NNN` in the Issue cell, or as a bare `#NNN` cell plus a dedicated repo column
(``\`sushigo-dev-lab\``). The audit keys every scope entry, evidence row, and fetched Issue by
**(repo, number)** — a `#64` in `sushigo` and a `#64` in `sushigo-dev-lab` are different Issues and
are never reconciled against each other.

---

## 4. Opportunistic work

**Opportunistic work** is work that was not part of the original planning and round assignment but
was picked up as an opportunity *during* the sprint — typically a small tooling, process, or
prior-decision improvement noticed while doing other sprint work (`doc/conventions/sprints.md`
§5.4).

- It still requires a tracked GitHub Issue, the `sprint-<N>` label, exactly one canonical
  `investment:` label, and a row in the sprint document's **§5.4 Opportunistic Work** table. A
  missing `sprint-<N>` or `investment:` label is a `WARN` (`opportunistic-label-missing` /
  `opportunistic-investment-missing`) — disclosed, never a closure blocker, but still surfaced so
  the label drift gets reconciled.
- Its tracked time is reported as `opportunistic_effort` — **separately** from `formal_scope_effort`.
- It never moves the sprint's scoped completion percentage.

"Opportunistic" describes *when and why* the work was picked up, not a licence to skip tracking it.

---

## 5. Same-window project activity

**Same-window project activity** is any Issue that:

- has at least one `Sessions` entry whose `date` falls inside `wall_clock_window`, **and**
- is **not** in formal scope (§3), **and**
- is **not** in the §5.4 opportunistic table.

This is real engineering time spent during the sprint's calendar window on work the sprint never
claimed. It is reported as `same_window_project_effort` purely so a reviewer sees total engineering
activity without re-discovering it by hand. It **must not**:

- change the sprint's formal scope, scoped count, or velocity;
- cause closure to fail (it is a `WARN`, §7).

An **orphan** Issue (§7 — carries the `sprint-<N>` label or Iteration assignment but is not in the
§5.1/§7 table) that has in-window sessions counts toward `same_window_project_effort` too — its time
was still spent in the window. It is reported under `orphan`, not `same-window-outside-scope`, but
its effort is never dropped just because it was also mislabelled.

While the sprint is open, `wall_clock_window` ends at **today**, not "never" — a session dated in
the future does not count as same-window work.

The audit's candidate set for this bucket is the Project board plus a best-effort search for
in-window-updated Issues carrying an `investment:` or `sprint-<N>` label. Off-board work with no
such label can still be missed; that is a disclosed limitation, not a closure blocker.

The correct resolution for a discovered same-window Issue is to **report it separately**, not to
retroactively widen the sprint (Sprint 006 / #490).

---

## 6. Closure semantics for unchecked Technical Tasks

Only checklist items under a **delivery-relevant heading** — *Technical Tasks*, *Acceptance
Criteria*, *Tests*, *Validation*, *Tasks*, *Checklist*, *To-do*, *Deliverables* — are treated as
deliverable work. A stray `- [ ]` under *Rollout notes*, *References*, a quoted template, or similar
is ignored and never blocks closure. A disposition that wraps onto the next indented line
(`- [ ] Task` / `      deferred to #NNN`) is folded into the item before it is checked. Content
inside HTML comments (`<!-- … -->`, and an unterminated `<!--` to end of body) and fenced code
blocks (```` ``` ````) is stripped before scanning, so a commented-out or quoted template checklist
never counts as unfinished work either.

When such an Issue closes with unchecked items, each unchecked item must have exactly one
**explicit disposition**:

| Disposition | Meaning | Required marker on (or near) the checklist item |
|---|---|---|
| **Genuinely incomplete** | Work that should have been done and wasn't. | *Not allowed at closure* — the audit fails until it is checked, deferred, superseded, or explicitly declared out of scope. |
| **Deferred** | Valid work still to be done, later. | `deferred to #NNN` — the verb must be **bound to** the reference. A bare "deferred", or "deferred" merely near an unrelated `#NNN`, does not count. |
| **Superseded** | Made obsolete by another decision or Issue. | `superseded by #NNN`, `replaced by #NNN`. |
| **Follow-up** | Carried into a tracked follow-up Issue. | `follow-up in #NNN`, `tracked in #NNN`, `moved to #NNN`, `split into #NNN` — the connector (`in` / `to`) is required, so `render follow-up #123` does not count. The weaker `→ #NNN` / `see #NNN` count **only** as a trailing annotation (`Task — see #NNN`). A requirement that just mentions an Issue ("Verify tracked time for #587") is not a delegation. |
| **Out of scope (terminal)** | The work is deliberately abandoned — not tracked anywhere. | The trailing annotation must **be** the note — `… — out of scope`, `… (won't do)`, optionally `… — this is out of scope` — or the whole item must be just that note. A requirement qualifier that merely contains the phrase ("Return 403 (when the ID is out of scope)") does **not** count. No `#NNN` needed. |
| **Stale checklist** | The item is actually done; the box was never ticked. | Fix it: tick the box (or `/finish-pr` Phase 3 ticks verified items). |

`deferred` / `superseded` / `follow-up` all mean "this work still needs doing, elsewhere" — so they
**must** name the Issue that now owns it. Only the terminal *out of scope* disposition needs no
reference, because it declares the work will not be done at all.

### Recognising a disposition in a section rather than inline

A *Deferred / Follow-up / Superseded* section can carry the disposition instead of the checklist
item, but the section line that names the item must **itself** carry the `#NNN` reference — e.g.
`- Wire the retry backoff — moved to #4321`. Merely repeating the task's text under a *Deferred*
heading with no reference does **not** dispose it.

The one exception is a **terminal heading** — *Out of scope*, *Not in scope*, *Won't do*: an item
whose text that section lists is disposed even without a per-line reference, because the heading
already declares the work abandoned.

A closed **formally-scoped** Issue with an unchecked item that has neither an inline disposition nor
a qualifying section line is a closure `FAIL` (§7).

---

## 7. What the audit checks

`node .github/scripts/sprint-audit/generate.js` runs against the current sprint document (or
`--sprint-doc <path>`), pulls Issue + Project state from GitHub, and prints a deterministic report:

```text
Sprint 7 closure audit

Formal scope          13 Issues
Closed                13
Open                   0
Missing iteration      0
Wrong sprint label     0
Missing investment     0
Unchecked tasks        3 (all explicitly disposed)
Investment mix        product 6 · product-engineering 4 · dev-platform 3
Formal tracked        14h20m
Opportunistic tracked  3h14m
Other same-window     11h10m
Orphan issues          0
Metric confidence     high

RESULT: PASS — no blocking drift detected.
```

### FAIL — closure is blocked (exit code 1)

| Code | Condition |
|---|---|
| `scope-open` | A formally-scoped Issue is still `OPEN`. |
| `scope-not-done` | A closed formally-scoped Issue's Project status is not `Done` — including `Todo`, `In Progress`, **or unset** (a missing status is not a pass; the final state cannot be confirmed). |
| `investment-missing` | A formally-scoped Issue lacks exactly one **canonical** `investment:` label (`product`, `product-engineering`, `dev-platform` — see `doc/conventions/tasks.md`). |
| `sprint-label-missing` | A formally-scoped Issue is missing its exact `sprint-<N>` label (a zero-padded `sprint-0N` does not satisfy it). |
| `iteration-mismatch` | A formally-scoped Issue is not assigned to the `Sprint <N>` Iteration. |
| `iteration-missing` | No `Sprint <N>` Iteration exists on the Project board. |
| `closed-with-undisposed-tasks` | A closed, formally-scoped Issue has an unchecked task with no disposition (§6). |
| `scope-count-mismatch` | Frontmatter `scope_issues` is absent / non-numeric, or disagrees with the §5.1 / §7 table count. |
| `sprint-number-invalid` | Frontmatter `sprint` is absent or not a bare integer (`"007foo"`) — the sprint can't be identified. |
| `sprint-window-unknown` | The sprint document has no valid `started` date (`YYYY-MM-DD`) — the wall-clock window can't be bounded. |
| `sprint-window-invalid` | The sprint window's start date is after its end date. |
| `evidence-row-pending` | A §13 Execution Evidence row still carries a non-final status marker (`⏳` / `🚧` rather than `✅` / `⚠️` / `❌`). |
| `evidence-row-missing` | A formally-scoped Issue has no §13 Execution Evidence row (only checked when the §13 section was parsed at all). |

### WARN — disclosed, never blocking (exit code 0)

| Code | Condition |
|---|---|
| `orphan` | An Issue carries the `sprint-<N>` label or Iteration assignment but is not in the sprint document's formal scope. |
| `same-window-outside-scope` | An in-window Issue is neither formal scope nor opportunistic (§5). Reported separately; formal scope unchanged. |
| `metric-confidence` | At least one scoped Issue has malformed / open / missing / impossible-dated / unsynchronized `Sessions` evidence (including a stated `Tracked` that disagrees with the `Sessions` sum, or a body with no `Sessions` heading at all) — `tracked_quality` downgraded, not treated as `0`. |
| `opportunistic-no-evidence` | An Issue listed in §5.4 could not be fetched. |
| `opportunistic-label-missing` | A §5.4 opportunistic Issue is missing its `sprint-<N>` label. |
| `opportunistic-investment-missing` | A §5.4 opportunistic Issue lacks exactly one canonical `investment:` label. |
| `opportunistic-evidence-row-missing` | A §5.4 opportunistic Issue has no §13 Execution Evidence row (required by `sprints.md` §5.4). |
| `evidence-section-missing` | No §13 Execution Evidence rows were parsed from the sprint document — closure evidence can't be reconciled from it. |
| `deferral-target-missing` | A closed Issue defers an unchecked task to a `#NNN` that does not exist (likely a typo). The disposition is still explicit, so this is disclosed, not blocking. |

`--allow-fail` turns any run into a report-only dry run (always exit 0). `--json` emits the raw
result object.

---

## 8. Authoritative source per field

When two systems disagree, this is the tie-breaker the audit and every reviewer use:

| Field | Authoritative source | Notes |
|---|---|---|
| **Scope membership** | Sprint document §5.1 / §7 table | Label + Iteration must agree; disagreement is drift, not a redefinition. |
| **Estimates** | Issue body `## ⏱️ Time` → Estimates | Original estimates are never overwritten (`sprints.md` §7). |
| **Tracked time** | Issue body `## 📅 Sessions` array | `Tracked` is *recomputed* from `Sessions` by `/finish-pr`; a hand-edited `Tracked` that disagrees is itself a finding. |
| **Investment Type** | The single canonical `investment:` **label** | Not body text (`doc/conventions/tasks.md`). |
| **Final state** | GitHub Issue `state` + Project `Status` | Both must read closed/`Done` for a scoped Issue at closure. |
| **Sprint / Iteration dates** | Sprint document frontmatter `started` / `completed` | The Project Iteration field's date window is corrected *from* these by `/close-sprint` Phase 3. |

---

## 9. Lifecycle integration

- **Before `Completed` is written** and **before the next sprint is promoted**, the audit must run
  and report `PASS`. This is a checklist item in `doc/conventions/sprints.md` §18 and a Phase 0
  precondition of `/close-sprint`.
- The audit is **read-only**. It never closes Issues, never merges PRs, never edits the sprint
  document, and never changes formal scope. It reports; a human resolves each finding and re-runs it.
- The user's manual review/approval remains the final lifecycle gate — a green audit is a
  precondition for closure, not an authorization to close.
- Generated aggregates (`formal_scope_effort`, `opportunistic_effort`,
  `same_window_project_effort`, and the Investment Type mix — counts of each canonical
  `investment:` label across formal scope) are preferred over hand-maintained totals. Manually entered
  wall-clock evidence that cannot be reconstructed reliably is preserved, with a metric-confidence
  note when session tracking is known to understate real work.

---

## 10. Related

- `doc/conventions/sprints.md` — sprint document structure, §5.4 Opportunistic Work, §7 Time and
  Duration Rules (wall-clock / parallelism), §18 Sprint Closure Checklist.
- `doc/conventions/tasks.md` — Issue mandatory sections, `## 📅 Sessions`, Investment Type labels.
- `.claude/commands/close-sprint.md` — sprint promotion/closure; runs this audit in Phase 0.
- `.claude/commands/sync-sprint-progress.md` — refreshes the sprint doc's per-issue merge status
  and scoped percentage (run deliberately by a human).
- `.github/scripts/sprint-audit/README.md` — module layout and CLI usage.
