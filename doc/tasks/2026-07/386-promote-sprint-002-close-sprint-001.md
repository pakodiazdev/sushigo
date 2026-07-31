# 📚 Promote Sprint 002 to current and close out Sprint 001

## Description

Promote the planned Sprint 002 document
(`doc/sprints/planned/sprint-002-platillos-catalog-platform-hardening.md`) to current, and
formally close Sprint 001 per `doc/conventions/sprints.md` §4 (Sprint Lifecycle).

## Reason

Sprint 001's closure checklist (`doc/sprints/sprint-001-attendance-payroll-quality.md` §18) is
complete except for its last item: *"The next sprint was promoted or created when applicable."*
Sprint 002 has already been planned (14 open Issues, all labeled `sprint-2` and assigned to the
"Sprint 2" iteration on the SushiGo Admin GitHub Project), but its document still lives under
`doc/sprints/planned/` — per convention it does not become the current sprint, and Sprint 001
cannot be marked `Completed`, until the document is moved.

## Objective

- `sprint-002-platillos-catalog-platform-hardening.md` moved from `doc/sprints/planned/` to
  `doc/sprints/` (filename unchanged, per convention rule 9) — note: the `planned/` draft was
  never committed to git, so this landed as a plain filesystem move + new-file commit, not a
  tracked `git mv`
- Its front matter updated: `status: In Progress`, `started: <today>`
- `sprint-001-attendance-payroll-quality.md` front matter updated: `status: Completed`,
  `completed: <today>`, `next: sprint-002-platillos-catalog-platform-hardening.md`
- Sprint 001's closure checklist item "The next sprint was promoted or created when applicable"
  ticked, now that this is true
- `doc/sprints/README.md` index updated: Sprint 002 listed as current, Sprint 001 updated to
  `Completed`
- Root `README.md`'s own `## Sprints` table updated to match: Sprint 001 marked `Completed`,
  Sprint 002 row added (was missing entirely — a separate index from `doc/sprints/README.md`)

## ✅ Technical Tasks

- [x] 📂 Move the Sprint 002 document from `planned/` to `doc/sprints/` (plain filesystem move —
      the `planned/` draft was never committed, so no `git mv` history exists for it)
- [x] 📝 Update Sprint 002 front matter (`status`, `started`)
- [x] 📝 Update Sprint 001 front matter (`status`, `completed`, `next`) and tick its closure
      checklist's last remaining item
- [x] 📝 Update `doc/sprints/README.md` index

## 🔗 References

- `doc/conventions/sprints.md` §2 (Directory Structure), §4 (Sprint Lifecycle)
- `doc/sprints/sprint-001-attendance-payroll-quality.md` §18 (Closure Checklist)
- `doc/sprints/planned/sprint-002-platillos-catalog-platform-hardening.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `1.05h`

### 📅 Sessions
```json
[
  { "date": "2026-07-31", "start": "13:17", "end": "14:20" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 3m (63m)
- **vs optimistic:** +0h 33m
- **vs pessimistic:** +0h 3m

**Justification:** The core task was a mechanical, well-scoped documentation move — move the
planned Sprint 002 doc, flip two front-matter blocks, tick one checklist box, update
`doc/sprints/README.md`. Three review rounds each found real, previously-missed issues: a
`/finish-pr` Devin/DeepWiki pass found 5 bugs (a `status: Completed` sprint left with 2 open
closure-checklist boxes, a stale "stays In Progress" line, an inaccurate "moved via `git mv`"
claim, a §4/§15.2 duration-date mismatch, and Sprint 002 falsely attributing 4 backlog Issues to
Sprint 001's own Follow-up Work list) plus 1 Investigate flag; a second Devin/DeepWiki pass against
the fixed commit found 2 more (a second, separate "sprint remains In Progress" sentence in §1
Executive Summary, and 2 more "5 calendar days" mentions still disagreeing with the corrected
6-day formal-closure framing) plus 1 Informational; finally, direct user review caught that the
**root** `README.md`'s own `## Sprints` table — a separate index from `doc/sprints/README.md`,
which the original scope did cover — was never updated at all, still showing Sprint 001 as
`In Progress` with no Sprint 002 row. Also a single Copilot comment (stale "Planned"-status
wording in two placeholder table rows). Every fix was verified against the actual file content,
not just the reviewer's description. The root-README gap is the main lesson: this repo carries
two independent sprint indices (`README.md` and `doc/sprints/README.md`) and both need updating
on every promotion — worth calling out explicitly in `doc/conventions/sprints.md` to prevent a
repeat.





