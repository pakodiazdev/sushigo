# ✨ Add /issue slash command for end-to-end autonomous issue delivery

## Description
Add a new `/issue <issue-number>` slash command to `.claude/commands/` that orchestrates the
existing `/start-issue`, `/pr-comments`, and `/finish-pr` commands into a single end-to-end,
mostly-autonomous delivery pipeline for one GitHub issue: context gathering → branch → TDD
implementation → PR → CI gate → Copilot review loop → commit squash → Devin/DeepWiki review loop →
close-out via `/finish-pr` → final report with token/cost logging.

## Reason
Delivering an issue today means manually running `/start-issue`, then separately watching CI,
resolving Copilot comments via `/pr-comments`, checking the Devin/DeepWiki page, and finally running
`/finish-pr` — each a separate manual invocation with the human babysitting the gates in between.
For issues where the automated reviewers have no business-rule disagreement, that babysitting is
pure overhead: `/issue` composes the existing commands by reference (no logic duplication) so a
single invocation can carry an issue from "just filed" to "PR ready for human review," stopping only
when an automated reviewer disputes what the feature should actually *do*.

## Objective
`.claude/commands/issue.md` exists, is committed, and running `/issue <N>` on a real issue drives it
through context/plan, branch creation, TDD implementation, PR creation, CI, Copilot review, commit
squash, and Devin/DeepWiki review automatically, finishing with `/finish-pr`'s close-out and a final
report — without merging the PR at any point.

## ✅ Technical Tasks
- [x] 📂 Add `.claude/commands/issue.md` with the full phase-by-phase pipeline (Phases 0–10)
- [x] 🔗 Compose `start-issue.md`, `pr-comments.md`, and `finish-pr.md` by reference instead of
      duplicating their procedures
- [x] 🛑 Implement the "one-interruption rule": only stop for business-rule disputes, not code
      defects
- [x] 🔁 Add safety caps on the CI-retry loop (6x) and the Devin/DeepWiki loop (5x)
- [x] 💸 Add end-of-run token/cost logging to the issue under `## 💸 Token & Cost`

## 🎯 Acceptance Criteria
- [x] `.claude/commands/issue.md` is present and follows the same frontmatter/structure as the other
      commands in `.claude/commands/`
- [x] The command never runs `gh pr merge` or `gh issue close` at any phase
- [x] Standalone behavior of `/start-issue`, `/pr-comments`, and `/finish-pr` is unaffected

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `9h26m`

### 📅 Sessions
```json
[
  { "date": "2026-07-31", "start": "15:40", "end": "23:59" },
  { "date": "2026-08-01", "start": "00:00", "end": "01:07" }
]
```

## 📊 Retrospective
- **Actual total:** 9h 26m (8h19m + 1h07m — two sessions, split across the midnight boundary per
  `doc/conventions/tasks.md`'s "sessions accumulate across days" rule)
- **vs optimistic:** +8h 26m
- **vs pessimistic:** +7h 26m

**Justification:**
The original estimate covered writing and committing `.claude/commands/issue.md`
itself, which is what the first four commits (15:40–15:56) actually cost — in line with the
optimistic end of the estimate. The session's `end` was recorded as `15:41` at that point, which
undercounted the work still ahead; it's corrected here using commit timestamps as evidence, since
no session was ever reopened for the remaining work (this is itself one of the defects this PR now
fixes — see the "session-closing rule" bullet below). Every hour past that first stretch was
PR-review response, not new scope: `workspace letter via pwd` was reported and fixed, then five
separate Copilot reviews landed in sequence over the same PR — each finding a small, real defect
(Docker-mode swagger path, missing `php artisan`/`cd` permissions, `gh pr create` returning a URL
not a bare number in two files, a title-emoji-matching claim contradicting CLAUDE.md's own
examples) — alongside three full Devin/DeepWiki scan rounds surfacing progressively deeper real
bugs and flags: a stale `finish-pr` Phase 0 skip, a self-contradicting "nowhere else pauses" claim,
a broken cross-file reference, a CI-gate race right after PR creation, a Phase 7 Copilot re-poll
that could pass on a stale review instead of a genuinely new one, a wrong claim about when the PR
number is first known, a miscomputed Retrospective variance figure in this very section, an
allowed-tools gap that took three separate rounds to fully close (lint/test/coverage commands,
then `git rev-parse`/`basename` in `start-issue.md`, then `mkdir`/`grep`/`gh project` needed by
`finish-pr.md`'s own close-out steps that `/issue` delegates to but runs under its own permission
scope), a real Phase 2-vs-Phase 10 contradiction on when to close the work session, a
GraphQL/REST field-name mismatch, unpaginated review polling, and a documented (not fully solvable
by a markdown command alone) concurrent-run race on the issue body. Each round required reading the
flagged code, verifying it was real (not a false positive), fixing it, committing, and pushing —
exactly the review-response loop `/issue` itself is meant to automate away for future issues. None
of the rounds disputed what the feature should *do*; every one was a defect, so none triggered a
human business-rule question. A final round also fixed a logic error introduced by an earlier
fix itself (the session-closing rule told the assistant to close a Sessions entry on a Phase 0 exit,
before Phase 2 ever opens one) — a reminder that even fixes to review feedback need their own
verification, not just the original code. Two items were consciously left as accepted, residual
findings rather than chased further: a Devin bug claiming the close-out stage can still stall on a
permission prompt, despite `issue.md`'s `allowed-tools` now being verified as a strict superset of
everything `finish-pr.md`'s own frontmatter declares — any remaining gap there would be pre-existing
in `finish-pr.md` itself, not introduced by this PR; and the concurrent-run race on the issue body,
which is documented as a caution rather than solved, since real fix would need actual locking
infrastructure this markdown command can't provide on its own. A 6th and 7th Copilot review round
(after the Devin loop above had already settled) caught a missing `Bash(tail:*)` permission and a
handful of doc-only issues — including this section's own session-end format, which used a
non-`HH:MM` value (`"00:00 (2026-08-01)"`) that `doc/conventions/tasks.md` doesn't allow; split into
two proper sessions instead, per that doc's own "sessions accumulate across days" rule. `/finish-pr`
then closed out the branch: squashed 3 commits to 1, verified CI/mergeable state clean, and moved
this issue to Done. A final Devin scan caught one more real, distinct gap on its 8th pass: neither
safety-cap stop (Phase 5's CI retries, Phase 8's Devin cycles) mentioned logging token/cost, and
Phase 10's own "regardless of how it ended" line only covered the business-rule-stop case — fixed
so a safety-cap-stopped run still logs what it actually spent. A 9th Devin pass then found three
more real, distinct gaps: `AskUserQuestion` itself was never granted in `allowed-tools` despite
being the pipeline's entire interruption mechanism; Phase 8's step 3 said to "repeat Phase 6's poll"
for Copilot comments, which is the exact same stale-review-passes-immediately bug already fixed for
Phase 7's re-poll, just left unfixed in this second spot; and this Retrospective section itself
didn't follow `doc/conventions/tasks.md`'s mandatory format (`**Actual total:**`/`**vs
optimistic:**`/`**vs pessimistic:**` bullets plus a `**Justification:**` label) — it used an
ad-hoc `Tracked`/`Variance`/`Narrative` structure across every prior round of this section instead,
now corrected.










