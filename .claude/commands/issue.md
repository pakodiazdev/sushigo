---
allowed-tools: Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh pr view:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(gh run view:*), Bash(gh run watch:*), Bash(gh api:*), Bash(gh repo view:*), Bash(gh project item-list:*), Bash(gh project item-add:*), Bash(gh project:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git fetch:*), Bash(git push:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git rebase:*), Bash(git reset:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Bash(tail:*), Bash(date:*), Bash(sleep:*), Bash(cd:*), Bash(basename:*), Bash(docker exec:*), Bash(php artisan:*), Bash(./vendor/bin/pint:*), Bash(npm:*), Bash(npx:*), Bash(make:*), Bash(curl:*), Read, Edit, Write, WebFetch, ToolSearch, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__find, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__browser_batch, mcp__claude-in-chrome__read_page
description: End-to-end autonomous delivery for a single GitHub issue — validate it exists, gather context, implement via TDD, open the PR, then loop through CI, Copilot review, and Devin/DeepWiki review until everything is green. Runs fully unattended: never pauses for human input, even on a business-rule dispute — the issue's literal text wins and every override is logged on the PR for later review. Never merges.
argument-hint: <issue-number>
---

# /issue #$ARGUMENTS — Autonomous issue delivery pipeline

You are taking issue **#$ARGUMENTS** of the SushiGo monorepo from "just filed" to "PR ready for
manual review," in a single, fully unattended run. This command never asks for input — it is
designed to be safe to run with nobody watching, including as the target of a scheduled loop that
picks up newly-assigned issues on its own.

This command **orchestrates existing commands by reference** instead of duplicating their logic.
Where a phase below says "follow `.claude/commands/X.md`," **read that file** with the Read tool and
execute its procedure as written — this command only states what's *different* for this flow. If
you ever need to run a single stage in isolation (e.g. just re-resolve PR comments, or just do the
post-merge housekeeping), use `/start-issue`, `/pr-comments`, or `/finish-pr` directly — those are
unchanged and still work standalone.

**Composition contract — this matters because these files get edited independently.** Phase
references below (e.g. "Phase 1, 1a, and 2" from `start-issue.md`) point at that file's *current*
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

**One `/issue` run per issue at a time.** Every phase that edits the issue body (`gh issue view ...
> file`, edit, `gh issue edit --body-file`) is a read-modify-write with no locking — the same
gap `/start-issue`, `/pr-comments`, and `/finish-pr` already have standalone. Two concurrent runs
against the *same* issue number (e.g. from two dev-lab workspaces) can clobber each other's writes
to the Sessions array or checklist. This has already happened for real on this project once for a
different reason (two workspaces independently starting the same issue) — check that no other
workspace is already running `/issue`, `/start-issue`, `/pr-comments`, or `/finish-pr` against the
same issue number before starting. **This check is still manual (Phase 0/1's job) today.** A future
scheduled loop that invokes `/issue` unattended (see the zero-interruption rule) must perform the
equivalent check itself — e.g. an existing branch/open PR for that issue number, or a lock file —
*before* dispatching a run; this command does not defend against a double-dispatch on its own.

---

## The zero-interruption rule

Every decision in this pipeline — what to implement, how to fix a failing test, whether a review
comment is valid, whether a Devin flag matters, how to resolve an ambiguity in the issue, and how to
resolve a business-rule dispute raised by an automated reviewer — is made by you, alone, using the
issue's Description/Reason/Objective/Acceptance Criteria as the source of truth. **This command never
calls `AskUserQuestion` or otherwise pauses waiting for a human reply, at any phase.**

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
Needs Human Judgment` is only for disputes an automated reviewer actually raised (Phase 6/8) and
this pipeline overrode. Phase 8's Chrome-extension check (also reached via Phase 9/`finish-pr.md`'s
7.6b) auto-skips instead of asking whether to wait — see that phase for the exact fallback. Phase 10
does not ask for `/usage` output — cost logging is skipped entirely in this mode, noted as such in
the final report instead of blocking on it.

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

Follow `.claude/commands/start-issue.md` **Phases 1, 1a, and 2** exactly as written (mandatory
issue sections check, link to the SushiGo Admin project, codebase exploration).

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
- The **safety caps** (Phase 5's CI-failure cap, Phase 8's Devin-cycle cap).
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
gh pr create --title "..." --body "..."
gh pr edit <N> --body-file <path-to-updated-body>   # inserts Devin Review:, per start-issue.md 8c
```

**Never merge.** Report the PR URL and continue to Phase 5.

---

## PHASE 5 — CI gate

```bash
gh pr checks <N> --repo pakodiazdev/sushigo --watch
```

This blocks until every check (linters + tests, per the repo's GitHub Actions workflows) finishes.

- **Called right after `gh pr create` (end of Phase 4, or after a fresh push elsewhere in this
  command):** GitHub Actions can take several seconds to register the workflow runs as pending
  checks. If this command reports "no checks reported" immediately, that means it ran before any
  check exists yet — not that there's nothing to wait for. Wait ~10s and re-run it once or twice
  before treating an empty result as meaningful; only trust "no checks reported" as final if it
  still says so after that short retry.
- **All green** → continue.
- **Something failed** → pull the failing job's log (`gh run view <run-id> --log-failed`, using the
  run ID from `gh pr checks` or `gh api repos/.../commits/<sha>/check-runs`), diagnose against the
  same discipline as Phase 3, fix, commit, push, and re-run this gate.
- **Safety cap:** if the *same* check fails **6 times in a row**, stop looping and report the
  failure to the user instead of continuing indefinitely — this is a protective cap, not a
  business-rule stop. Close the Sessions entry (Phase 2's rule) before reporting — do not attempt
  cost logging (Phase 10 skips it entirely per the zero-interruption rule; there's nothing to do
  here on that front).

Later phases refer back to this gate as "**re-run the CI gate (Phase 5)**" rather than repeating
this text.

---

## PHASE 6 — Copilot review loop

Poll for Copilot's automated review (it posts asynchronously, usually within a few minutes):

```bash
gh api --paginate repos/pakodiazdev/sushigo/pulls/<N>/reviews --jq '.[].user.login'
```

Poll every ~30s for up to ~10 minutes. If nothing from a login containing `copilot` (case-
insensitive — GitHub's bot login is `copilot-pull-request-reviewer`, but don't rely on exact casing)
shows up in that window, treat it as "no review to attend" and continue to Phase 7 — don't block
forever on a review that may not fire for this diff.

Once a Copilot review is present, **read and follow `.claude/commands/pr-comments.md`'s Steps 1–7
in full**, with one addition inserted into Step 4a's analysis:

> **Business-rule dispute** — the comment isn't proposing a code fix, it's disputing what the
> feature should *do* (see "The zero-interruption rule"). Keep the issue's literal reading, reply on
> the thread explaining why (citing the issue's Description/Objective/Acceptance Criteria), resolve
> the thread, and add a bullet to the PR's `## ⚠️ Needs Human Judgment` section with the comment
> verbatim and that same reasoning. Every other comment still follows `pr-comments.md`'s existing
> Address / Skip logic exactly.

If this loop pushed any new commits, **re-run the CI gate (Phase 5)** before moving on — don't act
on a stale CI result.

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
force or not) — it can post a fresh review with new threads on the squashed commit. **Re-run the CI
gate (Phase 5)** once before entering Phase 8.

Also re-poll for Copilot, but not with Phase 6's plain existence check — a Copilot review from
*before* this push already exists in the list by now, so "does any `copilot` login show up" would
trivially pass immediately without waiting for anything new, letting a fresh comment from *this*
push slip past unnoticed. Instead, record the latest existing review's `submitted_at` (or the
review count) right before pushing, then poll (same ~30s / ~10min cadence as Phase 6) until either
a *newer* `submitted_at` appears or the count increases:

```bash
gh api --paginate repos/pakodiazdev/sushigo/pulls/<N>/reviews --jq '.[] | select(.user.login | test("copilot"; "i")) | .submitted_at' | tail -1
```

If a genuinely new Copilot review shows up, follow `pr-comments.md`'s Steps 1–7 in full (same
business-rule-dispute addition as Phase 6). If nothing newer appears within the window, treat it
like Phase 6 — no review to attend — and continue to Phase 8.

---

## PHASE 8 — Devin / DeepWiki review loop

This project is on Devin's free tier — the review surface is the public DeepWiki-mirrored page, not
a private API. Use the Chrome browser tools (load via `ToolSearch` if deferred):

```
navigate → https://app.devin.ai/review/pakodiazdev/sushigo/pull/<N>
```

The page is a client-rendered SPA — `WebFetch` returns an empty shell and is not sufficient here;
use `get_page_text` / `find` (and a screenshot if the text extraction is ambiguous).

- **If the scan is still running** ("in progress"/"scanning"), wait and re-check — a short poll
  loop, or `ScheduleWakeup` if this is running as a background/dispatched session — rather than
  reporting an incomplete result.
- **If the Chrome extension isn't connected**, try `tabs_context_mcp` once; if it still fails, skip
  this phase automatically — this sub-check is supplementary to CI and Copilot, not a hard blocker
  on its own. Note the skip plainly in the final report (Phase 10) as "Devin/DeepWiki: skipped,
  Chrome extension unavailable" rather than silently omitting it.

Once loaded, read the **Bugs** count and the **Flags** panel. Then, in a loop:

1. **For every reported bug** — read the referenced code and verify it's real. If real, fix it
   (same discipline as Phase 3). If it's a false positive, note why in your final report and don't
   silently dismiss it without checking.
2. **For every flag** — evaluate whether it's valid and impactful, using the same business-rule bar
   as everywhere else in this command: if a flag amounts to disputing intended behavior, keep the
   issue's literal reading and add it to the PR's `## ⚠️ Needs Human Judgment` section instead of
   fixing it; otherwise decide yourself. If not valid, record why in your own report — the DeepWiki page
   is a public, unauthenticated mirror (no GitHub connection in this pipeline), so its own
   "Resolve"/"Mark as read" controls may not actually persist anything; try them if available, but
   the written record in your report is what actually matters, not the page's state. If valid,
   treat it like a bug and fix it. **You don't need to reach zero flags** — but every flag
   must be explicitly evaluated and the reasoning recorded, even if the conclusion is "not
   applicable."
3. **If anything changed as a result:**
   - Run the locally-relevant tests again (Phase 3's scope + discipline).
   - Commit and push.
   - Re-check Copilot the same way Phase 7 does — a plain "does a `copilot` login exist" check
     would trivially pass on a review already sitting there from before this push; record the
     latest existing review's `submitted_at` (or count) right before pushing, then poll (shorter
     window — a few minutes is enough since this is a smaller diff) until a *newer* one appears.
   - **Re-run the CI gate (Phase 5).**
   - Reload the Devin page and re-check for new bugs/flags introduced by this round's fix.
4. Repeat from step 1 until Devin shows **0 bugs** and every flag has been evaluated (resolved,
   fixed, or explicitly noted as not applicable).

**Safety cap:** stop after **5 cycles** through this loop and report the remaining state to the
user rather than continuing indefinitely. Close the Sessions entry (Phase 2's rule) before
reporting — do not attempt cost logging (Phase 10 skips it entirely per the zero-interruption
rule; there's nothing to do here on that front).

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
  original diff and Phase 7's post-squash Copilot re-poll (above) catches any thread that push
  itself triggered. CI on the commit Phase 9 inherits was already validated separately, by this
  pipeline's own Phase 5/7/8 (whichever ran last before Phase 9 started) — not by anything inside
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
  to actually reflect what happened in Phases 5, 6, and 8 (CI retries, Copilot threads, Devin
  cycles) — not just "implemented the feature," since those cycles are real time and real cost.
- **Phases 4–7** (local archive, project board → Done, sprint doc, README) — run exactly as
  documented in `finish-pr.md`.
- **Phase 7.5** (final squash+push) and **7.6** (final CI + Devin re-validation) — this is the true
  final gate before Phase 10 below presents anything to the human. **Override:** `finish-pr.md`'s
  own Phase 7.6b describes an interactive fallback if the Chrome extension isn't connected — when
  reached from inside this pipeline, that fallback does not apply. Use this file's own
  zero-interruption auto-skip instead (Phase 8's Chrome-extension bullet above) and note the skip in
  Phase 10's report rather than prompting.

**This changes when `finish-pr.md`'s stated precondition applies.** Its own text says "call this
only after the human has manually tested the PR and approved it" — that line still describes
running `/finish-pr` *standalone* (a PR that didn't go through `/issue`, or a human choosing to run
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
may never come (e.g. when `/issue` is invoked unattended by a scheduled loop).

### 10a. Skip cost logging

Do not call `AskUserQuestion` here. Do not write or touch a `## 💸 Token & Cost` section on the
issue — if one already exists from a prior manual run, leave it exactly as-is. If you want a given
run's cost logged, run `/usage` yourself afterward; this command will not ask for it.

### 10b. Print the final report

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

### Devin / DeepWiki
- Bugs: 0 · Flags evaluated: <N> (<M> fixed, <K> marked not applicable, <J> business-rule disputes
  overridden — see `## ⚠️ Needs Human Judgment` above)
- Chrome extension: <connected / skipped, unavailable>

### Coverage
- New code: <X>% (≥80% required)

### 📚 Documentation
- Swagger: <regenerated / not applicable> · Architecture docs: <updated <file> / not applicable> ·
  README: <updated / not applicable>

### ✅ Acceptance Criteria
- <N>/<M> checked off on the issue (see issue for the full list)

### 📋 Close-out (Phase 9 / finish-pr)
- Issue finalized: Tracked <Xh Ym>, Retrospective added · Archived: `doc/tasks/<yyyy-mm>/<NNN>-<slug>.md`
- Project board: moved to Done · Sprint doc / README: updated (or: not part of the current sprint)

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

Business-rule disputes from Copilot or Devin no longer pause the run (see "The zero-interruption
rule") — they're overridden in place, logged under `## ⚠️ Needs Human Judgment`, and the pipeline
continues straight through Phase 9/10 in the same pass. What can still end a run before Phase 10
reaches this report: the safety caps (Phase 5's CI-failure cap, Phase 8's Devin-cycle cap), and any
stop reached during Phase 9's delegation to `finish-pr.md`'s Phases 0–2 (see Phase 2's
Session-closing rule and Phase 9's own notes above for the non-exhaustive list of which conditions
that covers). Every one of those closes the Sessions entry (Phase 2's rule) and reports what
happened before ending the run, since none of them are judgment calls to resolve — they're either a
protective limit on a runaway loop or a precondition that genuinely isn't met yet.

---

## See also

- `.claude/commands/start-issue.md` — Phases 1–2, 4–6 reused above; run standalone for a single
  work session without the full pipeline.
- `.claude/commands/pr-comments.md` — Steps 1–7 reused in Phase 6; run standalone to re-resolve
  comments outside this flow.
- `.claude/commands/finish-pr.md` — its Phases 1–7.6 are reused wholesale in Phase 9 above, run
  automatically instead of waiting for a human. Its own opening line ("call this only after the
  human has manually tested the PR and approved it") still describes running it *standalone* on a
  PR that didn't go through `/issue` — worth a small edit to `finish-pr.md` itself if you want that
  file to name both entry points explicitly, e.g.: "Call this after a PR is ready to close out —
  either by hand once you've manually tested and approved it, or automatically as `/issue`'s own
  Phase 9." Its Devin/DeepWiki check (Phase 7.6b) is what Phase 9 above relies on for the final
  re-scan post-squash; Phase 8's own loop earlier is what gets Devin to 0 bugs in the first place.
- `.claude/skills/fix-tests/SKILL.md` — a narrower, standalone tool for fixing failures in an
  *existing* test suite outside of an active issue; its confirmation gate exists because it may be
  touching behavior nobody currently intends to change, which doesn't apply to Phase 3 above (you
  authored both the test and the implementation together, guided by the issue).
