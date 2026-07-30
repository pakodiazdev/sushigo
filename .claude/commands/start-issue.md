---
allowed-tools: Bash(gh issue view:*), Bash(gh issue edit:*), Bash(gh pr create:*), Bash(gh repo view:*), Bash(gh project item-list:*), Bash(gh project item-add:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git fetch:*), Bash(git push:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git rebase:*), Bash(git reset:*), Bash(find:*), Bash(ls:*), Bash(date:*), Bash(docker exec:*), Read, Edit, Write
description: Start a work session on a GitHub issue — load context, create branch, open a session directly on the issue, then drive TDD implementation through to PR
---

# Start Issue #$ARGUMENTS

You are starting a full development session for issue **#$ARGUMENTS** of the SushiGo monorepo.
Work through every phase below in order. Do not skip phases.

The GitHub issue is the **only** live document for this work — see
[TD-01](../../doc/decisions/td-01-single-source-issue-tracking.md) and
`doc/conventions/tasks.md`. Nothing is created or edited in `doc/tasks/` during this command; the
local archive is written once, later, by `/finish-pr`.

---

## PHASE 1 — Load the issue

```bash
gh issue view $ARGUMENTS --repo pakodiazdev/sushigo --json number,title,body,labels,state
```

If the issue is closed, stop and inform the user.

Extract from the title/body:
- The **task type** (feature, fix, refactor, docs, chore) — infer from emoji prefix or label
- A **2–5 word kebab-case slug** for the branch name

Check the issue body has the mandatory sections from `doc/conventions/tasks.md` (Description/
Reason/Objective, or Bug description/Hypothesis/Reproduction guide for bugs, plus a `## ⏱️ Time`
block with Estimates and a `Sessions` array). If any are missing, add them now via `gh issue edit`
before continuing — do not silently work around a malformed issue.

### 1a. Ensure the issue is linked to the SushiGo Admin project

```bash
gh issue view $ARGUMENTS --repo pakodiazdev/sushigo --json projectItems -q '.projectItems[].project.title'
```

If `"SushiGo Admin"` is not in the list, link it (Status field only — never set the Iteration field,
that is a sprint-assignment decision the user makes explicitly):

```bash
gh project item-add 7 --owner pakodiazdev --url https://github.com/pakodiazdev/sushigo/issues/$ARGUMENTS
```

---

## PHASE 2 — Codebase context

Based on the issue description, locate the relevant files in the repository:

- For **backend changes**: look in `code/api/app/`, `code/api/database/migrations/`, `code/api/database/seeders/`, `code/api/routes/`, `code/api/tests/`
- For **frontend changes**: look in `code/webapp/src/pages/`, `code/webapp/src/services/`, `code/webapp/src/types/`, `code/webapp/src/components/`
- For **E2E tests**: look in `code/webapp/cypress/e2e/`

Read the files most relevant to what the issue asks for. Pay special attention to:
- Existing models, controllers, and routes adjacent to what needs to be built
- The current state of the page or component that will be extended
- Existing test patterns for similar features in `code/api/tests/Feature/` and `code/webapp/src/services/__tests__/`

---

## PHASE 3 — Context report and Q&A

Present a structured summary to the user:

```
## Issue #NNN — Context Report

### What this issue requires
<2–4 bullet points describing the work>

### Files that will be created or modified
**Backend:**
- <file path> — <reason>

**Frontend:**
- <file path> — <reason>

**Tests:**
- <file path> — <reason>

### Open questions (if any)
1. <question>
2. <question>
```

If there are open questions, **stop here and wait for the user to answer**. Do not proceed to Phase 4 until all questions are resolved. Re-read this phase's output and incorporate the answers before continuing.

---

## PHASE 4 — Create the branch

### Branch naming (mandatory)

Format: `<type>/<NNN>-<short-description>`

| Type | When |
|---|---|
| `feature/` | new functionality |
| `fix/` | bug fix |
| `refactor/` | restructure without behavior change |
| `docs/` | documentation only |
| `chore/` | config, tooling |

Rules:
- NNN is the **GitHub issue number zero-padded to 3 digits** (e.g. `066`, `135`) — this is now the
  only ID this work will ever have; there is no separate local numbering to keep in sync
- Short description is 2–5 words, lowercase, kebab-case, English only
- Always branch from current `main`

```bash
git fetch origin main
git checkout -b <type>/<NNN>-<short-description> origin/main
```

---

## PHASE 5 — Open a work session on the GitHub issue

Do **not** create, move, or edit any file under `doc/tasks/` — the issue itself is the only place
session data lives while work is open.

Fetch the current body, append a new entry to the `Sessions` JSON array under `## ⏱️ Time` (create
the array as `[]` first if the issue somehow doesn't have one yet — see Phase 1's check), using
today's date and the current local time as `start` and `"?"` as `end`:

```bash
gh issue view $ARGUMENTS --repo pakodiazdev/sushigo --json body -q .body > /tmp/issue-body.md
# edit /tmp/issue-body.md: append { "date": "YYYY-MM-DD", "start": "HH:MM", "end": "?" } to Sessions
gh issue edit $ARGUMENTS --repo pakodiazdev/sushigo --body-file /tmp/issue-body.md
```

If the file already has previous session entries, append to the array rather than replacing it.

---

## PHASE 6 — TDD implementation

Follow this strict order. Do **not** write implementation code before the tests exist and fail.

### 6a. Write failing tests first

**Backend tests** (if the issue touches the API):
- Feature test in `code/api/tests/Feature/<Domain>/` covering: happy path, unauthorized access (403), validation errors (422)
- Unit tests for any model methods or business logic
- Run them to confirm they fail:
  ```bash
  docker exec dev_container bash -c "cd /app/code/api && php artisan test --filter=<TestClass>"
  ```

**Frontend tests** (if the issue touches the webapp):
- Vitest tests in `code/webapp/src/services/__tests__/` covering the service functions and hooks
- Run them to confirm they fail:
  ```bash
  docker exec dev_container bash -c "cd /app/code/webapp && npx vitest run src/services/__tests__/<test-file>"
  ```

### 6b. Implement until tests pass

Write the minimum code to make the tests pass:
- Backend: migration → model → request → resource → controller → route → seeder (if needed)
- Frontend: type → service function → hook → page/component

After each logical unit of work, re-run the relevant tests. Do not move to the next unit until current tests are green.

Run linters and fix errors before committing:
```bash
# Backend
docker exec dev_container bash -c "cd /app/code/api && ./vendor/bin/pint"

# Frontend
docker exec dev_container bash -c "cd /app/code/webapp && npm run lint && npm run typecheck"
```

### 6c. E2E test (mandatory if frontend was changed)

Write at least one Cypress spec covering the happy path(s) of the new feature. Place it in `code/webapp/cypress/e2e/<feature-name>.cy.ts`.

Verify it passes against the dev-lab stack:
```bash
make cypress-run SPEC=cypress/e2e/<feature-name>.cy.ts
```

---

## PHASE 7 — Commit

### Commit format (mandatory — from CLAUDE.md)

```
:emoji [#NNN] - short description :emoji

- :emoji Activity 1
- :emoji Activity 2
```

Rules:
- Every commit MUST have `[#NNN]` with the zero-padded issue number
- Opening and closing emojis required on subject line
- Every bullet in the body must start with an emoji
- Imperative mood, no period at the end

Emoji types:
- ✨ feat · 🐛 fix · 📚 docs · 🎨 style · 🔨 refactor · 🚀 perf · ✅ test · 🔧 chore

Stage and commit in logical units (migration + model together, controller + route together, frontend service + hook together, tests together).

### Squash rule

After all work is committed, count the commits on this branch:
```bash
git log --oneline origin/main..HEAD
```

If there are **more than 3 commits**, squash them into a single commit (or at most 3: backend, frontend, tests) using interactive rebase:
```bash
git rebase -i origin/main
```

The squashed commit(s) must still follow the commit convention above.

---

## PHASE 8 — Close session and push

### 8a. Close the work session on the GitHub issue

Fetch the current body, fill the `end` field of the session opened in Phase 5 with the current
local time:

```bash
gh issue view $ARGUMENTS --repo pakodiazdev/sushigo --json body -q .body > /tmp/issue-body.md
# edit /tmp/issue-body.md: set this session's "end" to "HH:MM"
gh issue edit $ARGUMENTS --repo pakodiazdev/sushigo --body-file /tmp/issue-body.md
```

`Tracked` stays `_in progress_` — it is only recomputed once, by `/finish-pr`, from the full
`Sessions` array. Do not hand-edit it here.

### 8b. Push the branch

```bash
git push -u origin <branch-name>
```

### 8c. Create the PR

Populate the `## Workspace` section with the name of the current workspace directory
(e.g. `sushigo-c`) and the branch name from `git branch --show-current`.

```bash
gh pr create \
  --title "<emoji> [#NNN] - <short description> <emoji>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>
- <bullet 3>

## Test plan
- [ ] PHPUnit: `php artisan test --filter=<TestClass>`
- [ ] Vitest: `npx vitest run src/services/__tests__/<file>`
- [ ] Cypress E2E: `make cypress-run SPEC=cypress/e2e/<file>.cy.ts` (if applicable)
- [ ] Linters: Pint ✅ · ESLint ✅ · TypeScript ✅

## Closes
Closes #NNN

## Workspace
`<workspace-name>` — `<branch-name>`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Never merge the PR.** Report the PR URL to the user and stop. The merge must be done by the user from GitHub after review.

---

## PHASE 9 — Final report

Output a concise summary:

```
## Issue #NNN — Session Complete

### Branch
`<branch-name>`

### Work done
- <what was built>

### Tests
- PHPUnit: N tests / N assertions
- Vitest: N tests
- Cypress: N specs (if applicable)

### PR
<PR URL>

### Session
<date> <start>–<end> (~Xh)

⚠️ PR is ready for review. Do NOT merge until approved.
```
