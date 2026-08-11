# PR Review Rules

This document contains mandatory rules and a minimal checklist to follow when reviewing Pull Requests in this repository.

Goal: keep consistency, readability, and avoid regressions or bad practices in the codebase.

Mandatory rules
----------------

1. Avoid using fully-qualified class names (FQCN) inline.
   - Always import the class at the top of the file (`use ...` in PHP, `import ...` in TS/JS) and use the short class name or an alias inside the code body.
   - Example (PHP, BAD): `new \\App\\Models\\Employee()` → (GOOD) import `use App\\Models\\Employee;` and then `new Employee()`.
   - Rationale: improves readability, makes refactorings safer and reduces typos. It also allows tooling (autocomplete, linters) to work properly.

2. Follow the repository conventions.
   - Adhere to existing style guides (PHP CS/TS rules, ESLint, etc.).
   - Do not introduce large formatting-only changes in functional PRs.

3. Typing and validation.
   - In TypeScript: prefer precise types over `any` or `string[]` when a union or more specific type exists.
   - In PHP/Laravel: validate inputs with explicit rules and avoid `Rule::exists` when the filter is intended for a closed set — validate against model constants or config when appropriate.

4. Ensure frontend/backend consistency.
   - If you change an API response shape, update the type definitions under `code/webapp/src/types` and run the typecheck (`tsc --noEmit`).

5. Tests and typechecks.
   - If the PR modifies critical logic or models, add/update relevant tests (unit/feature). Run linters and typechecks before requesting final review.
   - Locally, run only linters and the tests delivered in the branch (new/modified test files), scoped with `--filter=<TestClass>` (PHPUnit) or `npx vitest run <path>` (Vitest) — not the full suite. Full-suite regression checking is CI's responsibility, not a local pre-PR step (see `doc/conventions/testing/testing-strategy.md` → "Local vs CI").

6. Testing strategy compliance (see `doc/conventions/testing/testing-strategy.md`).
   - Every new/changed API endpoint MUST have PHPUnit Feature tests (happy path + unauthorized access).
   - Complex business logic MUST have PHPUnit Unit tests.
   - Route guards and redirect config MUST be validated with Vitest.
   - Every user-facing feature MUST include at least one Cypress spec covering its happy path.
   - Error cases, validation, and security MUST NOT be tested in Cypress — use PHPUnit or Vitest.
   - If CI detects a regression, it MUST be fixed for real (no skip/xfail) and its test added to that PR's local run list from then on, so the fix stays verified locally for the rest of the session.

7. Coverage gate (enforced by SonarCloud).
   - New code MUST have >= 80% line coverage on both backend (`code/api/`) and frontend (`code/webapp/`).
   - SonarCloud is a required check — PRs that fail the coverage gate cannot be merged.


Reviewer checklist (minimum)
---------------------------

- [ ] Is the change focused and scoped? Avoid PRs mixing unrelated responsibilities.
- [ ] Are classes/types imported at the top and are FQCNs avoided inline? (see rule #1)
- [ ] Are names and aliases consistent and readable?
- [ ] Are API changes reflected in frontend types/clients (if applicable)?
- [ ] Does TypeScript pass without errors? (`npm --prefix code/webapp run typecheck`)
- [ ] Are there no unnecessary formatting-only changes? (if present, move them to a separate PR)
- [ ] Is minimal documentation updated if applicable (README, comments, OpenAPI docs)?
- [ ] Does the PR include PHPUnit Feature tests for new/changed endpoints (happy path + auth)?
- [ ] Does the PR include at least one Cypress spec for the happy path of the delivered feature?
- [ ] Do linters and the delivered tests pass locally? Are CI-detected regressions fixed for real (no skip/xfail) and added to the local run list?
- [ ] Does SonarCloud report >= 80% line coverage on new code (backend and frontend)?


Notes and best practices
------------------------

- If you need to use an alias due to name conflicts, use a clear alias: `use App\\Models\\Employee as EmployeeModel;` and briefly document the reason.
- For validations that use a closed set of values (e.g., position roles), prefer model constants or values in `config/` instead of a generic database existence check on the `roles` table.
- When reviewing a change that introduces new dependencies or build scripts, ask the author for a short verification guide in the PR description.

If you propose an exception to these rules, discuss it in the PR thread before approving.
