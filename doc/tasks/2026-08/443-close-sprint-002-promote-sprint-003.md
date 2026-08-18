# 📚 Formally close Sprint 002, promote Sprint 003, and record Sprint 004 planning

## Description

Publish the sprint-planning and task-convention work prepared during the 2026-08-12 planning session, formally close Sprint 002, promote Sprint 003, and assign the complete Product Inventory roadmap through Sprint 006.

## Reason

Sprint 002 delivered all of its active scope but remains formally In Progress until the next sprint is promoted. The Product Inventory roadmap, Sprint 003 execution plan, Sprint 004–006 projections, and DES/CAT/OPS/STK roadmap alias convention need a reviewed permanent record. Leaving #431–#442 without an Iteration would also make the roadmap operationally incomplete.

## Objective

Leave Sprint 002 historically closed, Sprint 003 officially current, Sprints 004–006 documented as coherent planned increments, both sprint indexes synchronized, and all session-created documentation reviewed through one focused Pull Request.

## ✅ Technical Tasks

- [x] Mark Sprint 002 Completed with its formal closure date and Sprint 003 successor.
- [x] Promote the Sprint 003 document from doc/sprints/planned/ to doc/sprints/ and mark it In Progress.
- [x] Keep Sprint 004 under doc/sprints/planned/ and link the sprint chain in both directions.
- [x] Plan Sprint 005 for purchasing, acquisition cost, pricing, and operational seed data (#431–#437).
- [x] Plan Sprint 006 for Stock integrity and final Inventory completion (#438–#442).
- [x] Apply matching sprint labels and Project Iterations while restoring historical Iteration assignments.
- [x] Update the root and detailed sprint indexes.
- [x] Publish the DES/CAT/OPS/STK roadmap alias convention in doc/conventions/tasks.md.
- [x] Verify frontmatter, required sprint sections, Markdown whitespace, GitHub Project, labels, and Iterations.

## 🎯 Acceptance Criteria

- [x] Sprint 002 is Completed and its closure checklist records Sprint 003 promotion.
- [x] Sprint 003 is the highest-numbered sprint directly under doc/sprints/ and is In Progress.
- [x] Sprint 004 remains Planned under doc/sprints/planned/.
- [x] Every new Inventory roadmap Issue #421–#442 has a selected Sprint 3–6 Iteration.
- [x] Deferred and unrelated technical-debt Issues remain explicitly outside an Iteration instead of inflating planned scope.
- [x] README.md and doc/sprints/README.md show the same lifecycle states.
- [x] The planning documents and task convention are committed on a dedicated branch and submitted in a PR that references this Issue.

## 🔗 References

- Sprint lifecycle convention: doc/conventions/sprints.md
- Task convention: doc/conventions/tasks.md
- Product Inventory design gate: #421
- Catalog implementation roadmap: #422–#442
- Pull Request: #444

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `16m`

### 📅 Sessions
```json
[
  { "date": "2026-08-12", "start": "18:08", "end": "18:14" },
  { "date": "2026-08-12", "start": "18:18", "end": "18:28" }
]
```

## 📊 Retrospective
- **Actual total:** 16m (2 sessions: 2026-08-12 18:08→18:14 = 6m; 18:18→18:28 = 10m)
- **vs optimistic:** −44m (under the 1h optimistic estimate)
- **vs pessimistic:** −2h44m

**Justification:** the tracked 16m covers only the final review/publish pass. The substantive
planning work (Sprint 003 execution plan, Sprint 004–006 projections, DES/CAT/OPS/STK roadmap
alias convention) was produced during the 2026-08-12 planning session referenced in this issue's
own Description and was not logged as a separate `/start-issue` session — the same gap pattern
already noted for the prior sprint-closure issue (#416 → #360, whose Sessions entry was never
closed out — not #357, which had full tracked time).

**Result:** Sprint 002 marked Completed, Sprint 003 promoted to `doc/sprints/` and marked In
Progress, Sprint 004 kept planned under `doc/sprints/planned/`, Sprints 005–006 documented, and
the DES/CAT/OPS/STK roadmap alias convention published — all via PR #444.



