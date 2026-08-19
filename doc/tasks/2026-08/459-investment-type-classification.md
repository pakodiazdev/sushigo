# 📊 Add Investment Type classification to the task standard

**Labels:** documentation, dev-tooling, sprint-4, investment: dev-platform

## Description

Add a required **Investment Type** classification to the project task/Issue standard so engineering time can be measured by where the project is investing effort, not only by feature, component, or sprint.

The classification must use GitHub labels as the source of truth, with exactly one Investment Type per Issue:

- `investment: product` — user-facing/business-domain functionality that directly expands SushiGo capabilities.
- `investment: product-engineering` — architecture, security, reliability, testing, data integrity, refactors, and technical work that directly strengthens the product without necessarily adding visible functionality.
- `investment: dev-platform` — tooling, AI-agent workflow, dev-lab, PR/review automation, sprint automation, developer productivity, and other work on the system that develops the product.

When the classification is not obvious, the Issue description should include a short note explaining the choice. The label remains the canonical value used for reporting and automation.

## Reason

The project already tracks estimates, real sessions, wall-clock time, parallelization, sprint scope, value ranking, and technical debt, but it cannot currently answer a higher-level investment question consistently:

> How much engineering effort is being invested in SushiGo itself versus the development platform that produces SushiGo?

Recent sprint analysis can only estimate this retroactively from Issue titles and labels such as `dev-tooling`. Making Investment Type explicit from Sprint 004 onward will allow future sprint closures to calculate the distribution directly from tracked Issue time.

This is intentionally a classification standard first. Dashboards, charts, badges, or automated ROI reports are out of scope for this Issue and may be added later once enough classified sprint data exists.

## Objective

Make Investment Type a first-class, mutually-exclusive task dimension for every new Issue, starting with Sprint 004, and document how to classify ambiguous work consistently.

## ✅ Technical Tasks

- [x] 🏷️ Create the three canonical GitHub labels:
  - `investment: product`
  - `investment: product-engineering`
  - `investment: dev-platform`
- [x] 📚 Update the task/Issue convention (`doc/conventions/tasks.md` or the current canonical task-standard document) to require exactly one Investment Type label on every new Issue.
- [x] 🧭 Document concise classification rules and representative examples for the three values.
- [x] 📝 Define the Issue-body rule: add a short `Investment Type` rationale only when the classification is genuinely non-obvious; do not duplicate the label mechanically in every Issue body.
- [x] 🤖 Update Issue-creation/start tooling and templates that enforce task standards so new Issues cannot silently omit the Investment Type classification.
- [x] 🔍 Add a validation/check in the existing task workflow where practical so an Issue with zero or multiple `investment:` labels is reported as invalid before implementation starts.
- [x] 🔁 Backfill exactly one Investment Type label on the Sprint 004 scope (`#422`–`#429`) plus this Issue so Sprint 004 is the first fully measurable sprint under the new standard.
- [x] 📊 Update the Sprint 004 planning document to note that Investment Type distribution will be computed from tracked Issue time at sprint closure; do not add a hand-maintained percentage before real tracked data exists.

## 🎯 Acceptance Criteria

- [x] Exactly three canonical `investment:` labels exist in the repository.
- [x] The task standard states that every Issue must have exactly one Investment Type.
- [x] The distinction between Product, Product Engineering, and Development Platform is documented with concrete examples.
- [x] New-Issue/start-task tooling checks or applies the classification according to the documented standard.
- [x] Zero or multiple `investment:` labels are treated as an invalid task state rather than silently accepted.
- [x] All Sprint 004 Issues (`#422`–`#429` and this Issue) have exactly one Investment Type label.
- [x] Sprint 004 closure guidance can calculate hours and percentage by Investment Type from real `Sessions[]` / `Tracked` data without manually reclassifying Issues afterward.
- [x] No dashboard, chart, badge, or historical backfill of Sprints 001–003 is required by this Issue.

## 🔗 References

- `doc/conventions/tasks.md` — current task/Issue standard
- `doc/conventions/sprints.md` — sprint tracking and time-accounting conventions
- Sprint 004 — Product Catalog Reconstruction (`#422`–`#429`)
- Existing orthogonal labels such as `backend`, `technical-debt`, `dev-tooling`, and `sprint-*` remain unchanged; Investment Type answers a separate question: **where engineering effort is being invested**.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h30m` · **Pessimistic:** `3h30m` · **Tracked:** `2h55m`

### 📅 Sessions
```json
[
  {
    "date": "2026-08-18",
    "start": "18:57",
    "end": "21:25"
  },
  {
    "date": "2026-08-19",
    "start": "14:35",
    "end": "15:02"
  }
]
```

## 📊 Retrospective
- **Actual total:** 2h 55m (148m + 27m, two sessions)
- **vs optimistic:** +1h 25m
- **vs pessimistic:** −35m

**Justification:**
The core deliverable — three GitHub labels, the `doc/conventions/tasks.md` standard section,
`start-issue.md`/`issue.md` tooling, the issue-template reminder, the Sprint 004 note, and the
nine-issue backfill — was the kind of work the optimistic estimate anticipated and landed close to
it in the first session. The overrun past optimistic came from three sources not contemplated in
the original 1h30m–3h30m range: (1) two full automated-review cycles in the first session (a
Copilot loop that found and fixed 3 real findings — a `grep -c` exit-code bug, an unexecutable
`--remove-label` instruction, and a Sprint 4/004 inconsistency — followed by a Devin/DeepWiki loop
across 2 cycles that found and fixed 4 more real bugs and evaluated 8 flags); (2) one of the
Devin-loop subagent dispatches hit a session usage-limit error mid-cycle with its transcript
unrecoverable, requiring the parent to manually audit the partially-committed work before
dispatching a fresh subagent to finish; and (3) a second session, opened after a sibling PR (#468,
splitting `/issue` into three review-automation variants) merged into `main` ahead of this one and
renamed the very file this issue's Phase 1b changes lived in — this branch had to be rebased,
the conflict resolved, and the Phase 1b wiring reapplied across all three resulting `/issue*`
variants (a gap the rebase itself surfaced: the two newer variants had never had it in the first
place), plus one more Copilot-review-driven fix (a non-canonical `investment:` label like a typo
could slip past the original prefix-only check) and one documentation clarification (the Sprint 004
distribution table's `dev-platform` row read as zero effort when real tracked opportunistic work
existed just outside its formal scope). None of this exceeded the pessimistic estimate, since the
underlying deliverable stayed small and doc/tooling-only throughout — no code, no test suite, no CI
flakiness — but cross-PR integration with concurrently-merged sibling work was real, unplanned cost.


