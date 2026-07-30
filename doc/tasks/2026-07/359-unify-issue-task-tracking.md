# 🔧 Unify issue/task tracking: GitHub Issue as single source, archive-on-close, technical decisions log

## Description

`/start-issue` and `/finish-pr` currently maintain two parallel copies of the same work: a local file under `doc/tasks/backlog/` (created, moved, and edited throughout development) and the GitHub issue itself (only synced at the very end, and only its Time section). This causes drift — with enough context growth it's easy to update one and forget the other.

An audit of the 5 files currently in `doc/tasks/backlog/` confirms the problem in practice: #66, #69 and #121 are already CLOSED issues with orphaned local files nobody cleaned up; #85 is open with a local duplicate that is byte-identical to the issue body; and `infrastructure/114-migrate-remaining-now-usages.md` was never migrated to GitHub at all (issue #114 is an unrelated, already-merged issue).

## Reason

Dual-tracking a live document in two systems only stays in sync as long as every update touches both places. In practice it doesn't — local files rot out of sync with the issue that's supposed to mirror them, and there's no single place a reviewer can trust as current.

## Objective

Make the GitHub issue the single source of truth while work is open (created directly on GitHub, linked to the "SushiGo Admin" project). No local `.md` exists or is edited during active work. A local archive file is generated exactly once, at `/finish-pr` time, as a verbatim snapshot of the finished issue — filed under `doc/tasks/yyyy-mm/<issue-number>-slug.md` using the GitHub issue number as the only ID, forever. Also starts a technical decisions log (`doc/decisions.md` + `doc/decisions/td-NN-*.md`), modeled on the format already used in `pakodiazdev/atreyu-library`.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `3h 00m`

### 📅 Sessions
```json
[
  { "date": "2026-07-29", "start": "15:30", "end": "18:00" },
  { "date": "2026-07-29", "start": "18:55", "end": "19:25" }
]
```

## 📊 Retrospective
- **Actual total:** 3h 00m (150m + 30m)
- **vs optimistic:** +1h 00m
- **vs pessimistic:** −1h 00m

**Justification:** The original scope (backlog audit/cleanup, `doc/decisions.md` + TD-01, rewriting
`doc/conventions/tasks.md`/`CLAUDE.md`, and rewriting `/start-issue` + `/finish-pr`) finished inside
the 2–4h estimate. The second session added two things outside that original scope: adding #359
itself to Sprint 001's tracking (§5.3 mid-sprint scope addition, value ranking, round assignment,
execution evidence — requested as a separate follow-up step) and resolving a real merge conflict in
`.claude/commands/finish-pr.md` against #355, which landed on `main` concurrently and touched the
same file's frontmatter and intro paragraph for an unrelated reason (auto-rebase-when-`BEHIND`
logic). One Copilot review round-trip (clarifying `## 📊 Retrospective`'s close-time-only timing)
rounded out the remainder. None of this was rework of the original deliverable — it's why the total
landed a hair over optimistic but comfortably under pessimistic.

