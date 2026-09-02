---
allowed-tools: Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh issue comment:*), Bash(gh pr view:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(gh run view:*), Bash(gh run watch:*), Bash(gh api:*), Bash(gh repo view:*), Bash(gh project item-list:*), Bash(gh project item-add:*), Bash(gh project:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git fetch:*), Bash(git push:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git rebase:*), Bash(git reset:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Bash(tail:*), Bash(wc:*), Bash(date:*), Bash(sleep:*), Bash(cd:*), Bash(sort:*), Bash(diff:*), Bash(cp:*), Bash(basename:*), Bash(docker exec:*), Bash(php artisan:*), Bash(./vendor/bin/pint:*), Bash(npm:*), Bash(npx:*), Bash(make:*), Bash(curl:*), Read, Edit, Write, WebFetch, Agent
description: End-to-end autonomous delivery for a single GitHub issue — validate it exists, gather context, implement via TDD, open the PR, then loop through CI and Copilot review automatically. The one deliberate exception in this variant is Devin/DeepWiki review (Phase 8, and finish-pr.md's equivalent final check): instead of a subagent browsing the page, the operator opens the Devin review link themselves and relays back what it shows — this is the only phase in the `/issue*` family that pauses for a human reply. Every other phase, including business-rule disputes, stays zero-interruption exactly like `/issue-full`. See `/issue-full` (fully automated Devin) and `/issue` (Codex review, no Devin) for the other two siblings. Never merges.
argument-hint: <issue-number>
---

# /issue-devin-interactive #$ARGUMENTS — Autonomous issue delivery pipeline (human-relayed Devin)

You are taking issue **#$ARGUMENTS** of the SushiGo monorepo from "just filed" to "PR ready for
manual review." Every phase except Phase 8 (and its finish-pr.md equivalent in Phase 9) runs exactly
as unattended as `/issue-full` — this command still never asks for input over TDD implementation,
CI failures, or Copilot review, including business-rule disputes there.

This is the **Devin-interactive** variant — Devin/DeepWiki review keeps its full depth (unlike
`/issue`, which drops it for Codex), but instead of a subagent browsing `app.devin.ai` in Chrome, the
operator opens the review page themselves and relays back what it shows. This exists specifically to
compare cost and findings quality against `/issue-full` (fully automated Devin) and `/issue` (Codex,
no Devin) on equivalent work — see #468. **Only Phase 8 (and its Phase 9/finish-pr.md counterpart)
pauses for a human reply; nowhere else in this file does.**

This command **orchestrates existing commands by reference** instead of duplicating their logic.
Where a phase below says "follow `.claude/commands/X.md`," **read that file** with the Read tool and
execute its procedure as written — this command only states what's *different* for this flow. If
you ever need to run a single stage in isolation (e.g. just re-resolve PR comments, or just do the
post-merge housekeeping), use `/start-issue`, `/pr-comments`, or `/finish-pr` directly — those are
unchanged and still work standalone.

**Composition contract — this matters because these files get edited independently.** Phase
references below (e.g. "Phase 1, 1a, 1b, and 2" from `start-issue.md`) point at that file's *current*
structure at the time this command was written. If one of those files is later restructured —
phases renumbered, split, merged, or renamed — its own standalone behavior (running `/start-issue`,
`/pr-comments`, or `/finish-pr` directly) keeps working unchanged, since nothing about a file
depends on how something else refers to it. But a reference *here* can go stale. So: if a numbered
reference below doesn't match what you find in the target file, don't guess or skip it — **locate
the step by the purpose described in the surrounding prose** (e.g. "the step that creates the
branch," "the step that resolves review threads"), not by the number alone, and proceed. If the
described purpose genuinely no longer exists in the target file, stop and tell the user this
command needs updating — don't silently improvise a replacement for a step that was actually
removed on purpose.

**Never run `gh pr merge` or `gh issue close` anywhere in this command.** This pipeline runs all
the way through `finish-pr.md`'s own close-out housekeeping automatically (Phase 9) — the human's
manual test happens *after* everything here is done, not in between. The final state you produce
is a fully closed-out PR ready for a human to test and merge themselves. Merging is never your
decision, at any phase.

**One `/issue*` run per issue at a time.** Every phase that edits the issue body (`gh issue view ...
> file`, edit, `gh issue edit --body-file`) is a read-modify-write with no locking — the same
gap `/start-issue`, `/pr-comments`, and `/finish-pr` already have standalone. Two concurrent runs
against the *same* issue number (e.g. from two dev-lab workspaces, or two different `/issue*`
variants pointed at the same issue) can clobber each other's writes to the Sessions array or
checklist. This has already happened for real on this project once for a different reason (two
workspaces independently starting the same issue) — check that no other workspace is already
running `/issue-full`, `/issue`, `/issue-devin-interactive`, `/start-issue`, `/pr-comments`, or
`/finish-pr` against the same issue number before starting. **This check is still manual (Phase 0/1's
job) today.** A future scheduled loop that invokes `/issue-devin-interactive` unattended (see the
zero-interruption rule) must perform the equivalent check itself — e.g. an existing branch/open PR
for that issue number, or a lock file — *before* dispatching a run; this command does not defend
against a double-dispatch on its own. Note that a fully unattended scheduled loop is a poor fit for
this specific variant, since Phase 8 below deliberately pauses for a human reply — an unattended
dispatcher would need its own separate mechanism to notice and answer that pause, which this
command does not provide.

---

## The zero-interruption rule (with one deliberate exception — Phase 8)

Every decision in this pipeline — what to implement, how to fix a failing test, whether a review
comment is valid, whether a Devin flag matters, how to resolve an ambiguity in the issue, and how to
resolve a business-rule dispute raised by an automated reviewer — is made by you, alone, using the
issue's Description/Reason/Objective/Acceptance Criteria as the source of truth. **This command never
calls `AskUserQuestion` or otherwise pauses waiting for a human reply, at any phase — except Phase 8
below (and its Phase 9/`finish-pr.md` counterpart), which exists specifically to pause.**

**This is the one deliberate exception in the entire `/issue*` family.** Everywhere else in this
file — TDD implementation, CI failures, Copilot review and its business-rule disputes, ambiguity
resolution — behaves identically to `/issue-full`: fully unattended, no pauses, no questions. Only
when this file's own Phase 8 text says to wait for the operator does this command stop and wait; it
does not extend that pattern to any other phase, and no other phase in this file should be read as
implicitly interactive just because Phase 8 is.

**When an automated reviewer (Copilot or Devin) is, in substance, disputing what the feature
*should* do — not flagging a defect, a style problem, or a missing test — implement the issue
exactly as written and do not adopt the reviewer's alternative interpretation.** The issue's own
Description/Reason/Objective/Acceptance Criteria is the authoritative spec; a comment second-
guessing it is an opinion for the human merging the PR to weigh, not an instruction this pipeline
acts on. Record every such dispute — the verbatim comment/flag plus a one-line note on why the
issue's literal reading was kept — in the PR's `## ⚠️ Needs Human Judgment` section (created in
Phase 4). A comment that says "this validation is missing" or "this endpoint should return 403 here
per your own Policy class" is still a defect — fix it normally, that's not a dispute.

This exact bar governs Phase 6 (Copilot) and Phase 8 (Devin). Phase 1's own research-then-ask rule
resolves the same way, but writes to a **different** PR section: if a genuine ambiguity survives
researching the issue, its references, `doc/architecture/*`/`doc/conventions/*`, and existing
similar code, resolve it with the most literal reading of the issue text — falling back to the most
conservative/restrictive interpretation only if the issue text itself is silent, not merely
under-specified — and record it under `## 🤔 Assumptions` (Phase 1), never under
`## ⚠️ Needs Human Judgment` above. The two sections are not interchangeable: `## 🤔 Assumptions`
is for gaps *you* filled because the issue itself didn't say — no reviewer was involved; `## ⚠️
Needs Human Judgment` is only for disputes an automated reviewer actually raised (Phase 6, or Phase 8
via the operator's relay) and this pipeline overrode. Phase 8 doesn't use the Chrome extension at
all in this variant — see that phase for its own human-relay mechanism, which replaces both the
automated browsing *and* its Chrome-unavailable fallback used in `/issue-full`. Phase 10 does not ask
for `/usage` output — cost logging is skipped entirely in this mode, noted as such in the final
report instead of blocking on it.

### Automated-review subagent boundary

Phases 6 and 7 deliberately dispatch their Copilot review-and-response loop through the `Agent`
tool. Use **one foreground, general-purpose subagent for each whole loop**, not one subagent per poll
or per review cycle. A whole-loop dispatch keeps every poll response, diff/context read, test log,
and CI-watch update in one disposable context and gives the parent a single summary. Dispatching per
cycle would create repeated handoffs, force each worker to rebuild the same PR context, and make
ownership of the shared checkout ambiguous. Foreground execution is required because the loop edits,
commits, and pushes the same branch; never run it concurrently with the parent.

**Phase 8's human-relay steps (1–6) never dispatch through `Agent`.** They run directly in this
foreground conversation, because a subagent has no way to literally pause and wait for the operator's
next chat message — only the parent conversation can do that. Do not delegate steps 1–6 to a subagent
under any circumstance, even to "keep it consistent" with Phases 6/7; that would silently turn this
variant back into `/issue-full`'s automated-browsing behavior, defeating its purpose. **Phase 8's
step 7 is the one exception**, and it follows the Phases 6/7 pattern exactly: one foreground,
general-purpose subagent dispatched a single time, after the human-relay loop is done, to catch up
Copilot on whatever this phase's correction commits triggered — not one dispatch per correction, and
never interleaved with the still-running human-relay conversation.

For every dispatch, give the subagent the repository, issue number, PR number, branch name, the
applicable safety cap/window, and the exact command sections it must follow. Require it to do the
complete loop — polling, analysis, fixes, relevant tests, commits, pushes, review replies/thread
resolution, and CI re-validation — and to return **only** the compact contract specified by that
phase. The parent must not repeat or request the worker's raw polling responses, file reads,
browser output, or CI-watch log. It may act only on the returned summary and on its own single CI
gate required below.

---

## PHASE 0 — Confirm the issue exists

```bash
gh issue view "$ARGUMENTS" --repo pakodiazdev/sushigo --json number,title,body,state,labels
```

- **Command fails / issue not found** → stop immediately. Report `❌ Issue #$ARGUMENTS does not
  exist in pakodiazdev/sushigo. Nothing was done.` and end the run — do not proceed to any later
  phase, do not create a branch, do not touch anything.
- **`state` is `CLOSED`** → stop and inform the user which issue it is and that it's closed. Do not
  proceed.
- Otherwise, continue to Phase 1.

---

## PHASE 1 — Context, plan, and assumptions

Follow `.claude/commands/start-issue.md` **Phases 1, 1a, 1b, and 2** exactly as written (mandatory
issue sections check, link to the SushiGo Admin project, Investment Type label validation, codebase
exploration).

Then, instead of `start-issue.md`'s Phase 3 (context report + stop-and-wait for open questions),
do this:

1. **Check whether the issue already contains an implementation plan** — a `## Plan` section, or a
   Technical Tasks checklist detailed enough to name concrete files/endpoints/components. If so,
   treat it as authoritative. Validate it's still consistent with the current state of the code
   (files it names still exist, patterns it assumes still hold) but do not second-guess or
   re-derive it from scratch.
2. **If there's no plan**, derive one yourself from the codebase exploration you already did.
3. **Actively try to resolve every gap before treating it as unresolved.** Before recording
   anything as an assumption or stopping to ask, check:
   - The issue's own body — its `## 🔗 References` section, linked issues/PRs, prior Sessions.
   - `doc/architecture/*` and `doc/conventions/*` for the domain this issue touches.
   - Existing, similar code already in the repo — the pattern this issue should follow is usually
     already implemented somewhere.

   In theory this resolves nearly every doubt: most "open questions" already have an answer
   somewhere in the docs or the codebase, they just weren't obvious from the issue text alone.
4. **If a doubt survives that research, do not ask — resolve it yourself and flag it.** Per the
   zero-interruption rule above: take the most literal reading of the issue text; if the issue is
   genuinely silent on the point (not just under-specified), take the most conservative/restrictive
   reading instead. Reserve this fallback for doubts that actually survive the research in step 3 —
   don't skip straight to guessing without checking references, docs, and existing code first.
5. For anything you *do* resolve yourself through this research (rather than the issue stating it
   outright), record it as a bullet under a new `## 🤔 Assumptions` note — the same heading Phase 4
   writes verbatim into the PR description — citing where you found the answer (which doc, which
   existing file) so the reviewer can double-check it in one place.

Print a short context report (what you're building, files touched, what you resolved from docs vs.
inferred, any assumptions recorded) so the run is auditable, then proceed — never wait for
acknowledgement of this report.

---

## PHASE 2 — Branch and work session

Follow `.claude/commands/start-issue.md` **Phases 4 and 5** exactly as written: branch naming
(`<type>/<NNN>-<slug>` per `doc/conventions/git/branches.md`, branched from `origin/main`), and
opening the Sessions entry on the issue (`doc/conventions/tasks.md`).

**Session-closing rule (applies at every stop point from here on, not just Phase 9):** this entry's
`end` is only filled in by Phase 9 (via `finish-pr.md`'s Phase 3), on the assumption the run reaches
that phase in one continuous stretch. This rule only applies once this Sessions entry actually
exists — a Phase 0 exit happens *before* this phase ever opens it, so there's nothing to close
there; Phase 0's own stop conditions need no session handling at all. Business-rule disputes no
longer pause the run (see "The zero-interruption rule") — they're overridden in place and logged,
so they're not a stop point either. From here on, every remaining stop point must close this
Sessions entry with the current time before reporting — the same way Phase 9's own success path
would — rather than leaving `"end": "?"` to silently accumulate wall-clock time nobody is tracking.
That covers:
- **Phase 5's CI-failure cap, and Phase 8 step 7's own CI-failure cap** (its consolidated Copilot
  check's `status: failed` outcome — see Phase 8 step 7). Steps 1–6 of Phase 8 have no automated cap
  of their own, since they're paced by the operator, not a loop.
- **Any stop reached during Phase 9's delegation to `finish-pr.md`'s Phases 0–2** — everything
  between opening this entry (Phase 2 here) and `finish-pr.md`'s own Phase 3, which is the only
  later point that fills `end` on the success path. This is deliberately **not** an exhaustive list
  of `finish-pr.md`'s stop conditions — treat *any* "stop"/"stop here"/"stop immediately" instruction
  inside its Phases 0–2 the same way, including (non-exhaustively): Phase 0's not-`OPEN`/`isDraft`
  check, Phase 1a's unresolved-review-threads check, Phase 1b's dirty-working-tree guard before the
  `BEHIND` auto-rebase, Phase 1b's rebase-conflict abort-and-report, Phase 1b's `DIRTY`/`BLOCKED`
  mergeable-state check, and Phase 2's post-squash diff-mismatch guard. None of these close the
  Sessions entry on their own when reached this way — `finish-pr.md`'s own text doesn't know it's
  being run from inside this pipeline — so it's this pipeline's job to close it, at the point of the
  stop, before reporting.

---

## PHASE 3 — TDD implementation

Follow `.claude/commands/start-issue.md` **Phase 6** (write failing tests first, implement until
green, lint), with these explicit requirements layered on top:

**Coverage requirements (mandatory, not optional):**
- API delivery → at least one Feature test that exercises the endpoint end-to-end, plus unit tests
  for every new model method / Action / Service the deliverable introduces.
- Frontend delivery that's reachable in the browser → enumerate every happy-path route or flow this
  issue introduces or changes, and write one Cypress E2E spec per happy path, plus a unit test
  (Vitest) for every new or materially-changed component.
- New code coverage must land between **80% and 100%** — 80 is the floor, not the target. Check
  with `--coverage` (PHPUnit) / `--coverage` (Vitest) before moving on; if under 80%, add tests
  before proceeding, don't ship under the floor.

**Test-fixing discipline (applies for the rest of this entire command, not just here):** when a
test fails, diagnose whether the *code* or the *test* is wrong relative to the issue's Acceptance
Criteria — fix the real defect. **It is forbidden to loosen an assertion, special-case around a
check, or otherwise make a test pass without the underlying business rule actually holding.** This
is a discipline rule, not a user-confirmation gate — you're both the author of the test and the
implementation here, guided by the issue, so there's no one else to ask; just get it right.

**Scope of local test runs:** run only the tests relevant to the files this PR touches (not the
full suite — CI runs the full suite in Phase 5) plus the linters (`pint`, `eslint`, `typecheck`).
Every command this phase needs — `php artisan test`/`--coverage`, `./vendor/bin/pint`,
`npm run lint`/`typecheck`, `npx vitest`, `make cypress-run` — is already covered by this file's own
`allowed-tools` frontmatter, so none of it should prompt for approval mid-run.

**Commits:** follow `doc/conventions/git/commits.md`. Multiple commits are fine and expected as you
go — **do not** apply `start-issue.md`'s ">3 commits → squash" rule here; this command squashes
exactly once, later, in Phase 7, after Copilot's feedback is already folded in.

---

## PHASE 3.5 — Documentation and task status

This is the part `/finish-pr` normally handles at close-out — but that runs later (often in a
separate session, after manual testing), so without this phase the PR would ship with stale docs
and an issue that still looks untouched. Do this now, in the same commit set, so what you deliver
is the documentation *and* the task, not just the diff.

1. **Regenerate API docs if any endpoint changed:**
   ```bash
   # Dev-lab (default — runs directly on the host, per this workspace's CLAUDE.md):
   cd code/api && php artisan l5-swagger:generate

   # Standalone Docker mode only — `cd /app/code/api` alone does not enter the container,
   # so the command must be wrapped in `docker exec` to actually run inside it:
   docker exec dev_container bash -c "cd /app/code/api && php artisan l5-swagger:generate"
   ```
2. **Update `doc/architecture/*.md` if this issue changed or introduced a domain model, flow, or
   pattern one of those docs describes.** A stale architecture doc is a defect the same way a
   missing test is — don't leave it for someone else to notice later. Skip this if the issue is
   purely a bug fix or refactor that doesn't change the documented shape of anything.
3. **Update the root `README.md`** only if this issue adds a new domain area worth reflecting in
   the project overview (the "four live domains" framing at the top) — not for routine feature
   work inside an existing domain.
4. **Tick off every Technical Tasks / Acceptance Criteria checkbox on the issue itself** that this
   PR genuinely satisfies — the same check `.claude/commands/finish-pr.md`'s Phase 3 performs later
   at close-out. Doing it here means anyone looking at the issue mid-flight sees real status
   immediately, instead of an untouched checklist until someone runs `/finish-pr`. `/finish-pr`
   re-verifying the same boxes later is harmless — never *un*tick something it finds already
   checked.
   ```bash
   gh issue view "$ARGUMENTS" --repo pakodiazdev/sushigo --json body -q .body > "/tmp/issue-$ARGUMENTS-tasks-body.md"
   # tick [ ] → [x] only for items you can verify actually shipped in this PR's diff
   gh issue edit "$ARGUMENTS" --repo pakodiazdev/sushigo --body-file "/tmp/issue-$ARGUMENTS-tasks-body.md"
   ```

Fold any doc changes into the same commits as the rest of Phase 3 (or their own doc-scoped commit,
per `doc/conventions/git/commits.md`'s 📚 emoji) — they ship in the same PR, not a follow-up one.

---

## PHASE 4 — Open the PR

Push and open the PR by following `start-issue.md`'s Phase 8b/8c exactly as written — it already
covers the workspace-letter title bracket, the `Devin Review:` follow-up edit, and the
`## Manual Testing` section. Two additions on top of that here:

- **`## 🤔 Assumptions` section** (only if Phase 1 recorded any) — the bullet list of judgment
  calls you made where the issue didn't resolve every detail, so the human reviewer can check them
  in one place instead of reverse-engineering them from the diff. Insert it right after the
  `## Manual Testing` section, before `## Test plan`.
- **`## ⚠️ Needs Human Judgment` section** — every business-rule dispute an automated reviewer
  raises that this pipeline overrides per the zero-interruption rule: verbatim comment/flag plus the
  reasoning for keeping the issue's literal reading. Usually empty at PR-creation time and filled in
  by Phases 6/8 as reviews arrive — create it here (even empty) so those phases have a section to
  append to. Place it right after `## 🤔 Assumptions` (or right after `## Manual Testing` if there
  are no Assumptions).

```bash
git push -u origin <branch-name>
gh pr create --title "<emoji> [#NNN][<letter>][wip] - <desc> <emoji>" --body "..."
gh pr edit <N> --body-file <path-to-updated-body>   # inserts Devin Review:, per start-issue.md 8c
```

The title carries the `[wip]` execution-mode bracket per `start-issue.md` Phase 8c. Every phase
below runs against the `[wip]` PR; the bracket is dropped in Phase 9's `finish-pr` delegation
(Phase 7.5a), which then waits for the final-mode flow. In `[wip]` mode `ci-gate` still turns green
when the checks pass (a red `ci-gate` is a real failure), and the `merge-gate` check is posted
`action_required` — that "action needed" state is expected, not a check to fix.

**Never merge.** Report the PR URL and continue to Phase 5.

---

## PHASE 5 — CI gate

```bash
gh pr checks <N> --repo pakodiazdev/sushigo --watch
```

This blocks until every check (linters + tests, per the repo's GitHub Actions workflows) finishes.

- **`[wip]` mode — `ci-gate` still means what it says; `merge-gate` is `action_required`.** The PR
  title carries `[wip]` (Phase 4). `ci-gate` evaluates quality the same as in final mode: it goes
  green when every applicable branch job (`api-ci`, `webapp-ci`, `e2e-ci`, `scripts-tests`) passed,
  so a **red `ci-gate` here is always a real failure** to diagnose and fix — never "just wip". The
  `merge-gate` check is posted `action_required` (an "action needed" state, not a red failure X) in
  `[wip]` / `[e2e-test]` by design — it keeps the PR unmergeable until the bracket is dropped; that
  is expected, not a check to fix.
- **Called right after `gh pr create` (end of Phase 4, or after a fresh push elsewhere in this
  command):** GitHub Actions can take several seconds to register the workflow runs as pending
  checks. If this command reports "no checks reported" immediately, that means it ran before any
  check exists yet — not that there's nothing to wait for. Wait ~10s and re-run it once or twice
  before treating an empty result as meaningful; only trust "no checks reported" as final if it
  still says so after that short retry.
- **`ci-gate` green (plus any branch jobs)** → continue. `merge-gate` `action_required` is fine.
- **`ci-gate` or a branch job failed** → pull the failing job's log (`gh run view <run-id> --log-failed`,
  using the run ID from `gh pr checks` or `gh api repos/.../commits/<sha>/check-runs`), diagnose
  against the same discipline as Phase 3, fix, commit, push, and re-run this gate.
- **Safety cap:** if the *same* check fails **6 times in a row**, stop looping and report the
  failure to the user instead of continuing indefinitely — this is a protective cap, not a
  business-rule stop. Close the Sessions entry (Phase 2's rule) before reporting — do not attempt
  cost logging (Phase 10 skips it entirely per the zero-interruption rule; there's nothing to do
  here on that front).

Later phases refer back to this gate as "**re-run the CI gate (Phase 5)**" rather than repeating
this text.

---

## PHASE 6 — Copilot review loop

Dispatch one foreground, general-purpose subagent for the entire Copilot poll-and-response loop.
Pass it the repository, issue, PR, and branch identifiers and instruct it to:

1. Poll every ~30s for up to ~10 minutes for a review whose author login contains `copilot`
   case-insensitively. If none arrives, finish as `no-review`; do not block indefinitely.
2. Once a review exists, read and follow `.claude/commands/pr-comments.md` Steps 1–7 in full.
3. Add this third outcome to Step 4a alongside Address / Skip:
   - **Business-rule dispute** — keep the issue's literal behavior, reply with the relevant
     Description/Objective/Acceptance Criteria, resolve the thread, and append the verbatim
     comment plus that reasoning to the PR's `## ⚠️ Needs Human Judgment` section.
4. Run the locally relevant tests and linters for every fix, commit and push as the referenced
   command requires, then run the Phase 5 CI gate if it pushed commits. If that gate reaches its
   six-identical-failures safety cap, return `status: failed` with `ci: failed`; never pair
   `ci: failed` with `status: completed` or `status: no-review`.

Require the subagent to return only:

```text
COPILOT_LOOP
status: completed | no-review | failed
threads: found=<N> addressed=<N> skipped=<N> business_rule_disputes=<N>
commits: pushed=<yes|no> shas=<comma-separated short SHAs or none>
ci: success | failed | not-rerun
notes: <one compact line; no raw comments, diffs, polls, or CI log>
```

If `status: failed`, the parent must fetch the issue body and fill the current Sessions entry's
`end` **only if it is still `"?"`**, then write it back and stop with the compact reason. This makes
cleanup idempotent when the worker already closed the session through Phase 5's safety-cap path.
Also stop through this same idempotent cleanup path if the contract is malformed as `ci: failed`
with any non-failed status; never restart a CI gate whose safety cap the worker already exhausted.
Only when `pushed=yes` and `ci` is `success` or `not-rerun`, the parent must **invoke the complete CI
gate (Phase 5) once** before Phase 7. That invocation follows Phase 5's normal failure handling:
diagnose, fix, commit, push, and re-run checks until green or the six-identical-failures safety cap;
"once" means one invocation of that whole gate, not one `gh pr checks` attempt. Do not perform any
Copilot polling in the parent session, and do not continue to Phase 7 unless the gate passes.

---

## PHASE 7 — Unify commits

Now that review feedback is folded in, squash the branch to one commit — matching
`.claude/commands/finish-pr.md`'s Phase 2 approach, but run here instead of at merge time. This
rewrites history, so any `Fixed in <sha>` references Phase 6 already posted in review replies will
point to a commit no longer reachable on the branch — that's expected and harmless (the thread is
already resolved and the reply text still describes what was done), not something to prevent or
work around here.

```bash
git fetch origin main
git merge-base origin/main HEAD   # BASE
git log --format='%B' --reverse $(git merge-base origin/main HEAD)..HEAD
```

Read every commit message on the branch and synthesize **one** new message following
`doc/conventions/git/commits.md`:
- Cover the substantive change from every squashed commit — this is the permanent record.
- Drop pure bookkeeping bullets (session open/close) — that lives in the issue's Sessions array.
- Reuse the same issue number and pick the emoji matching the PR's dominant change type.

```bash
git reset --soft $(git merge-base origin/main HEAD)
git commit -m "<synthesized message>"
git push --force-with-lease origin HEAD
```

This push restarts CI, the Devin/DeepWiki scan, **and** Copilot's automated review (any push does,
force or not) — it can post a fresh review with new threads on the squashed commit. **Invoke the
complete CI gate (Phase 5)** before entering Phase 8, including its normal diagnose/fix/retry loop
until green or its safety cap.

After the squash push and its parent-owned CI gate pass, dispatch a new foreground,
general-purpose subagent for the post-squash Copilot loop. The parent does not fetch Copilot review
state itself. Instruct the worker to resolve the exact pushed SHA with `git rev-parse HEAD`, then
poll the PR reviews at the same ~30s / ~10min cadence until a Copilot review whose `commit_id`
equals that SHA appears. Compare full SHAs, not timestamps, review counts, or local/server clock
values. A review submitted after the push can still belong to the previous SHA, so recency alone is
not proof that it reviewed the squashed commit. Exact `commit_id` matching prevents a late review
of the pre-squash head from ending the poll before feedback for the pushed commit arrives, without
leaking any poll responses into the parent context.

If a new review arrives, the worker follows `pr-comments.md` Steps 1–7 with Phase 6's exact
business-rule-dispute behavior, runs relevant tests/linters, commits and pushes fixes, and runs the
Phase 5 CI gate after any push. If that gate reaches its safety cap, it must return `status: failed`
with `ci: failed`. If no qualifying review arrives, it returns `no-review`.

Require the same `COPILOT_LOOP` return contract as Phase 6. If it returns `status: failed`, the
parent must fetch the issue body and fill the current Sessions entry's `end` **only if it is still
`"?"`**, then write it back and stop. This preserves an end time the worker may already have written
through Phase 5's safety-cap path. If it returns `pushed=yes`, the parent must **invoke the complete
CI gate (Phase 5) once** before Phase 8 only when `ci` is `success` or `not-rerun`, following its
normal diagnose/fix/retry loop until green or its safety cap; do not continue on a failed gate. If
the worker ever returns the invalid combination `ci: failed` with a non-failed status, use the same
idempotent session cleanup and stop instead of restarting CI. Do not copy raw findings into the
parent report; retain only the contract counts, commit SHAs, CI state, and compact note.

---

## PHASE 8 — Devin / DeepWiki review (human-relayed checkpoint)

**Steps 1–6 run directly in this foreground conversation — never dispatch them to a subagent** (see
"Automated-review subagent boundary" above); step 7 is the one exception, a single bounded subagent
dispatch after steps 1–6 finish. Steps 1–6 are the one deliberate pause in this entire pipeline.

1. Give the operator the review URL and ask them to open it and report back what it shows:
   ```
   Devin/DeepWiki review is ready: https://app.devin.ai/review/pakodiazdev/sushigo/pull/<N>
   Please open it and tell me the bug count and any flags it lists (or "0 bugs, clean" if there's
   nothing to report).
   ```
2. **Wait for their reply.** Do not poll, do not guess Devin's state from anything else, and do not
   proceed until they respond — their message is the only source of truth for this phase. This is
   the literal pause the zero-interruption rule above carves out.
3. For each concrete bug or flag they relay, verify it against the actual code with the same
   discipline as every other review-finding phase in this pipeline:
   - **Real defect** — fix it, run the locally relevant tests/linters.
   - **False positive / not-applicable** — say so back to the operator with a one-line reason; no
     code change.
   - **Business-rule dispute** — same rule as Phase 6: keep the issue's literal behavior, append the
     verbatim finding plus your reasoning to the PR's `## ⚠️ Needs Human Judgment` section, and tell
     the operator why in your reply instead of adopting Devin's alternative reading.
4. **Commit and push one commit per correction** — do not batch multiple relayed findings into a
   single commit. The operator may relay findings incrementally as they read the page, so react to
   each with its own commit, following `doc/conventions/git/commits.md` as usual. Run the Phase 5 CI
   gate after each push; diagnose and fix on failure the same way Phase 5 always does.
5. After each round of fixes, tell the operator what changed (files, one-line summary, commit SHA)
   and ask them to refresh the Devin page and report back — Devin's scan restarts on every push and
   needs a moment, so suggest they wait briefly before refreshing. Repeat steps 2–4 until they
   confirm Devin shows 0 bugs and every flag has been discussed.
6. **Do not dispatch a Copilot re-poll subagent after each individual fix commit** — that would be
   wasteful mid-conversation and this variant's whole point is staying lean. But do not skip Copilot
   entirely either: `finish-pr.md`'s own Phase 1a (run inside Phase 9 below) stops the run with a
   pointer to `/pr-comments` if any unresolved review thread exists, and any of this phase's pushes
   can attract a fresh Copilot review just like any other push — leaving that unhandled would turn
   Phase 1a into a *second* undocumented pause, contradicting this file's own promise that nothing
   but Phase 8 interrupts the run.
7. Once the operator confirms Devin is clean, check whether this phase pushed any commits across
   steps 1–6. If it didn't — Devin was already clean on the first check — skip straight to Phase 9,
   there is nothing for Copilot to have reviewed. If it did, dispatch **one** foreground,
   general-purpose subagent for a single consolidated Copilot check — but **do not** gate it behind
   an exact-`commit_id` match the way Phase 7's post-squash poll does. That pattern exists because
   squashing rewrites history, so a review of a pre-squash commit is genuinely stale; step 4 above
   never squashes between corrections, it pushes one real, still-reachable commit per finding, and
   each of those pushes can independently attract its own Copilot review. Gating on the *final* SHA
   only would silently strand threads Copilot left on an *earlier* correction commit — `pr-comments.md`
   itself doesn't filter by commit either, so those threads are exactly as real and addressable as any
   other unresolved thread on the PR right now. Instead, the worker should:
   - Wait briefly (~2–3 minutes) for Copilot's review of the most recent push to land, since it posts
     asynchronously after each push.
   - Follow `.claude/commands/pr-comments.md` Steps 1–7 in full — its own Step 2 already fetches
     **every** currently-unresolved thread on the PR, regardless of which commit attracted it, so this
     naturally catches threads left on any of this phase's correction commits, not just the last one —
     plus the business-rule-dispute rule from Phase 6.
   - Run relevant tests/linters for any fix, commit and push, and run the Phase 5 CI gate after any
     push.

   This is **one dispatch total**, regardless of how many individual correction commits Phase 8
   produced above — not one per correction, and not gated on any single commit landing a review —
   which is what actually guarantees Phase 9's Phase 1a finds a clean slate. Require the same
   `COPILOT_LOOP` contract as Phase 6/7. If it returns `status: failed`, fetch the issue body, fill
   the current Sessions entry's `end` if still `"?"`, write it back, and stop with the compact reason.
   Also stop through this same idempotent cleanup path if the contract is malformed as `ci: failed`
   with any non-failed status; never restart a CI gate whose safety cap the worker already exhausted.
   If it returns `pushed=yes` and `ci` is `success` or `not-rerun`, the parent must **invoke the
   complete CI gate (Phase 5) once** before Phase 9, following its normal diagnose/fix/retry loop
   until green or its safety cap; do not continue on a failed gate — this final commit is exactly
   what Phase 9's `finish-pr.md` housekeeping is about to build on, so it needs the same parent-owned
   validation Phases 6 and 7 already require for theirs. Only once that passes (or immediately, if
   `pushed=no`) does the run move to Phase 9.

There is no automated safety-cap or return contract for the human-relay loop itself (steps 1–6 —
this isn't a subagent) — its natural bound is the operator's own patience, and if they stop
responding mid-review, the conversation is simply paused, not failed; resume from here whenever they
reply. Step 7's Copilot dispatch, when it runs, does have the normal `COPILOT_LOOP` failure handling
described above.

---

## PHASE 9 — Close out via finish-pr

`.claude/commands/finish-pr.md` is normally something a human runs by hand, after their own manual
test and approval. Here, it runs automatically as the last stage of this pipeline — CI, Copilot,
and Devin are already clean, so there's nothing left for a human to gate before this housekeeping;
their manual test happens *after* this phase, not before it, so what they review is the finished
article — code, tests, docs, and a closed-out issue — not a bare diff.

Follow `.claude/commands/finish-pr.md`'s Phases 0 through 7.6 exactly as written, with these notes
on how they interact with the phases already run above. Running its procedure here executes under
*this* file's own `allowed-tools` frontmatter, not `finish-pr.md`'s — every command its phases use
(`mkdir`, `grep`, `gh project`, plus everything already covered above) is pre-approved here too, so
delegating to it doesn't reintroduce an approval prompt.

**Any stop reached while executing Phases 0–2 below is a genuine early stop for this pipeline too —
close the Sessions entry (Phase 2's rule above, which lists the non-exhaustive set of exactly which
`finish-pr.md` conditions this covers) with the current time before reporting, since `finish-pr.md`'s
own text doesn't know it's being run from inside this pipeline and won't do that for you.** The
per-phase notes below call out where each phase's own stop conditions live, but don't repeat this
instruction at every one — assume it applies anywhere a phase says "stop."

- **Phase 0** (resolve the PR and issue) — the issue number is `$ARGUMENTS`, already known since
  this command started; the PR number has been known since Phase 4 created it. Neither needs
  re-resolving, so Phase 0's own `AskUserQuestion` fallbacks ("if it doesn't [have an open PR], ask
  the user for a PR number instead of guessing" / "if neither is present, ask the user which issue")
  are unreachable here — this pipeline always has both. Still run this phase's metadata fetch
  (`gh pr view ... --json ...,mergeable,mergeStateStatus,reviewDecision`) — nothing earlier in this
  pipeline has fetched `mergeable`/`mergeStateStatus`, and Phase 1's readiness gate depends on it.
  Its "Stop immediately" conditions (`state` not `OPEN`, or `isDraft`) are real, if unlikely — this
  pipeline created the PR itself in Phase 4 as non-draft and open, but something outside this run
  could still change that between phases.
- **Phase 1** (pre-flight: review threads + mergeable state) — `finish-pr.md`'s own Phase 1
  deliberately doesn't check CI itself (that's 7.6a's job); the review-thread and mergeable-state
  checks it *does* run should already pass here, since Phase 6 resolved every thread from the
  original diff, Phase 7's post-squash Copilot re-poll catches any thread that squash push itself
  triggered, and Phase 8's own step 7 (its single consolidated post-round Copilot check) catches any
  thread triggered by this variant's human-relayed correction commits — without that step 7 dispatch,
  this Phase 1a check would routinely stop the run on threads nobody resolved, turning it into an
  undocumented second pause. CI on the commit Phase 9 inherits was already validated separately, by
  this pipeline's own Phase 5/7/8 (whichever ran last before Phase 9 started) — not by anything inside
  `finish-pr.md`'s Phase 1. Still run Phase 1 as written — it's cheap and catches drift if something
  changed between phases. Its stop conditions are broader than just `BLOCKED`: 1a's unresolved-
  review-threads check, 1b's dirty-working-tree guard before the `BEHIND` auto-rebase, 1b's
  rebase-conflict abort-and-report, and 1b's `DIRTY`/`BLOCKED` mergeable-state check can each stop
  the run on their own — e.g. `main` picking up branch-protection rules this run didn't anticipate,
  or an unrelated local change dirtying the tree between Phase 7's push and Phase 9 starting. None
  of these are a bug in this pipeline when they fire — follow `finish-pr.md`'s own instruction for
  that condition (report and stop, or the `/rebase-main` pointer on a rebase conflict) rather than
  guessing at a workaround.
- **Phase 2** (squash to one commit) — a single commit from Phase 7 above *if* Phase 8's loop made
  no further fix commits; each Phase 8 cycle commits and pushes its own fix without re-squashing, so
  after even one cycle the branch has more than one commit again. Either way, `finish-pr.md` detects
  the actual count itself and squashes only if needed — no manual action required here. Its own stop
  condition (the post-squash diff not matching the pre-squash diff) is rare — it means the squash
  itself lost content — but real; don't push a divergent diff if it fires.
- **Phase 3** (finalize the issue) — this is also where the Sessions entry opened in Phase 2 above
  finally gets its `end` time filled and `Tracked` recomputed. Write the Retrospective's narrative
  to actually reflect what happened in Phases 5, 6, and 8 (CI retries, Copilot threads, and the
  human-relayed Devin rounds) — not just "implemented the feature," since those rounds are real time
  and real cost, including whatever wait time the operator's replies added.
- **Phases 4–6** (local archive, project board → Done, sprint doc's per-issue row) — run exactly
  as documented in `finish-pr.md`, which no longer touches the sprint doc's aggregate percentage
  or README as a side effect of closing a single PR (see `/sync-sprint-progress` for that, run
  deliberately by a human).
- **Phase 7.5** (final squash+push, including **7.5a**'s promotion of the PR out of `[wip]` — that
  is intended here too: the flow drops the bracket and waits for the final-mode CI run) and **7.6**
  (final CI + Codex/Sonar re-validation + this variant's own interactive Devin relay) — this is the
  true final gate before Phase 10 below presents anything to the human. **Override for 7.6b:**
  `finish-pr.md`'s own Phase 7.6b is now a read-only Codex-review + SonarCloud-quality-gate check
  with no browser automation. Run its Sonar quality-gate sub-check as written; this variant does not
  drive Codex (its automated review is the interactive Devin relay), so record 7.6b's Codex
  sub-check as `n/a — interactive Devin relay is this variant's automated review`. Then, still run
  the interactive Devin check the same way as this file's own Phase 8: give the operator the Devin
  URL for the post-squash commit,
  wait for their relay, and if they report any remaining bug or flag, fix it, commit, push, and let
  `finish-pr.md`'s own Phase 7.5/7.6a repeat (squash+push, then CI) before checking Devin again — the
  same one-fix-one-commit discipline from Phase 8 applies here too. **Any correction made here also
  needs a consolidated Copilot check repeated against the resulting commit** before Phase 10 presents
  anything as ready — `finish-pr.md`'s own Phase 1a already ran earlier in its flow (before 7.5), so
  it will never re-check threads a *this-round* fix push attracts; without repeating a check here, a
  bug found this late could leave a fresh unresolved Copilot thread that nothing downstream catches,
  and the run would still report ready. Unlike Phase 8 step 7 (which deliberately does **not** gate
  on an exact commit match, since its correction commits are never squashed away), **this** check
  should mirror Phase 7's exact-`commit_id` pattern instead: `finish-pr.md`'s own Phase 7.5 re-squashes
  on every round here, so a review of the pre-squash intermediate commit is genuinely stale, the same
  reasoning that justifies Phase 7's pattern in the first place. Resolve the post-squash SHA with
  `git rev-parse HEAD`, poll for a Copilot review whose `commit_id` matches it, and if one arrives,
  follow `pr-comments.md` Steps 1–7 plus the business-rule-dispute rule. Only once the operator
  confirms Devin is clean **and** that follow-up Copilot check comes back clean (or `no-review`) on
  the final commit does Phase 10 below present anything as ready.

**This changes when `finish-pr.md`'s stated precondition applies.** Its own text says "call this
only after the human has manually tested the PR and approved it" — that line still describes
running `/finish-pr` *standalone* (a PR that didn't go through `/issue-full`/`/issue`/`/issue-devin-interactive`, or a human choosing to run
it by hand after their own review). Inside this pipeline it runs automatically, before the human's
test, by design. If you want `finish-pr.md`'s own precondition sentence to reflect both entry
points explicitly, see the note in "See also" below.

---

## PHASE 10 — Final report — ready for your review

**Note on token usage / cost:** Claude Code does not currently give a running command a reliable
way to read its own session's exact token usage from inside a Bash call — there's no documented
session ID or transcript path exposed to tool calls mid-session (this is a known, currently open
gap in Claude Code itself, not something to paper over with a brittle "most recently modified
file" heuristic, which breaks under parallel sessions — and this repo routinely runs up to 8 in
parallel via dev-lab). Per the zero-interruption rule, this pipeline does not stop to ask for
`/usage`'s output — cost logging is skipped entirely rather than blocking the run on a reply that
may never come (e.g. when `/issue-devin-interactive` is invoked unattended by a scheduled loop).

### 10a. Skip cost logging

Do not call `AskUserQuestion` here. Do not write or touch a `## 💸 Token & Cost` section on the
issue — if one already exists from a prior manual run, leave it exactly as-is. If you want a given
run's cost logged, run `/usage` yourself afterward; this command will not ask for it.

### 10b. Print the final report

Before printing, fetch the current PR body and read its canonical `## ⚠️ Needs Human Judgment`
section:

```bash
gh pr view <N> --repo pakodiazdev/sushigo --json body --jq .body
```

Copy every bullet from that section into the matching final-report section below. This read does
not violate the subagent boundary: the PR body is the durable decision record written by the
workers, not raw polling, browser, diff, or CI output. If the section is empty, omit the report
subsection instead of leaving placeholder bullets.

````
## Issue #<NNN> — Ready for your review

### Branch / PR
<branch-name> → <PR URL>

### Assumptions made (if any)
- <bullet from Phase 1, if recorded>

### ⚠️ Needs Human Judgment (if any)
- <bullet: reviewer comment/flag + why the issue's literal reading was kept instead — full list on
  the PR's `## ⚠️ Needs Human Judgment` section>

### CI
✅ All checks passing (final validation post-close-out, Phase 9 / finish-pr Phase 7.6)

### Copilot review
- Threads addressed: <N> · Skipped (justified): <N> · Business-rule disputes overridden: <N> (see
  `## ⚠️ Needs Human Judgment` above)

### Devin / DeepWiki (human-relayed)
- Bugs: 0 (confirmed by operator) · Flags evaluated: <N> (<M> fixed, <K> marked not applicable, <J>
  business-rule disputes overridden — see `## ⚠️ Needs Human Judgment` above)
- Rounds relayed: <N>

### Coverage
- New code: <X>% (≥80% required)

### 📚 Documentation
- Swagger: <regenerated / not applicable> · Architecture docs: <updated <file> / not applicable> ·
  README: <updated / not applicable>

### ✅ Acceptance Criteria
- <N>/<M> checked off on the issue (see issue for the full list)

### 📋 Close-out (Phase 9 / finish-pr)
- Issue finalized: Tracked <Xh Ym>, Retrospective added · Archived: `doc/tasks/<yyyy-mm>/<NNN>-<slug>.md`
- Project board: moved to Done · Sprint doc: issue's row updated (or: not part of the current sprint)

### 💸 Token usage / cost
Not tracked — unattended run (zero-interruption mode skips the `/usage` prompt). Run `/usage`
yourself afterward if you want this run's cost.

### ⚠️ Not merged
Everything that can be automated is done — code, tests, docs, issue finalized and archived,
project board, sprint doc. All that's left is your manual test. If it looks right, merge it
yourself:
```bash
gh pr merge <N> --merge
```
I have not merged it and will not.
````

Business-rule disputes from Copilot or Devin do not pause the run — they're overridden in place,
logged under `## ⚠️ Needs Human Judgment`, and the pipeline continues straight through Phase 9/10 in
the same pass; only the fact-gathering itself (what Devin found) is relayed by the operator in
Phase 8, not the decision about how to resolve a dispute. What can still end a run before Phase 10
reaches this report: Phase 5's CI-failure cap, Phase 8 step 7's own CI-failure cap, and any stop
reached during Phase 9's delegation to `finish-pr.md`'s Phases 0–2 (see Phase 2's
Session-closing rule and Phase 9's own notes above for the non-exhaustive list of which conditions
that covers). Every one of those closes the Sessions entry (Phase 2's rule) and reports what
happened before ending the run, since none of them are judgment calls to resolve — they're either a
protective limit on a runaway loop or a precondition that genuinely isn't met yet.

---

## See also

- `.claude/commands/issue-full.md` (`/issue-full`) and `.claude/commands/issue.md` (`/issue`) —
  siblings of this pipeline, differing only in Phase 8's review mechanism (fully automated Devin,
  and Codex via PR comment, respectively). See #468 for why they exist and what they're being
  compared against.
- `.claude/commands/start-issue.md` — Phases 1–2, 4–6 reused above; run standalone for a single
  work session without the full pipeline.
- `.claude/commands/pr-comments.md` — Steps 1–7 reused in Phase 6; run standalone to re-resolve
  comments outside this flow.
- `.claude/commands/finish-pr.md` — its Phases 1–7.6 are reused wholesale in Phase 9 above, run
  automatically instead of waiting for a human. Its opening line already names both entry points
  ("call this only after the review — manual or automated — has left the PR ready"), so no edit is
  needed there. Its Phase 7.5a (promote the PR out of `[wip]`) runs as written. Its Phase 7.6b is
  now a read-only Codex + SonarCloud-quality-gate check, not a browser scan — Phase 9's override
  above runs its Sonar sub-check, marks the Codex sub-check `n/a` for this variant, and keeps this
  file's own interactive Devin relay as the post-squash review check.
- `.claude/skills/fix-tests/SKILL.md` — a narrower, standalone tool for fixing failures in an
  *existing* test suite outside of an active issue; its confirmation gate exists because it may be
  touching behavior nobody currently intends to change, which doesn't apply to Phase 3 above (you
  authored both the test and the implementation together, guided by the issue).
