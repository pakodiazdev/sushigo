# 🔧 [Convention] Run only linters + delivered tests locally; leave full-suite regression check to CI

## Description

Change the local pre-PR convention so contributors run only linters and the tests delivered in
their branch (new/modified test files), instead of the full PHPUnit/Vitest suite.

## Reason

Running the full local suite is slow, and CI already re-runs everything as the regression gate
against its own isolated database on every PR, so running it again locally is duplicate work.
Each dev-lab workspace already runs its own isolated test database (`sushigo_ws_<letter>_test`,
via `code/api/.env.testing`), introduced specifically to prevent the `SQLSTATE[40P01]` deadlocks
a shared test database caused (documented in #268, #84) — keeping local runs scoped avoids
masking a misconfigured `.env.testing` behind an accidental full-suite pass. Full-suite regression
checking belongs to CI, not the local pre-PR workflow.

## Objective

`doc/conventions/git/pr_review_rules.md`, `doc/conventions/testing/testing-strategy.md`, and
`doc/TESTING.md` are updated so the local pre-PR step is "linters + delivered tests", with the
full suite documented as CI's job (optional locally, for CI parity only). A rule is added stating
that any CI-detected regression must be fixed for real (no skip/xfail) and its test added to that
PR's local run list from then on.

---

## 📖 Story

**English:**
As a contributor, I need the local pre-PR workflow to run only linters and the tests delivered
in my branch (new/modified test files), instead of the full PHPUnit/Vitest suite, so that the
code-contribution flow is faster — the full suite is duplicate work since CI already re-runs it
as the regression gate on every PR, against its own isolated database service (each dev-lab
workspace also already runs its own isolated test database, introduced specifically to prevent
the `SQLSTATE[40P01]` deadlocks a shared test database caused, see #268, #084). If CI finds a
broken test, it must be fixed objectively (no skip/xfail) and from then on added to that PR's
local run list, so the fix stays verified locally for the rest of the session.

**Español:**
Como colaborador, necesito que el flujo local previo a un PR ejecute solo linters y los tests
entregados en mi branch (archivos de test nuevos/modificados), en vez de la suite completa de
PHPUnit/Vitest, para que el flujo de abono de código sea más rápido — correr la suite completa es
trabajo duplicado, ya que el CI ya la vuelve a correr como gate de regresión en cada PR, con su
propio servicio de base de datos aislado (cada workspace del dev-lab también corre ya su propia
base de datos de test aislada, introducida específicamente para evitar los deadlocks
`SQLSTATE[40P01]` que causaba una base de datos de test compartida, ver #268, #084). Si el CI
detecta un test roto, debe corregirse de forma objetiva (sin skip/xfail) y agregarse desde ese
momento a la lista de ejecución local de ese PR, para que la corrección quede verificada
localmente el resto de la sesión.

---

## ✅ Technical Tasks

- [x] 📚 Update `doc/conventions/git/pr_review_rules.md`: reword rule #5/#6 and the reviewer
      checklist — replace "Do all existing tests pass?" with "Do linters and the delivered
      tests pass locally?", and clarify that full-suite regression checking is CI's
      responsibility, not a local pre-PR step.
- [x] 📚 Update `doc/conventions/testing/testing-strategy.md` with an explicit "Local vs CI"
      section: locally run linters + scoped tests (`--filter=<TestClass>`,
      `vitest run <path>`) for what you touched; CI runs the full suite as the regression gate.
- [x] 📚 Update `doc/TESTING.md` quick-reference: lead with scoped commands, keep the full
      `php artisan test` / `npx vitest run` as an optional/CI-parity command, not the default.
- [x] 🔧 Add the objective-fix rule: a CI-detected regression must be fixed for real (no
      skip/xfail) and its test added to that PR's local run list going forward.

## References
- Deadlock precedent: pakodiazdev/sushigo#268, pakodiazdev/sushigo#84
- Already-scoped local commands: `.claude/commands/start-issue.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `1m`

### 📅 Sessions
```json
[
  { "date": "2026-08-11", "start": "01:16", "end": "01:17" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 1m (1m)
- **vs optimistic:** −59m
- **vs pessimistic:** −2h 59m

**Justification:**
The Sessions log only covers the initial `/start-issue` session (01:16–01:17), which is accurate
for the first implementation pass — this was a docs-only change with no code, tests, or linters
to run, so drafting the three convention updates genuinely took about a minute. The bulk of the
real effort happened afterward through `/pr-comments`: Copilot's automated review flagged six
issues on the PR (an incorrect "workspaces share `mydb_test`" claim that contradicted
`code/api/phpunit.xml`/`.env.testing`'s documented per-workspace isolation, Docker-mode commands
missing `cd`/`DB_DATABASE` overrides, and inconsistent `vitest run` vs `npx vitest run` usage
across three files). All six were verified against the actual config files, fixed in a follow-up
commit, replied to individually, and resolved. That review-response cycle isn't reflected in the
Sessions array because `/pr-comments` doesn't open a tracked session — only `/start-issue` does
under this convention — so the 1-minute `Tracked` figure understates real elapsed effort but is
correct per the documented Sessions log.





