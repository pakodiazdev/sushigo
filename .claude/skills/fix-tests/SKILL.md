---
name: fix-tests
description: Run the test suite for api (PHPUnit) or webapp (Vitest), and iteratively diagnose and fix any failing tests until they pass. Fixes confined to the test file are applied directly; any fix that requires touching source code outside the test must be confirmed by the user first, with the problem and proposed solution presented before editing anything. Once fixes pass and lint is clean, commits the changed files and pushes to the current branch.
argument-hint: [api|webapp]
---

# Fix Failing Tests — `$ARGUMENTS`

Run and iteratively fix failing tests for the **$ARGUMENTS** sub-project of the SushiGo monorepo.

**Usage:** `/fix-tests api` · `/fix-tests webapp` · `/fix-tests` (both)

This skill covers **PHPUnit (api)** and **Vitest (webapp)** only. Cypress specs are out of scope —
E2E failures require manual triage since they involve seeded state and browser flows.

---

## Ground rule — the confirmation gate

There are two very different kinds of fixes, and they are **not** treated the same way:

| Fix scope | Who decides | How to apply |
|---|---|---|
| Changes confined to the failing test file itself (stale expectation, wrong mock, brittle setup, leftover assertion from a prior refactor) | You | Apply directly, no confirmation needed |
| Any change to a file **outside** `tests/**` (api) or `__tests__/**`/`*.test.ts(x)` (webapp) — i.e. the application/source code | The user | **Never edit without asking first.** Present the problem and the proposed solution, then wait for explicit confirmation |

If a failing test reveals a real defect or behavior gap in the source code, that is a judgment call about product behavior — not something to silently patch. Stop, explain, propose, and let the user decide.

---

## PHASE 0 — Parse arguments and detect environment

Parse `$ARGUMENTS`. Accepted values: `api`, `webapp`, or **empty** (both, api first then webapp).
Any other value: stop and print usage (`/fix-tests [api|webapp]`).

Detect execution mode:

```bash
docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^dev_container$" && echo "docker" || echo "local"
```

| Mode | Condition | Run PHP as | Run Node as |
|---|---|---|---|
| `docker` | `dev_container` running | `docker exec dev_container bash -c "cd /app/code/api && <cmd>"` | `docker exec dev_container bash -c "cd /app/code/webapp && <cmd>"` |
| `local` | dev-lab / Overmind, no container | `(cd code/api && <cmd>)` | `(cd code/webapp && <cmd>)` |

Use the detected `ENV_MODE` for every command below.

---

## PHASE 1 — Run the suite and capture failures

**API:**
```bash
php artisan test 2>&1 | tail -200
```

**Webapp:**
```bash
npx vitest run 2>&1 | tail -300
```

For each failing test extract: test name, file path, failure type (assertion mismatch, thrown exception, timeout), and the actual vs. expected values shown in the output.

If nothing fails: print `✅ <project> — all tests passing, nothing to fix.` and stop for that project.

---

## PHASE 2 — Triage every failure

For each failing test, read the test file **and** the source file(s) it exercises. Classify it into exactly one bucket:

- **TEST_BUG** — the test is wrong or stale: outdated expected value after an intentional behavior change, wrong mock arguments, incorrect setup/fixture, assumption that no longer holds, flaky/order-dependent assertion that can be fixed by making the test itself deterministic (e.g. freezing time, awaiting properly, isolating shared state). The fix stays inside the test file.
- **SOURCE_BUG** — the test is correctly describing the intended behavior, but the application code doesn't deliver it (real regression, incomplete implementation, off-by-one, wrong condition, etc.). The fix requires editing a file outside the test paths.
- **UNCLEAR** — you cannot confidently tell which side is wrong from reading the code alone. Treat as SOURCE_BUG for the purposes of the confirmation gate (never guess-edit source).

Print a triage table before touching anything:

```
## Triage — <project>

| # | Test | File | Classification | Summary |
|---|------|------|-----------------|---------|
```

---

## PHASE 3 — Apply TEST_BUG fixes

Apply all TEST_BUG fixes directly (Edit tool), one test file at a time. Keep each fix minimal — do not refactor unrelated parts of the test file.

---

## PHASE 4 — Confirmation gate for SOURCE_BUG / UNCLEAR items

**Do not edit any source file yet.** For every SOURCE_BUG / UNCLEAR item, present:

```
### <file>::<test name>
**Problem:** <what the test expects, what the code actually does, why they diverge, and the concrete failure scenario>
**Proposed fix:** <file(s) to change and what the change would do>
```

After listing all of them, ask the user for confirmation using `AskUserQuestion` (or a direct question if there's only one item) — options should let the user approve all, pick specific ones, or decline all. Do not proceed to Phase 5 without an explicit answer.

---

## PHASE 5 — Apply confirmed source fixes

Apply only the fixes the user approved. For anything declined, leave it failing and carry it into the final report as "skipped by user request" — do not re-propose it in later iterations of the same run.

---

## PHASE 6 — Re-run and loop

Re-run the full suite for the project (not just the previously-failing tests, to catch regressions from the fixes).

- If everything passes: go to Phase 7.
- If failures remain (new or unresolved): go back to Phase 2 with the updated failure list.
- **Loop limit: 5 iterations.** If failures remain after 5 iterations, stop and report what's still broken instead of continuing indefinitely.

---

## PHASE 7 — Lint check

Since files were edited, run the project's mandatory pre-commit linter before finishing (per CLAUDE.md):

**API:**
```bash
./vendor/bin/pint
```

**Webapp:**
```bash
npm run lint && npm run typecheck
```

Fix any errors the linter reports in files you touched. Do not fix unrelated pre-existing lint warnings.

---

## PHASE 8 — Final report

```
## Fix Tests Report — <project>

Iterations: N

### Fixed directly (test-only)
- <file>::<test name> — <one-line reason>

### Fixed in source (user-confirmed)
- <file> — <one-line summary of the change>, covering <test name>

### Skipped (user declined)
- <file>::<test name> — <problem summary, left failing>

### Still failing (loop limit reached)
- <file>::<test name> — <why it's still unresolved>

### Lint
- <✅ clean / ❌ N errors fixed>

Status: ✅ ALL GREEN / ⚠️ PARTIAL (N still failing / N skipped) / ❌ BLOCKED
```

---

## PHASE 9 — Commit and push the fixes

Run this once, after every requested project (`api`, `webapp`, or both) has finished Phases 1–8 — not per project.

**Skip this phase entirely** (no commit, no push) if no file was actually edited during the run (e.g. every project was already `✅ ALL GREEN` with nothing to fix). State `Nothing to commit — no files were changed.` in place of the commit/push section below.

Otherwise:

1. **Determine the issue number.** Parse the current branch name against `^[a-z]+/([0-9]{3})-`. If it matches, use that zero-padded number. If it doesn't match, ask the user for the issue number with `AskUserQuestion` before committing — never guess or invent one, per this repo's commit convention (`doc/conventions/git/commits.md` / root `CLAUDE.md`).
2. **Stage only the files this skill run actually modified** (tracked across Phases 3 and 5 of every project processed). Never use `git add -A` or `git add .` — untouched working-tree changes that predate this run must be left exactly as they were.
3. **Compose the commit message** following the mandatory format (emoji + `[#NNN] - description` + emoji, bulleted body with one emoji-prefixed line per fixed file):
   - Use ✅ as the type emoji for the subject line (this is a test-fixing commit).
   - Each bullet uses ✅ for a TEST_BUG fix or 🐛 for a user-confirmed SOURCE_BUG fix, summarizing what changed in that file.
   - If both `api` and `webapp` were processed, cover both in the same commit unless the user asked for them separately.
4. **Commit** with the composed message (heredoc, per this repo's git workflow), then **push** to the current branch's upstream (`git push`). Do not force-push, do not push to `main`/`master`, and do not skip hooks.
5. If the push fails (no upstream configured, diverged history, rejected, etc.), report the exact error and stop — do not retry with `--force` or any destructive flag; let the user decide how to proceed.

Add this to the Phase 8 report output:

```
### Commit & Push
- <sha> — <subject line> → pushed to <branch>
  (or: ⚠️ commit created but push failed: <error> — or — Nothing to commit — no files were changed.)
```
