---
allowed-tools: Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh issue comment:*), Bash(gh pr view:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(gh pr comment:*), Bash(gh run view:*), Bash(gh run watch:*), Bash(gh api:*), Bash(gh repo view:*), Bash(gh project item-list:*), Bash(gh project item-add:*), Bash(gh project:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git fetch:*), Bash(git push:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git rebase:*), Bash(git reset:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Bash(tail:*), Bash(wc:*), Bash(date:*), Bash(sleep:*), Bash(cd:*), Bash(sort:*), Bash(diff:*), Bash(cp:*), Bash(basename:*), Bash(docker exec:*), Bash(php artisan:*), Bash(./vendor/bin/pint:*), Bash(npm:*), Bash(npx:*), Bash(make:*), Bash(curl:*), Read, Edit, Write, WebFetch
description: End-to-end autonomous delivery for a single GitHub issue, stopping right after CI is green — validate it exists, gather context, implement via TDD, open the PR, trigger a Codex review for later, squash to one commit, then close out via finish-pr's housekeeping. Unlike `/issue`, this variant never polls or resolves Copilot/Codex/Devin review itself — that iteration is left for a human to drive by hand afterward (e.g. via `/pr-comments`), trading automated-review wall-clock/token cost for manual control. Everything else — implementation discipline, docs, issue checklist, squash, close-out — matches `/issue` exactly. Never merges.
argument-hint: <issue-number>
---

# /issue-no-review #$ARGUMENTS — Autonomous issue delivery pipeline (implementation only, manual review)

You are taking issue **#$ARGUMENTS** of the SushiGo monorepo from "just filed" to "PR ready for
manual review and manual review-iteration," in a single, fully unattended run — except that this
variant stops polling once CI is green and the branch is close-out-ready. It never waits on, reads,
or resolves Copilot, Codex, or Devin/DeepWiki feedback itself; a human drives that cycle afterward,
by hand or via `/pr-comments`.

This file **composes `.claude/commands/issue.md` by reference**, the same composition contract
`issue.md` itself uses for `start-issue.md`/`finish-pr.md`: where a phase below says "follow
`.claude/commands/issue.md` Phase N," **read that file** with the Read tool and execute that phase's
procedure as written. This file only states what's *different*: which of `issue.md`'s phases run
unchanged, which are skipped outright, and which run partially. `/issue` itself is untouched by this
file — this is an additional entry point, not a flag or a behavior change on the existing command.
Phase numbers below are this file's **own**, sequential and self-contained; each phase names exactly
which `issue.md` (or `finish-pr.md`) phase it reuses, so a stale cross-file phase number in the
target file is caught the same way `issue.md`'s own composition contract describes — locate the step
by the purpose described in the surrounding prose, not by the number alone, and proceed. If the
described purpose genuinely no longer exists in the target file, stop and tell the user this command
needs updating.

**Never run `gh pr merge` or `gh issue close` anywhere in this command.** The final state you produce
is a fully close-out-ready PR — code, tests, docs, issue finalized and archived — with review
iteration deliberately left to a human. Merging is never your decision, at any phase.

**One `/issue*` run per issue at a time.** Every phase that edits the issue body is a read-modify-
write with no locking, the same gap `/issue`, `/issue-full`, `/issue-devin-interactive`,
`/start-issue`, `/pr-comments`, and `/finish-pr` already have standalone. Check that no other
workspace is already running any of those commands (this one included) against the same issue number
before starting — this check is manual (Phase 0/1's job) today, same as `issue.md`.

---

## The zero-interruption rule

Every decision in Phases 0–3 below — what to implement, how to fix a failing test, how to resolve an
ambiguity in the issue — is made by you, alone, using the issue's Description/Reason/Objective/
Acceptance Criteria as the source of truth, exactly as `.claude/commands/issue.md`'s own
"zero-interruption rule" describes. **This command never calls `AskUserQuestion` or otherwise pauses
waiting for a human reply, at any phase.** If a genuine ambiguity survives researching the issue, its
references, `doc/architecture/*`/`doc/conventions/*`, and existing similar code, resolve it with the
most literal reading of the issue text (falling back to the most conservative/restrictive reading
only where the issue is genuinely silent) and record it under `## 🤔 Assumptions`, per Phase 1 below.

This variant deliberately has **no** business-rule-dispute machinery for automated reviewers, because
no automated reviewer's feedback is ever read by this command — Copilot and Codex may still review
the PR on their own (Codex because Phase 4 below triggers it), but nothing here polls, reads, or acts
on what they say. That iteration — including any business-rule disputes a reviewer raises — is the
human's to drive manually afterward, e.g. via `/pr-comments`. Phase 8 does not ask for `/usage`
output either — cost logging is skipped entirely, same as `issue.md`.

---

## PHASE 0 — Confirm the issue exists

Follow `.claude/commands/issue.md` **Phase 0** exactly as written (fetch the issue, stop if it
doesn't exist or is closed).

---

## PHASE 1 — Context, plan, and assumptions

Follow `.claude/commands/issue.md` **Phase 1** exactly as written: `start-issue.md`'s Phases 1, 1a,
1b, 2 (mandatory sections, project link, Investment Type label, codebase exploration), then the
plan-derivation and assumption-resolution steps in place of `start-issue.md`'s own Phase 3, recording
any judgment calls under `## 🤔 Assumptions`.

---

## PHASE 2 — Branch and work session

Follow `.claude/commands/issue.md` **Phase 2** exactly as written: branch naming and opening the
Sessions entry on the issue.

**Session-closing rule (applies at every stop point from here on, not just Phase 7):** this entry's
`end` is only filled in by Phase 7 below (via `finish-pr.md`'s own Phase 3), on the assumption the
run reaches that phase in one continuous stretch — the same rule `issue.md`'s Phase 2 states, just
pointing at this file's Phase 7 instead of `issue.md`'s Phase 9. That covers: Phase 5's CI-failure
cap (this file's only automated safety cap that stops the run), and any stop reached during Phase 7's
delegation to `finish-pr.md`'s Phases 0–2 — see `issue.md`'s Phase 2 for the non-exhaustive list of
which `finish-pr.md` conditions this covers (unresolved review threads, dirty working tree, rebase
conflicts, `DIRTY`/`BLOCKED` mergeable state, post-squash diff mismatch). None of these close the
Sessions entry on their own when reached this way — it's this file's job to close it, at the point of
the stop, before reporting.

---

## PHASE 3 — TDD implementation

Follow `.claude/commands/issue.md` **Phase 3** exactly as written, including its coverage
requirements, test-fixing discipline, scope-of-local-test-runs rule, and commit conventions (multiple
commits are fine — this file also squashes exactly once, later, in Phase 6, mirroring `issue.md`'s
own Phase 7 squash timing).

---

## PHASE 3.5 — Documentation and task status

Follow `.claude/commands/issue.md` **Phase 3.5** exactly as written: regenerate Swagger if any
endpoint changed, update `doc/architecture/*.md` if a documented shape changed, update the root
`README.md` only for a new domain area, and tick every Technical Tasks / Acceptance Criteria checkbox
this PR genuinely satisfies.

---

## PHASE 4 — Open the PR

Follow `.claude/commands/issue.md` **Phase 4** exactly as written: push, create the PR (workspace-
letter title bracket, `Devin Review:` follow-up edit, `## Manual Testing` section, `## 🤔
Assumptions` if Phase 1 recorded any). One difference: `issue.md`'s Phase 4 creates the `## ⚠️ Needs
Human Judgment` section *empty*, left for its own Phases 6/8 to fill in later as reviews arrive. This
file never runs those phases, so instead of leaving it empty, populate that same section immediately,
at creation time, with this one-line note — do not create a second, separate section:

```
## ⚠️ Needs Human Judgment
_Automated review (Copilot/Codex/Devin/Sonar) was skipped by request — see the final report. Run
`/pr-comments` (or review manually) once Copilot/Codex have posted, and log any business-rule
disputes here._
```

**Immediately after `gh pr create` succeeds** — the same point Phase 4 posts the `Devin Review:`
follow-up edit — trigger Codex's first pass, since Codex does not start reviewing on its own the way
Copilot does:

```bash
gh pr comment <N> --repo pakodiazdev/sushigo --body "@codex review"
```

This command never polls for Codex's response — that first pass is left in flight for whoever picks
up manual review next.

**Never merge.** Report the PR URL and continue to Phase 5.

---

## PHASE 5 — CI gate

Follow `.claude/commands/issue.md` **Phase 5** exactly as written: watch checks, diagnose and fix any
failure against the same discipline as Phase 3, and stop with the same six-identical-failures safety
cap (closing the Sessions entry per Phase 2's rule above) if it's ever hit.

Later phases refer back to this gate as "**re-run the CI gate (Phase 5)**."

---

## PHASE 6 — Squash to one commit

Now that CI is green, squash the branch to one commit before close-out, since `finish-pr.md`'s own
Phase 2 expects a single-commit branch. This reuses only the squash-and-push portion of
`.claude/commands/issue.md`'s **Phase 7** — read that phase for the exact commands (fetch, compute
the merge base, synthesize one commit message from every commit on the branch per
`doc/conventions/git/commits.md`, `git reset --soft`, commit, force-push) and the CI gate it requires
afterward. **Do not** perform the post-squash Copilot re-poll `issue.md`'s Phase 7 dispatches after
its own push — no automated review polling happens anywhere in this file. Once the squash push lands,
**invoke the complete CI gate (Phase 5) once** before Phase 7 below, following its normal diagnose/
fix/retry loop until green or its safety cap; do not continue on a failed gate.

The squash push restarts CI and Copilot's own automatic review, and restarts the Devin/DeepWiki scan
on DeepWiki's side, purely as a byproduct of any GitHub push — this file never reads either result,
same as it never reads Codex's.

---

## PHASE 7 — Close out via finish-pr

`.claude/commands/finish-pr.md` is normally something a human runs by hand, after their own manual
test and approval. Here, it runs automatically as the last stage of this pipeline, exactly the way
`.claude/commands/issue.md`'s **Phase 9** runs it — follow that phase's text exactly as written,
substituting this file's own Phase 2 (branch/session) and Phase 6 (squash) wherever it refers to
`issue.md`'s Phase 2 and Phase 7. Since #598, `finish-pr.md`'s Phase 7.5a promotes the draft PR
with `gh pr ready` (after stripping any `[skip-ci]` / `[ci-check]` / `[ci-check-all]` title
modifier) and its Phase 7.6b reads the **Codex** review and the **SonarCloud** quality gate
read-only — no browser, no Devin/DeepWiki. Run 7.5a and 7.6a's CI wait as written. For 7.6b:
run only its **SonarCloud** read-only check; do **not** post a fresh `@codex review` trigger and
do **not** wait on Codex — this file triggered Codex once, in Phase 4, and leaves every further
review cycle to the human. Surface whatever Codex has already posted (if anything) in Phase 8's
report without acting on it, and note that Devin/DeepWiki and any post-squash Codex confirmation
were skipped by design, not because anything was unavailable.

Any stop reached while executing `finish-pr.md`'s Phases 0–2 is a genuine early stop for this
pipeline too — close the Sessions entry (Phase 2's rule above) with the current time before
reporting, since `finish-pr.md`'s own text doesn't know it's being run from inside this pipeline.

`finish-pr.md`'s own Phase 1a — which stops if any PR review thread is unresolved and tells the user
to run `/pr-comments` first — is deliberately **not** overridden here: since Copilot reviews PRs
automatically on push (and this pipeline pushes at PR creation, at any of Phase 5's fix commits, and
again at Phase 6's squash), an unresolved Copilot thread existing by the time Phase 7 runs is the
**typical** outcome for this pipeline, not a rare edge case. Hitting that gate is not this command
"waiting on, reading, or resolving" review feedback — it never inspects thread content or acts on it;
it only detects that unresolved threads exist and stops, exactly as `finish-pr.md` does for a human
running it by hand, so the report below can point the human at `/pr-comments <N>` before close-out
can complete.

---

## PHASE 8 — Final report — ready for your review

Do not call `AskUserQuestion` here, and do not write or touch a `## 💸 Token & Cost` section on the
issue — same as `issue.md`'s Phase 10. Fetch the current PR body and read its `## ⚠️ Needs Human
Judgment` section before printing, the same way `issue.md`'s Phase 10 does — it should still contain
only the placeholder note Phase 4 wrote, since nothing in this file ever appends to it.

````
## Issue #<NNN> — Ready for your review (implementation only, review skipped by request)

### Branch / PR
<branch-name> → <PR URL>

### Assumptions made (if any)
- <bullet from Phase 1, if recorded>

### CI
✅ All checks passing (final validation post-close-out, Phase 7 / finish-pr Phase 7.6)

### Automated review
**Skipped by request** — this is `/issue-no-review`, not `/issue`. Copilot reviews the PR
automatically on its own; a `@codex review` trigger was posted right after PR creation (Phase 4) so
Codex's first pass is already in flight. Neither was polled, read, or resolved by this run — that
distinguishes this report from a run where Copilot/Codex genuinely found nothing to flag. Devin/
DeepWiki was skipped entirely, by design, not because it was unavailable. Drive that iteration
yourself, e.g. with `/pr-comments <N>`, then re-run `/finish-pr <N>` if it produces new commits.

### Coverage
- New code: <X>% (≥80% required) — or: not applicable (no PHPUnit/Vitest-covered code changed)

### 📚 Documentation
- Swagger: <regenerated / not applicable> · Architecture docs: <updated <file> / not applicable> ·
  README: <updated / not applicable>

### ✅ Acceptance Criteria
- <N>/<M> checked off on the issue (see issue for the full list)

### 📋 Close-out (Phase 7 / finish-pr)
- Issue finalized: Tracked <Xh Ym>, Retrospective added · Archived: `doc/tasks/<yyyy-mm>/<NNN>-<slug>.md`
- Project board: moved to Done · Sprint doc: issue's row updated (or: not part of the current sprint)

### 💸 Token usage / cost
Not tracked — unattended run. Run `/usage` yourself afterward if you want this run's cost.

### ⚠️ Not merged
Implementation, tests, docs, and close-out housekeeping are done. Review iteration (Copilot/Codex/
Devin/Sonar) and your manual test are both still ahead of you. Once you're satisfied:
```bash
gh pr merge <N> --merge
```
I have not merged it and will not.
````

What can end a run before Phase 8 reaches this report: Phase 5's (or Phase 6's post-squash) CI-failure
cap, and any stop reached during Phase 7's delegation to `finish-pr.md`'s Phases 0–2. Every one of
those closes the Sessions entry (Phase 2's rule) and reports what happened before ending the run.

---

## See also

- `.claude/commands/issue.md` (`/issue`) — the full pipeline this file forks from Phase 5 onward;
  `/issue` polls and resolves Copilot and Codex review automatically (Phases 6–8) before its own
  close-out, while this file stops after CI is green and leaves that iteration to a human. Also see
  `/issue-full` and `/issue-devin-interactive`, `/issue`'s own Devin-based siblings (#468).
- `.claude/commands/start-issue.md` — reused transitively via `issue.md` Phases 1–2; run standalone
  for a single work session without any full pipeline.
- `.claude/commands/pr-comments.md` — the tool a human runs manually after this command finishes, to
  process whatever Copilot/Codex actually posted.
- `.claude/commands/finish-pr.md` — its Phases 0–7.6 are reused wholesale in Phase 7 above (via
  `issue.md`'s own Phase 9), run automatically instead of waiting for a human. Since #598 it promotes
  the draft with `gh pr ready` (Phase 7.5a) and its Phase 7.6b is a read-only Codex + SonarCloud
  check. This file runs only 7.6b's SonarCloud half — it does not post a fresh `@codex review` or
  wait on Codex — unlike `issue.md`'s own Phase 9 override, which does a best-effort Codex re-check;
  this file already did
  that once, in Phase 4, and leaves the rest to the human.
- `.claude/skills/fix-tests/SKILL.md` — a narrower, standalone tool for fixing failures in an
  *existing* test suite outside of an active issue.
