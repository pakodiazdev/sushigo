# ✨ Add /issue-no-review, a variant that stops after CI green and skips the Copilot/Devin loop

**Labels:** enhancement, dev-tooling, investment: dev-platform

# ✨ Add `/issue-no-review`, a variant that stops after CI green and skips the Copilot/Devin loop

## Description

`/issue` currently runs one fixed pipeline all the way through Phase 8 (Devin/DeepWiki) and Phase 9
(`finish-pr` close-out): implement, open the PR, wait for CI, then poll and resolve Copilot review
(Phase 6/7) and Devin/DeepWiki review (Phase 8) before ever finalizing anything.

Add a new standalone command, `.claude/commands/issue-no-review.md`, invoked as
`/issue-no-review #<NNN>`. It composes `.claude/commands/issue.md` by reference the same way
`issue.md` itself composes `start-issue.md`/`finish-pr.md`: run Phase 0 through Phase 5 exactly as
written (context, TDD implementation, docs/task status, PR creation, CI gate), then **skip straight
to Phase 9's close-out** instead of running Phase 6 (Copilot), Phase 7's post-squash Copilot re-poll,
and Phase 8 (Devin/DeepWiki). Phase 7's squash-to-one-commit step should still run before close-out —
only the *review polling* is skipped, not the housekeeping. Phase 10's final report should note that
Copilot/Devin/Sonar review was skipped by request, so it's clear from the report alone which mode
produced a given PR. `/issue` itself is untouched — this is an additional entry point, not a flag or
a behavior change on the existing command.

Right after opening the PR (end of Phase 4), post a PR comment mentioning `@codex review` to kick off
Codex's first pass. Copilot's review starts on its own as soon as the PR opens, but Codex only starts
reviewing once mentioned in a comment — without this, "manual from here" would actually mean "nobody
has asked Codex to look at this yet," not just "no auto-loop polling it."

## Reason

Phases 6–8 are, in practice, the slowest and least predictable part of the pipeline: polling loops
with safety caps (~10 min for Copilot, up to 5 cycles for Devin), each retry re-running the CI gate,
and no reliable way to know in advance whether a run finishes in 5 minutes or 45. That
unpredictability is a real cost in both wall-clock time and tokens (subagent dispatches, repeated
polling, repeated CI re-validation) — sitting on a run to see if it's actually stuck or just slow to
report back.

Whether to run this loop unattended is a real, recurring choice, not a one-time preference: some
issues are worth leaving to fully automated review; for others it's cheaper for me to drive the
Copilot/Codex/Devin/Sonar review cycle myself and only hand off implementation. `/issue` today has
no way to express that choice — it always runs the full loop. This issue is about adding the choice,
not replacing the default pipeline.

## Objective

A developer can invoke a `/issue`-family command that delivers an issue exactly like `/issue` does
today except for stopping the automated review loop, leaving Copilot/Codex/Devin/Sonar iteration to
be driven manually afterward, while still leaving a fully close-out-ready PR (docs updated, issue
checklist ticked, squashed to one commit, CI green) — not a bare, unreviewed diff.

## ✅ Technical Tasks

- [x] ✨ Create `.claude/commands/issue-no-review.md` with its own frontmatter
      (`allowed-tools`/`description`/`argument-hint`), scoped down from `issue.md`'s frontmatter to
      only what Phases 0–5 and 9 actually need (no Chrome/Devin-page tools).
- [x] 🔨 Reuse `issue.md`'s Phase 0–5 exactly as written (issue validation, context/plan, branch,
      TDD implementation, docs/task-status, PR open, CI gate) by reference — no duplication of that
      logic in the new file, same composition contract `issue.md` itself already documents.
- [x] ⏭️ Skip Phase 6 (Copilot loop) and Phase 8 (Devin/DeepWiki loop) entirely in this mode.
- [x] 🔗 Still run Phase 7's squash-to-one-commit step (and its own CI gate) before close-out, since
      `finish-pr.md`'s Phase 2 expects a single-commit branch — but skip Phase 7's post-squash
      Copilot re-poll.
- [x] 💬 Immediately after `gh pr create` succeeds (same point Phase 4 posts the `Devin Review:`
      follow-up edit), post a plain PR comment containing `@codex review` (`gh pr comment <N> --body
      "@codex review"`) to trigger Codex's first pass — Codex does not start on its own the way
      Copilot does.
- [x] 📋 Run Phase 9 (`finish-pr.md`'s close-out: issue finalization, archive, project board, sprint
      doc) exactly as `/issue` does today.
- [x] 📝 Adjust Phase 10's final report to state plainly that Copilot/Devin/Sonar review was skipped
      by request (not "no review found" or "unavailable") so anyone reading the report later knows
      why the `## ⚠️ Needs Human Judgment` section may be empty even on a substantial change.
- [x] 📚 Update `issue.md`'s "See also" section to mention the new entry point, and cross-reference
      `issue.md` from the new command file's own "See also".

## 🎯 Acceptance Criteria

- [ ] Running the new command on an issue produces a PR that is CI-green, squashed to one commit,
      documented, and fully close-out-ready (issue checklist ticked, archived, project board moved,
      sprint doc updated) — without ever polling Copilot or Devin.
- [ ] The PR has an `@codex review` comment posted right after creation, so Codex's first review is
      already in flight by the time a human picks up the manual iteration.
- [x] The existing `/issue` command's default behavior (full review loop) is unchanged.
- [x] The final report clearly states review was skipped by request, distinct from a run where
      Copilot/Devin genuinely found nothing to flag.
- [x] `/issue` and the new command can each be invoked independently per-issue — choosing one mode
      for one issue has no effect on the mode available for the next.

## 🔗 References

- `.claude/commands/issue.md` — the pipeline being forked/flagged, especially Phases 5–10 and the
  "Automated-review subagent boundary" section
- `.claude/commands/finish-pr.md` — Phase 2 (squash) and Phases 0–7.6, reused in Phase 9

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `0h50m`

### 📅 Sessions
```json
[
  { "date": "2026-08-21", "start": "10:45", "end": "11:35" }
]
```

## 📊 Retrospective

**Actual total:** `0h50m` (1 session: 2026-08-21, 10:45–11:35)

**Variance vs. estimate:** Optimistic `2h` / Pessimistic `4h` → actual `0h50m`, well under even the
optimistic estimate.

**Narrative:** The estimate assumed the usual `/issue` overhead — TDD implementation cycles, PHPUnit/
Vitest/Cypress runs, coverage checks, and multiple review round-trips. This issue's deliverable was a
single, already-fully-specified Markdown command file plus a two-line cross-reference edit to
`issue.md`; the issue's own Technical Tasks checklist was detailed enough to use directly as the
implementation plan (per `/issue` Phase 1's rule), so no design/derivation time was spent. No PHP/TS
code changed, so the usual test-writing, linting, and coverage-floor work didn't apply — CI passed
clean on the first attempt at every gate (initial push, post-squash, post-rebase). The Copilot review
loop found 2 real doc-clarity issues in the new command file and fixed both in one round-trip; a
post-squash re-poll found nothing further. The Codex review loop surfaced one business-rule dispute
(a suggestion to bypass `finish-pr.md`'s Phase 1a unresolved-thread gate) that was overridden per the
zero-interruption rule, requiring a reply and thread-resolution but no code change. The only other
time cost was `finish-pr.md`'s pre-flight `BEHIND` auto-rebase (main advanced by one merged PR
mid-run) and its own CI re-validation, both routine. Net: a small, self-contained dev-tooling change
with an unusually explicit spec came in well under estimate.




