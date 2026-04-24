---
name: pr-review
description: PR follow-up — address review comments (Copilot/Devin/Pako), verify SonarCloud quality, validate commit convention, and report status.
argument-hint: <pr-number>
---

# PR Follow-up: #$ARGUMENTS

You are performing a full PR follow-up for PR **#$ARGUMENTS** of the SushiGo monorepo.
Work through every section below in order. Use GitHub MCP tools and Bash for all data fetching.

---

## SECTION 1 — PR Overview

Fetch and display:
- Title, author, state, base branch, head branch
- Linked issue number (extract `[#NNN]` from title or body)
- List of changed files

```
gh pr view $ARGUMENTS --json title,author,state,baseRefName,headRefName,body
gh pr diff $ARGUMENTS --name-only
```

---

## SECTION 2 — Review Comments

Fetch all review comments and regular comments on this PR:

```
gh api repos/JFcoDiaz/sushigo/pulls/$ARGUMENTS/comments --paginate
gh api repos/JFcoDiaz/sushigo/issues/$ARGUMENTS/comments --paginate
gh api repos/JFcoDiaz/sushigo/pulls/$ARGUMENTS/reviews --paginate
```

For each comment, identify the author. The expected reviewers are:
- **Copilot** — GitHub Copilot automated review (author login contains `copilot` or `github-actions`)
- **Devin** — Devin AI automated review (author login contains `devin`)
- **Pako Díaz** — human developer (author login `JFcoDiaz` or `jfcodiaz`)

**For every comment, apply this decision matrix:**

| Criterion | Action |
|---|---|
| Valid bug, real issue, or adds clear value | ✅ **ATENDER** — implement the fix, reply with solution + commit hash, mark resolved |
| Correct observation but already handled | ✅ **ATENDER** — reply explaining where/how it was handled, mark resolved |
| Style preference with no functional impact | ⚖️ **EVALUAR** — apply if aligns with CLAUDE.md conventions; justify decision |
| Misinterpretation, wrong context, or doesn't apply | ❌ **DESCARTAR** — reply with reason, do NOT mark resolved yet (leave for reviewer) |
| Duplicate or already addressed by another comment | ❌ **DESCARTAR** — reply pointing to the other comment/commit |

**For each comment produce a table row:**

| # | Reviewer | File / Location | Comment summary | Decision | Action taken / Reason |
|---|---|---|---|---|---|

After the table, list all comments that require code changes and implement them (use Edit/Write tools). After implementing each fix, note the commit hash once committed.

---

## SECTION 3 — Commit Convention Audit

Fetch all commits in this PR:

```
gh pr view $ARGUMENTS --json commits --jq '.commits[].messageHeadline + "\n" + (.commits[].messageBody // "")'
```

Validate **every commit** against the SushiGo convention:

### Required rules (CLAUDE.md + doc/conventions/git/commits.md)

1. **Subject line format**: `emoji [#NNN] - description emoji`
   - Opening emoji must match category: ✨ feat · 🐛 fix · 📚 docs · 🎨 style · 🔨 refactor · 🚀 perf · ✅ test · 🔧 chore
   - Issue number: `[#NNN]` zero-padded to 3 digits, e.g. `[#127]` not `[#127]`
   - Dash with spaces: ` - ` between issue number and description
   - Closing ornamental emoji required on subject line
2. **Body**: each bullet **must start with an emoji** — plain `- text` is a violation
3. **Issue linkage**: every commit must reference a GitHub issue — no bare commits without `[#NNN]`

For each commit produce a row:

| Commit SHA (short) | Subject | ✅ Opens emoji | ✅ Issue [#NNN] | ✅ Dash ` - ` | ✅ Closes emoji | ✅ Body bullets have emoji | Verdict |
|---|---|---|---|---|---|---|---|

If any commit fails, list the specific violations and whether they are blocking.

---

## SECTION 4 — SonarCloud Quality Gate

Check SonarCloud for this PR. The project key is: **JFcoDiaz_sushigo** (try variations if needed).

```
gh api "https://sonarcloud.io/api/qualitygate/project_status?projectKey=JFcoDiaz_sushigo&pullRequest=$ARGUMENTS" 2>/dev/null || echo "SonarCloud API requires token — check manually"
```

If the API is not available without a token, instruct the user to check:
`https://sonarcloud.io/project/overview?id=JFcoDiaz_sushigo`

Report on:
- **Quality Gate status**: Passed / Failed
- **New code coverage**: must be ≥ 80%
- **New bugs**: must be 0
- **New code smells**: must be 0
- **New security issues**: must be 0
- **Duplicated lines on new code**: must be < 3%

If the gate has failed, list each failing metric with its current value vs. threshold.

---

## SECTION 5 — Linters (must pass before any push)

Run both linters regardless of which side of the stack changed. Both must exit with 0 errors before committing fixes.

**Backend — Laravel Pint (auto-fixes formatting):**
```bash
docker exec dev_container bash -c "cd /app/code/api && ./vendor/bin/pint" 2>&1
```
Stage any auto-fixed files and include them in the fix commit. A commit must NOT be created if Pint reports errors it could not auto-fix.

**Frontend — ESLint + TypeScript:**
```bash
docker exec dev_container bash -c "cd /app/code/webapp && npm run lint && npm run typecheck" 2>&1
```
Zero errors required (`any` usage, missing types, unused imports all count as errors). Warnings in files not touched by this PR are acceptable but must not increase.

Report:
- Backend Pint: ✅ clean / ❌ errors (list files)
- Frontend ESLint: ✅ 0 errors / ❌ N errors (list rules violated)
- Frontend TypeScript: ✅ 0 errors / ❌ N errors (list files + lines)

---

## SECTION 6 — Test Suite (Local Verification)

**Run all existing tests first** to catch regressions, then run targeted coverage for new files.

**Full webapp test suite:**
```bash
docker exec dev_container bash -c "cd /app/code/webapp && npx vitest run 2>&1 | tail -15"
```

**Full API test suite:**
```bash
docker exec dev_container bash -c "cd /app/code/api && php artisan test 2>&1 | tail -15"
```

**Coverage on new/changed files only** (webapp):
```bash
docker exec dev_container bash -c "cd /app/code/webapp && npx vitest run --coverage --coverage.include='src/path/to/changed/**' 2>&1 | tail -20"
```

Report:
- All existing tests still pass: ✅ / ❌ (list regressions)
- Coverage on new files: list each file with % statements
- Overall new code coverage: X% (threshold: ≥80%)

---

## SECTION 7 — Final PR Status Report

Produce a consolidated report with this structure:

```
## PR #NNN — Follow-up Report

### Review Comments
- Total comments: N
- Attended (fixed): N
- Attended (already handled): N
- Discarded (with justification): N
- Pending (needs reviewer confirmation): N

### Commit Convention
- Total commits: N
- Compliant: N
- Violations: N (list SHAs)

### SonarCloud
- Quality Gate: ✅ Passed / ❌ Failed
- New coverage: X% (≥80% required)
- New bugs: N (0 required)
- New code smells: N (0 required)

### Linters
- Backend Pint: ✅ / ❌
- Frontend ESLint: ✅ 0 errors / ❌ N errors
- Frontend TypeScript: ✅ 0 errors / ❌ N errors

### Test Suite
- Existing tests (no regressions): ✅ / ❌
- New code coverage: X% (≥80% required)

### Overall Status
✅ READY TO MERGE / ⚠️ NEEDS WORK / ❌ BLOCKED

### Blockers (if any)
1. ...
2. ...
```

If everything passes, post this report as a comment on the PR:

```
gh pr comment $ARGUMENTS --body "$(cat report.md)"
```
