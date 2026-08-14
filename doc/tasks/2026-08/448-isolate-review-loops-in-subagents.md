# 🔨 Move /issue's Devin/DeepWiki and Copilot review loops to isolated subagents

## Description

Extract `.claude/commands/issue.md`'s automated-review loops — **Phase 8** (Devin/DeepWiki) and
**Phase 6/7's Copilot polling-and-response loop**, including the Copilot re-poll nested inside every
Phase 8 cycle — so each runs inside an isolated subagent instead of the main `/issue` session. Each
subagent performs the same work it does today (poll, read findings, fix, test, commit, push,
re-validate) and returns only a compact summary to the parent session.

## Reason

Both loops currently run inside the same continuous, never-forked `/issue` session as every other
phase, and both share the same expensive shape: **poll → read findings → fix → commit → push →
re-poll → re-run CI**, none of which is ever discarded from context since the whole pipeline is one
session from Phase 0 through Phase 10.

Devin's cost is the more visible half (Chrome page reads), documented on the original scope of this
issue:
- #378: estimated 3–6h, tracked **29h55m** — retrospective attributes this explicitly to "the
  unattended /issue pipeline's own design: it runs the Devin/DeepWiki automated review to its full
  5-cycle safety cap."
- #377: estimated 4h, tracked 9h29m (+137%) — 4 Devin cycles, 6 genuine defects.
- #384 (a small config fix): the loop still ran a full pass and found 0 bugs — same overhead paid
  for zero value.

But Copilot's polling loop compounds **more often** than Devin's, just less visibly (no browser
involved, so it's easy to overlook when reasoning about cost):
- Phase 6: initial poll (~30s cadence, up to ~10min) + full `pr-comments.md` Steps 1–7 per comment.
- Phase 7: re-polled again after the post-review squash, with its own wait window.
- Phase 8: re-polled again **inside every one of the up to 5 Devin cycles**, each time a fix is
  pushed.

So a full run can re-poll and re-process Copilot review threads far more than 3 times, each time
carrying its own polling responses and `pr-comments.md` diff/context reads into the same
ever-growing session. Isolating both loops in subagents is a lower-risk experiment before deciding
whether to cut either phase down to a single best-effort check (matching `finish-pr.md`'s existing
non-looping Phase 7.6b model) or remove it outright — both loops do catch real, worth-fixing defects
today, so the goal here is to keep that value while stopping their internal back-and-forth from
polluting the parent session's context.

**A third, unrelated friction source also breaks the "zero-interruption" promise and belongs in the
same cleanup pass.** `finish-pr.md`'s file-list-capture steps (the before-diff ahead of Phase 1b's
auto-rebase, the after-diff following Phase 2's squash, and the re-diff in Phase 7.6c after a late
rebase) need to run `git diff`/`sort` from inside the correct `workspaces/sushigo-<x>` clone and
redirect the result to a `/tmp/finish-pr-<N>-files-*.txt` file. When executed as a single compound
Bash command — `cd workspaces/sushigo-<x> && git diff ... > /tmp/...` — Claude Code's own safety
classifier flags it ("Compound command contains cd with output redirection - manual approval
required to prevent path resolution bypass") and stops for manual approval, exactly the kind of
human-in-the-loop interruption `/issue`'s zero-interruption rule is designed to avoid. This is not a
permission-configuration gap — the classifier exists specifically to stop `cd`+redirect compound
commands from bypassing path-scoped permissions, so it should not be allowlisted away. The real fix
is to stop constructing the compound form at all: run the `cd` (or `git -C <dir> ...`) and the
redirecting command as separate steps so no single Bash invocation combines both.

## Objective

Phase 6/7's Copilot loop and Phase 8's Devin loop produce the same review outcome (comments/bugs
addressed, flags evaluated, same safety caps) but none of their polling responses, diff/context
reads, CI-watch output, or Chrome page reads land in the parent `/issue` session's context — only a
final structured summary per loop does. The parent session can act on each summary (re-run its own
CI gate once, continue to the next phase) without ever having carried the loop's internal
back-and-forth itself. Separately, none of `finish-pr.md`'s file-list-capture steps trigger a
manual-approval prompt anymore — `/issue` runs from Phase 0 to Phase 10 without a single
human-in-the-loop interruption on a clean run.

## ✅ Technical Tasks

- [x] 🔍 Decide the subagent invocation shape for each loop (dispatch once for the whole loop vs.
      once per cycle/poll-round) and document the tradeoff directly in the command file
- [x] 📝 Rewrite `.claude/commands/issue.md` Phase 8 to dispatch the Devin/DeepWiki loop to a
      subagent, passing the PR number and the same 5-cycle safety cap
- [x] 📝 Rewrite Phase 6 to dispatch the Copilot poll-and-respond loop (`pr-comments.md` Steps 1–7)
      to a subagent
- [x] 📝 Apply the same treatment to Phase 7's post-squash Copilot re-poll and to the Copilot re-poll
      nested inside each Phase 8 cycle, so no Copilot polling ever runs directly in the parent
      session
- [x] 📤 Define each subagent's return contract: for Copilot — threads addressed/skipped/business-
      rule-disputed; for Devin — bug count, flags evaluated (fixed / not-applicable / business-rule-
      dispute); both — commits made, final CI state
- [x] 🔁 Ensure the parent session still re-runs its own CI gate (Phase 5) once after any subagent
      reports pushed commits, per the existing rule
- [x] 🧾 Preserve the `## ⚠️ Needs Human Judgment` business-rule-dispute behavior for both loops —
      each subagent must still be able to write that section to the PR body, not just report back to
      the parent
- [ ] 📊 Manually compare token/wall-clock cost on at least one real issue run through the new
      Phase 6/7/8 vs. a comparable prior issue, to validate the hypothesis before deciding on full
      removal of either loop
- [x] 🔀 Rewrite `finish-pr.md`'s three file-list-capture snippets (pre-Phase-1b before-diff,
      post-Phase-2 after-diff, Phase 7.6c re-diff) so the workspace `cd`/`git -C` and the
      redirecting `git diff ... | sort > /tmp/...` never appear in the same compound Bash command —
      document the split explicitly in the command file so any future agent follows it too, not just
      this run

## 🎯 Acceptance Criteria

- [ ] Running `/issue` on an issue that triggers real Copilot comments and real Devin findings still
      results in both being addressed/fixed, tested, committed, and pushed, exactly as today
- [ ] The parent `/issue` session's transcript does not contain the subagents' individual polling
      responses, `pr-comments.md` diff/context reads, Chrome navigations, or CI-watch polling output
      — only each loop's final summary
- [ ] The `## ⚠️ Needs Human Judgment` section and the Sessions-closing rule still work correctly
      when either loop stops early (its safety cap reached) inside a subagent
- [ ] A before/after comparison (even informal) is recorded on this issue showing whether
      context/token growth actually improved for both loops
- [ ] A full `/issue` run against a dev-lab workspace completes Phase 0 through Phase 10 without a
      single manual-approval prompt on a clean pass (no CI failures, no business-rule disputes)

## 🔗 References

- `.claude/commands/issue.md` Phase 6 (Copilot), Phase 7 (post-squash re-poll), Phase 8
  (Devin/DeepWiki) — current loop implementations
- `.claude/commands/pr-comments.md` Steps 1–7 — reused by Phase 6/7/8's Copilot handling
- `.claude/commands/finish-pr.md` Phase 7.6b — existing single-check, non-looping model used for
  comparison
- `.claude/commands/finish-pr.md` — file-list-capture snippets around the before-diff (pre-1b),
  after-diff (post-2), and Phase 7.6c re-diff, source of the `cd`+redirect manual-approval prompt
- Retrospectives citing the cost: `doc/tasks/2026-08/378-media-gallery-uploader-component.md`,
  `doc/tasks/2026-08/377-media-upload-system.md`,
  `doc/tasks/2026-08/384-remove-hardcoded-app-key.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h30m` · **Pessimistic:** `6h30m` · **Tracked:** `9h20m`

### 📅 Sessions
```json
[
  { "date": "2026-08-13", "start": "07:48", "end": "17:08" }
]
```

## 📊 Retrospective
- **Actual total:** 9h20m (560m)
- **vs optimistic:** +5h50m
- **vs pessimistic:** +2h50m

**Justification:**
The estimate assumed a mostly mechanical extraction of two existing loops (Devin/DeepWiki and
Copilot) into subagent dispatches. The actual scope grew in three ways not contemplated in the
original 3h30m–6h30m band. First, defining a compact, lossless return contract for each subagent
(Copilot: threads addressed/skipped/business-rule-disputed; Devin: bug count, flags, commits, CI
state) required more careful design than a simple dispatch — the whole point of the issue is that
the parent session never sees the loop's internals, so the contract has to be complete enough that
nothing gets silently dropped. Second, the file-list-capture safety-classifier fix (Reason's third,
originally "unrelated" friction source) turned out to be more delicate than expected: getting `cd`
and redirection fully separated across all three `finish-pr.md` snippets (pre-1b, post-2, 7.6c)
while still keeping the diffs anchored to a stable merge base took several passes. Third, review
response consumed real time — 6 review threads were opened and resolved across `issue.md` and
`finish-pr.md`, covering anchoring re-checks to exact commit SHAs, idempotent session cleanup on
review failure, stabilizing squash verification against merge-base file lists, completing
unattended command allow-lists, and sourcing overridden reviewer disagreements from the canonical
PR body — each a genuine correctness or safety fix, not rubber-stamp feedback. The one technical
task left unticked (a live token/wall-clock comparison run) and all acceptance criteria requiring a
real `/issue` execution remain open by design; they need a subsequent real issue to validate against
and are explicitly called out as pending in both the issue and the PR's manual testing steps.



