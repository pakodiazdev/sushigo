---
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(gh run:*), Bash(gh api:*), Bash(gh pr view:*), Bash(gh repo view:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git status:*), Bash(git push:*), Bash(docker exec:*), Bash(find:*), Bash(ls:*), Read, Edit, Write
description: Review SonarCloud quality gate for webapp or api — fix new issues, security hotspots, coverage and duplication cyclically until 0 new issues, 0 code smells, 0 security hotspots, coverage >= 80% and duplication passes
---

# SonarCloud Quality Gate Review — `$ARGUMENTS`

Review and fix SonarCloud quality issues for the **$ARGUMENTS** sub-project cyclically until the quality gate fully passes.

**Usage:** `/sonar-review webapp` or `/sonar-review api`

---

## PHASE 0 — Parse and validate arguments

Parse `$ARGUMENTS`. Accepted values: `webapp`, `api`, or **empty** (no argument).

- If **empty**: run the full review for **both** `webapp` and `api`. Check the quality gate for each project first, then work through each failing project independently in order (`api` first, then `webapp`). Apply Phases 1–7 for each project. If both pass, report both as green and stop.
- If `webapp` or `api`: run the review for that project only.
- Any other value: stop and print:
  ```
  Usage: /sonar-review [webapp|api]

    webapp      — review pakodiazdev_sushigo-webapp only
    api         — review pakodiazdev_sushigo-api only
    (no args)   — check both projects; fix any that are failing
  ```

Map arguments to constants:

| Argument | Project key | SONAR_TOKEN env var | CI workflow name | Source dir |
|---|---|---|---|---|
| `webapp` | `pakodiazdev_sushigo-webapp` | `SONAR_TOKEN_WEBAPP` | `Webapp Tests (Vitest + Coverage)` | `code/webapp` |
| `api` | `pakodiazdev_sushigo-api` | `SONAR_TOKEN_API` | `API Tests (PHPUnit + Coverage)` | `code/api` |

Verify the token is set:

```bash
# For webapp:
echo "${SONAR_TOKEN_WEBAPP:-MISSING}"
# For api:
echo "${SONAR_TOKEN_API:-MISSING}"
```

If the token is `MISSING`, stop and instruct the user:

```
Missing SONAR_TOKEN_<WEBAPP|API> environment variable.
Add it to your shell profile or run:
  export SONAR_TOKEN_WEBAPP=<your-token>   # for webapp
  export SONAR_TOKEN_API=<your-token>      # for api

Tokens can be generated at: https://sonarcloud.io/account/security
```

Get the current branch:

```bash
git branch --show-current
```

---

## PHASE 0c — Detect execution environment

Run the following to determine whether the project is running in Docker standalone mode or dev-lab local mode:

```bash
docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^dev_container$" && echo "docker" || echo "local"
```

Set `ENV_MODE` based on the result and use it in all subsequent phases:

| Mode | Condition | How to run PHP commands | How to run Node commands |
|---|---|---|---|
| `docker` | `dev_container` container is running | `docker exec dev_container bash -c "cd /app/code/api && <cmd>"` | `docker exec dev_container bash -c "cd /app/code/webapp && <cmd>"` |
| `local` | No `dev_container` (dev-lab with Overmind) | `(cd code/api && <cmd>)` | `(cd code/webapp && <cmd>)` |

In `local` mode, paths are relative to the repository root (`git rev-parse --show-toplevel`). The dev-lab runs PHP and Node directly on the host — shared services (PostgreSQL, Redis) are in Docker but there is no app container.

---

## PHASE 0b — Multi-project overview (only when no argument was given)

When `$ARGUMENTS` is empty, before starting any fixes, query both projects and print a combined overview:

```bash
# For each project key, run:
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/qualitygates/project_status?projectKey=<KEY>&branch=<BRANCH>"
```

Print:

```
## SonarCloud Overview — both projects @ <branch>

| Project  | Quality Gate | New Issues | Hotspots | Coverage | Duplication |
|----------|-------------|------------|----------|----------|-------------|
| api      | ❌ FAILED   | 3          | 1        | 72%      | 4.2%        |
| webapp   | ✅ PASSED   | 0          | 0        | 85%      | 1.1%        |

→ Projects to fix: api
```

Then process each failing project from top to bottom (api first, webapp second). Skip projects that are already passing. If **all projects pass**, print `✅ All quality gates pass — nothing to fix.` and stop.

---

## PHASE 1 — Fetch quality gate status

Call the SonarCloud API using the token as HTTP Basic auth user (no password):

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/qualitygates/project_status?projectKey=<PROJECT_KEY>&branch=<BRANCH>"
```

Parse `projectStatus.status`: `OK` means passed, `ERROR` or `WARN` means failed.

Also fetch key metrics:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/measures/component?component=<PROJECT_KEY>&branch=<BRANCH>&metricKeys=new_coverage,new_duplicated_lines_density,new_bugs,new_vulnerabilities,new_code_smells,new_security_hotspots,coverage,duplicated_lines_density"
```

Display a status table:

```
## SonarCloud Quality Gate — <project> @ <branch>

Status: ❌ FAILED  (or ✅ PASSED)

| Metric                  | Value   | Threshold | Status |
|-------------------------|---------|-----------|--------|
| New bugs                | N       | 0         | ✅/❌  |
| New vulnerabilities     | N       | 0         | ✅/❌  |
| New code smells         | N       | 0         | ✅/❌  |
| New security hotspots   | N       | 0         | ✅/❌  |
| New code coverage       | N%      | ≥ 80%     | ✅/❌  |
| New code duplication    | N%      | ≤ 3%      | ✅/❌  |
```

**If `status = OK` AND `new_code_smells = 0`**: print `✅ Quality gate PASSED — nothing to fix.` and stop.

**If `status = OK` but `new_code_smells > 0`**: the gate passes but smells remain — proceed to Phase 2 to fix them. The goal is zero smells, not just a passing gate.

**If `status = ERROR` or `WARN`**: proceed to Phase 2.

---

## PHASE 2 — Fetch all failing items

Run these three calls in parallel and collect results:

### 2a. New issues

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/issues/search?componentKeys=<PROJECT_KEY>&branch=<BRANCH>&resolved=false&inNewCodePeriod=true&types=BUG,VULNERABILITY,CODE_SMELL&ps=100&s=FILE_LINE"
```

For each issue, extract:
- `key` — issue ID
- `type` — BUG / VULNERABILITY / CODE_SMELL
- `severity` — BLOCKER / CRITICAL / MAJOR / MINOR / INFO
- `rule` — e.g. `php:S1481`
- `message` — human-readable description
- `component` — file path within the project (strip the `<PROJECT_KEY>:` prefix to get the real path)
- `line` — line number
- `textRange` — start/end lines

### 2b. Security hotspots

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/hotspots/search?projectKey=<PROJECT_KEY>&branch=<BRANCH>&status=TO_REVIEW&ps=100"
```

For each hotspot, extract:
- `key`
- `component` (strip project prefix)
- `line`
- `message`
- `securityCategory`
- `vulnerabilityProbability` — HIGH / MEDIUM / LOW
- `rule.name`

### 2c. Coverage gaps (if new_coverage < 80%)

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/measures/component_tree?component=<PROJECT_KEY>&branch=<BRANCH>&metricKeys=new_line_coverage,new_uncovered_lines&qualifiers=FIL&ps=100&s=metric&asc=true"
```

Focus on files with `new_line_coverage < 80` and `new_uncovered_lines > 0`.

Print a consolidated list:

```
## Items to fix

### 🐛 New Issues (N)
1. [BUG/BLOCKER] src/foo/bar.php:42 — Unused variable `$x` (php:S1481)
2. [CODE_SMELL/MAJOR] src/services/MyService.php:10 — ...

### 🔥 Security Hotspots (N)
1. [HIGH] src/controllers/AuthController.php:88 — Hardcoded credentials (php:S2068)

### 📊 Coverage gaps (N files below 80%)
1. src/services/ReportService.php — 65% coverage (12 uncovered lines)
```

If any of these lists are empty, note it and skip that section.

---

## PHASE 3 — Fix all items

Work through each item below. After all fixes in a section are done, run linters before moving to the next section.

### 3a. Fix new issues (bugs, vulnerabilities, code smells)

For each issue:

1. Determine the file path relative to the repository root:
   - Webapp: `code/webapp/<path>`
   - API: `code/api/<path>`
2. Read the file around the flagged line to understand the context.
3. Look up the SonarCloud rule to understand what is expected:
   ```bash
   curl -s -u "${SONAR_TOKEN}:" \
     "https://sonarcloud.io/api/rules/show?key=<rule>"
   ```
4. Apply the minimal correct fix. Prefer the idiomatic solution described by the rule — do not work around the rule by suppressing it unless it is a false positive with a clear justification.
5. If the issue is a false positive (e.g., the rule does not apply in this context), add the appropriate suppression comment with an explanation:
   - PHP: `// NOSONAR — <reason>`
   - TypeScript: `// NOSONAR — <reason>`
   Never use NOSONAR without a reason comment.

**Do not commit yet** — batch all issue fixes into one commit per phase.

### 3b. Fix security hotspots

For each hotspot:

1. Read the file and line.
2. Assess the real security risk:
   - If the code is genuinely unsafe: implement the fix (e.g., parameterized queries, input sanitization, secure random, etc.).
   - If the code is reviewed and safe (e.g., a hardcoded non-secret constant, intentional behavior): add a `// NOSONAR — <reason>` comment explaining why this is safe.
3. After the PR is merged, hotspots that are safe can also be marked as "Acknowledged" in SonarCloud UI, but that requires the user to do it manually.

### 3c. Improve test coverage (if new_coverage < 80%)

For each file below 80% new coverage:

1. Read the file to understand what is untested.
2. Check the existing tests in the corresponding test directory:
   - API: `code/api/tests/`
   - Webapp: `code/webapp/src/`
3. Write targeted tests for the uncovered lines. Focus on:
   - Edge cases not yet covered
   - Error branches (exception handling, empty results)
   - Validation paths
4. After writing tests, run them to confirm they pass using the detected `ENV_MODE`:

   **If `ENV_MODE = docker`:**
   ```bash
   # API
   docker exec dev_container bash -c "cd /app/code/api && php artisan test --filter=<TestClass>"
   # Webapp
   docker exec dev_container bash -c "cd /app/code/webapp && npx vitest run src/services/__tests__/<file>"
   ```

   **If `ENV_MODE = local` (dev-lab):**
   ```bash
   # API — PHP runs on host, DB is shared Docker PostgreSQL on 127.0.0.1:5432
   (cd code/api && php artisan test --filter=<TestClass>)
   # Webapp — Node runs on host
   (cd code/webapp && npx vitest run src/services/__tests__/<file>)
   ```

---

## PHASE 4 — Lint, commit, and push

### 4a. Run linters

After all fixes, run the appropriate linters and fix any errors they introduce.

Use `ENV_MODE` detected in Phase 0c:

**If `ENV_MODE = docker`:**
```bash
# API
docker exec dev_container bash -c "cd /app/code/api && ./vendor/bin/pint"

# Webapp
docker exec dev_container bash -c "cd /app/code/webapp && npm run lint && npm run typecheck"
```

**If `ENV_MODE = local` (dev-lab — PHP and Node run on the host):**
```bash
# API
(cd code/api && ./vendor/bin/pint)

# Webapp
(cd code/webapp && npm run lint && npm run typecheck)
```

Stage any auto-fixed files from Pint.

### 4b. Commit

Create a single commit following the project commit convention.

Get the issue number from the current branch name:
```bash
git branch --show-current | grep -oE '[0-9]{3}'
```

Commit format (mandatory — from CLAUDE.md):

```
🐛 [#NNN] - Fix SonarCloud quality gate issues in <webapp|api> 🔍

- 🐛 Fix <N> new issues (bugs/vulnerabilities/code smells)
- 🔥 Address <N> security hotspots
- ✅ Add tests to improve coverage in <files>
- 🎨 Apply Pint/ESLint auto-fixes
```

Omit any bullet whose count is 0.

### 4c. Push

```bash
git push origin HEAD
```

---

## PHASE 5 — Wait for CI and SonarCloud scan

After the push, the GitHub Actions workflow must run before SonarCloud is updated.

### 5a. Find the triggered run

Wait up to 30 seconds for the run to appear, then get its ID:

```bash
sleep 20
gh run list \
  --branch "$(git branch --show-current)" \
  --workflow "<CI_WORKFLOW_NAME>" \
  --limit 1 \
  --json databaseId,status,conclusion,createdAt
```

### 5b. Stream the run until it completes

```bash
gh run watch <run-id> --exit-status
```

If the run **fails** (non-zero exit):

1. Print:
   ```
   ❌ CI run <run-id> failed. SonarCloud scan may not have updated.
   Check: https://github.com/pakodiazdev/sushigo/actions/runs/<run-id>
   ```
2. Do NOT loop back — stop and report to the user. A failing CI means the fixes introduced a regression, which must be investigated separately.

If the run **succeeds**, continue to Phase 6.

---

## PHASE 6 — Re-check quality gate

Wait 30 seconds for SonarCloud to ingest the new scan results, then repeat Phase 1.

```bash
sleep 30
```

Call the quality gate API again (same call as Phase 1).

**Decision:**

- **Status = OK AND new_code_smells = 0**: print final success report and stop.
- **Status = OK but new_code_smells > 0**: go back to Phase 2 to fix remaining smells.
- **Status = ERROR/WARN**: go back to Phase 2 with the updated issue list.

**Loop limit:** Maximum **3 iterations** (Phase 2 → Phase 6). If the quality gate still fails after 3 iterations, stop and report:

```
⚠️ Quality gate still failing after 3 fix iterations.
Remaining issues may require architectural decisions or manual review.
See: https://sonarcloud.io/project/overview?id=<PROJECT_KEY>

Remaining items:
<list from latest Phase 2 output>
```

---

## PHASE 7 — Final report

Print a summary of all work done across all iterations:

```
## SonarCloud Review Complete ✅

Project: <webapp|api>
Branch:  <branch>
Iterations: N

### Fixed
- Bugs/vulnerabilities/code smells: N
- Security hotspots addressed: N
- Test coverage files improved: N

### Quality gate
| Metric                | Before | After  |
|-----------------------|--------|--------|
| New bugs              | N      | 0      |
| New vulnerabilities   | N      | 0      |
| New code smells       | N      | 0      |
| Security hotspots     | N      | 0      |
| New code coverage     | N%     | N%     |
| New duplication       | N%     | N%     |

Status: ✅ PASSED
```

If the gate is still failing after 3 iterations, replace the final line with `Status: ❌ STILL FAILING — manual review required` and list remaining items.
