---
sprint: "000"
visibility: public
review_type: baseline
review_origin: repository-evidence
review_date: 2026-08-26
reviewed_head: 28e87f8ea9355eb73f9ba677751144afec2cfd67
---

# Sprint 000 — Engineering Baseline

## Executive summary

Sprint 000 is not the beginning of SushiGo. It marks the transition from an organic spare-time
project into a documented engineering process. The important decision was explicit: AI may change
who performs implementation work, but architecture, domain understanding, planning, review,
testing and technical decisions remain engineering responsibilities.

## Why this checkpoint matters

The project had reached a scale where informal execution no longer preserved enough context:
Issue volume increased, multiple agents began working concurrently, technical debt was being
measured, file conflicts mattered and time/parallelism became worth tracking.

The iteration model introduced a durable record of:

- objectives and business value;
- dependencies and conflict analysis;
- optimistic/pessimistic estimates;
- real Sessions and wall-clock;
- review findings and lessons learned;
- technical decisions and follow-up work.

## Public takeaway

The strongest portfolio signal from Sprint 000 is not a feature. It is the decision to treat
AI-assisted development as a measurable engineering system rather than as code generation alone.

## Source of truth

- [`doc/sprints/sprint-000-introduction.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-000-introduction.md)
