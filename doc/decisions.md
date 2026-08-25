# Technical Decisions — SushiGo

> This document is the index of every technical decision made on this project.
> Each decision has its own file in [`doc/decisions/`](decisions/).
> The goal is to give future reviewers or collaborators context on the reasoning
> behind each choice — not just what was decided, but why, and what alternatives
> were considered and rejected.

Format modeled on the same convention used in
[`pakodiazdev/atreyu-library`](https://github.com/pakodiazdev/atreyu-library/blob/main/docs/technical-decisions.md).

---

| ID | Decision | Area |
|----|----------|------|
| [TD-01](decisions/td-01-single-source-issue-tracking.md) | GitHub Issue as single source of truth during work; local task file archived only at close | Process |
| [TD-02](decisions/td-02-media-cleanup-strategy.md) | Orphaned media cleanup runs at container startup, not on a recurring schedule | Infrastructure |
| [TD-03](decisions/td-03-product-catalog-separation.md) | Product catalog splits identity from packaging, cost, and price into four write surfaces | Inventory |
| [TD-04](decisions/td-04-domain-oriented-frontend-structure.md) | Frontend code is organized by business domain through incremental migration | Frontend |
