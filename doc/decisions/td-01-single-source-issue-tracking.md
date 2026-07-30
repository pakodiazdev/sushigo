# TD-01 · GitHub Issue as single source of truth during work; local task file archived only at close

## Decision

While an issue is open — from creation through the PR that closes it — the **GitHub issue is the
only live document**. It is created directly on GitHub (no local file precedes it), carries the
mandatory sections described in `doc/conventions/tasks.md` (Description/Reason/Objective, or for
bugs: bug description/Hypothesis/Reproduction guide, plus `## ⏱️ Time` with an Estimates block and
a `Sessions` JSON array), and is linked to the **SushiGo Admin** GitHub Project. Work sessions are
opened and closed by editing the issue body directly (`gh issue edit`) — never a local file.

A local `.md` archive is generated **exactly once**, when `/finish-pr` closes out the issue: a
verbatim snapshot of the finished issue body, written to `doc/tasks/yyyy-mm/<issue-number>-slug.md`
using the GitHub issue number as the only ID, forever. `doc/tasks/backlog/` is retired — no new
files land there; issues live on GitHub from the moment they're filed.

Newly linked issues are added to the SushiGo Admin project's board (Status field) but never have
their **Iteration** field (the project's sprint-equivalent) set automatically — that stays unset
until a human explicitly assigns the issue to a sprint.

## Justification

**Why not keep dual-tracking a local file alongside the issue?**
That's what this decision replaces. `/start-issue` used to create/move a file under
`doc/tasks/backlog/` and live-edit it throughout development (opening/closing work sessions), while
`/finish-pr` only synced the Time section back to GitHub at the very end. Two copies of the same
document, updated on different schedules, drift. An audit of the 5 files that were sitting in
`doc/tasks/backlog/` when this decision was made proved it in practice:

| Backlog file | GitHub issue | What actually happened |
|---|---|---|
| `066-punctuality-exceptions.md` | #66 | Already **closed** 2026-06-14 — orphaned duplicate nobody cleaned up |
| `069-overtime-config.md` | #69 | Already **closed** 2026-07-05 — orphaned duplicate |
| `121-indefinite-exception-summary.md` | #121 | Already **closed and properly archived** at `doc/tasks/2026-04/121-*.md` with ticked checkboxes and decision notes — but the *GitHub issue body itself* still showed the stale, unticked pre-work version. The local file had the truth; GitHub didn't. |
| `085-mobile-app-bootstrap.md` | #85 | Still open, content byte-identical to the issue body — a pure duplicate |
| `infrastructure/114-migrate-remaining-now-usages.md` | *(none)* | Never migrated to GitHub at all; its issue number collided with an unrelated, already-merged issue |

The #121 case is the clearest argument: the *complete, correct* record of what shipped lived only
in the local file, and the system meant to be authoritative (GitHub) was wrong. Dual-tracking
doesn't average out to "the truth is in at least one place" — it produces a coin flip on which copy
a reader lands on.

**Why not just discipline the sync step instead of removing the second copy?**
That was the previous design (`finish-pr` Phase 4 synced Time + Retrospective to GitHub) and it
still wasn't enough — checkbox state and the rest of the body were never part of that sync, which is
exactly how #121 went stale. Enforcing better discipline on a two-copy system fights the structure
of the problem. Removing the second copy while work is in progress removes the failure mode
entirely: there is nothing to fall out of sync with.

**Why not drop the local file altogether and rely on GitHub permanently?**
Local `.md` files under `doc/tasks/` are kept in-repo on purpose (see the original template at
`doc/conventions/tasks.md`): they're cheaper for an LLM working in this repo to read (a local file
read vs. a network round-trip to GitHub's API), and they're a portability hedge — if the project
ever moves off GitHub Issues (self-hosted GitLab, Bitbucket, etc.), the historical record already
lives in the repo and needs no migration. The fix is *when* that copy is created, not whether it
exists: once, as a closing snapshot, instead of continuously.

**Why not link every new issue straight into a sprint (Iteration)?**
Sprint assignment is a planning decision, not a byproduct of filing a bug or backlog item. Setting
Iteration automatically at creation time would make "issue exists" and "issue is scheduled" the same
event, which they aren't — a filed issue may sit unscheduled for a long time before a human decides
which sprint it belongs to.

## When to revisit

If GitHub Issues' body-editing API (`gh issue edit`, full-body replace) becomes too coarse for
concurrent multi-session work (e.g. two people opening sessions on the same issue at once and
racing the Sessions JSON append), consider structured custom fields on the GitHub Project instead of
free-text sections in the body.
