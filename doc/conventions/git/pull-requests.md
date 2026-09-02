# Pull Request Convention

This guide establishes the format for PR titles and descriptions, ensuring clarity, traceability, and consistency across the project.

---

## PR Title Format

```
:emoji [#NNN][x] - Short description :emoji
:emoji [#NNN][x][wip] - Short description :emoji        ← non-mergeable WIP CI run
:emoji [#NNN][x][e2e-test] - Short description :emoji    ← Cypress-only diagnostic CI run
```

### Components

- **Emoji**: The opening emoji matches the primary commit type (see [commits.md](./commits.md)).
  The title also needs a closing ornamental emoji at the end — per CLAUDE.md it does not have to
  match the opening one (e.g. `🔨 ... 🗂️`, `✨ ... ✅` are both valid), though reusing the same
  emoji at both ends is also fine.
- **Issue Number**: Enclosed in brackets, preceded by `#`, zero-padded to 3 digits (`#016`, not `#16`).
- **Workspace letter** (mandatory): its own bracket `[x]` immediately after the issue bracket, no
  space between them — lowercase, matching the `workspaces/sushigo-<x>` directory this PR was
  developed in (e.g. `a`, `b`, `c`). Dev-lab runs up to 8 parallel workspace clones; without the
  letter, reviewers scanning a PR list can't tell which workspace a PR came from without opening
  it. Omit this bracket only for PRs opened from standalone Docker mode (no workspace clone).
- **Execution-mode bracket** (optional): a third bracket, immediately after `[x]`, that selects the
  PR's CI execution mode — see [PR Title Execution-Mode Flags](#pr-title-execution-mode-flags)
  below.
- **Description**: Imperative mood, concise summary of the change.

### PR Title Execution-Mode Flags

The execution mode of the unified CI pipeline (`.github/workflows/ci.yml`,
[TD-06](../../decisions/td-06-unified-ci-dag.md)) is read from an **optional third bracket in the PR
title**, immediately after the workspace letter `[x]` (lowercase, case-insensitive, whitespace
inside the bracket tolerated). **It is read from the title only — never from the branch name;** the
branch keeps its `<type>/<NNN>-<desc>` name (see [`branches.md`](./branches.md)) unchanged.

**What each flag triggers:**

| Title | Mode | `api-ci` / `webapp-ci` | `e2e-ci` (Cypress) | `scripts-tests` | `ci-gate` (quality) | `merge-gate` | Mergeable? |
|---|---|---|---|---|---|---|---|
| `… [#NNN][x][e2e-test] - …` | **e2e-test** — Cypress-only diagnostic loop | **skipped** (no lint / PHPUnit / Vitest / coverage / Sonar) | runs **only the `.cy.ts` specs this PR added/modified**, on one dynamic shard. Zero changed specs → `e2e-test-empty-guard` **fails** the run | **skipped** even if `.github/scripts/**` changed | **green** iff the specs that ran passed | **`neutral`** (grey) | ❌ never |
| `… [#NNN][x][wip] - …` | **wip** — implementation / review / correction | run when their surface, or pipeline infra, changed (`lint → tests → coverage → sonar`) | **targeted**: PR-changed specs + specs mapped from impacted areas in `.github/e2e-impact-map.json`; **full** suite if any changed code file is unmapped or pipeline infra changed | runs iff `.github/scripts/**` changed | **green** iff every applicable branch passed — a red `ci-gate` is always a real failure | **`neutral`** (grey) — blocks merge without a red X | ❌ never |
| `… [#NNN][x] - …` (no third bracket) | **final** — merge candidate | same as `[wip]` | **full** suite whenever anything E2E-relevant changed | runs iff `.github/scripts/**` changed | **green** iff every applicable branch passed; a documentation / non-pipeline-config-only PR short-circuits to a fast green | **green** iff `ci-gate` passed | ✅ **the only mode a PR can merge from** |

Both `ci-gate` and `merge-gate` are required status checks. `ci-gate` answers "did everything that
ran pass?" and is evaluated identically in every mode. `merge-gate` answers "may this PR merge
now?" — it is a check run posted via the Checks API so it can carry a `neutral` conclusion: it is
posted `success` only in final mode (iff `ci-gate` passed), and **`neutral`** in `[wip]` /
`[e2e-test]` — a grey dot, not a red X, that still keeps the merge button disabled because
`neutral` is not `success`, until the bracket is removed.

Rules:

1. **Open the PR with `[wip]` from the start** (or `[e2e-test]` while iterating specifically on
   Cypress specs). The issue slash commands do this automatically; none of them ever remove it.
   Promotion to final is a separate step — see [The `[wip]` → final lifecycle](#the-wip--final-lifecycle) below.
2. **Only `/finish-pr` (or you, by hand) drops the bracket** — and only once review has left the PR
   ready. It is never part of opening or updating the PR.
3. `push` to `main` always runs in **final** mode.
4. If both `[e2e-test]` and `[wip]` appear, `[e2e-test]` wins (the narrowest mode).
5. `[review]` is **not** a mode — review/correction has the same CI semantics as `[wip]`.

Full flow: [`doc/conventions/ci/pipeline.md`](../ci/pipeline.md).

### The `[wip]` → final lifecycle

Two **required** status checks split one question in two, so "held for `[wip]`" never looks like
"a check failed":

| Check | Question | `[wip]` / `[e2e-test]` | final |
|---|---|---|---|
| **`ci-gate`** | Did everything that ran pass? | **green** when the applicable branch jobs passed (evaluated the same as final). A red `ci-gate` is **always a real lint/test/e2e failure** | same |
| **`merge-gate`** | May this PR merge now? | **`neutral`** — a grey dot, not a red X. Blocks merge (`neutral` ≠ `success`) with the title *"Held — remove the [wip] title bracket to enable merge"* | **green** iff `ci-gate` passed |

`merge-gate` is a check run posted through the Checks API by the `merge-gate-report` job — a job's
exit code cannot produce a `neutral` conclusion, and a job-level `if:`-skip would let the merge
through (GitHub treats a skipped required check as passing).

**The lifecycle:**

1. **Open `[wip]`.** The `/start-issue`, `/issue`, `/issue-full`, `/issue-no-review`,
   `/issue-devin-interactive` commands put `[wip]` in the `gh pr create` title automatically. Open
   it by hand the same way if you are not using them. None of these commands ever remove it.
2. **Work under `[wip]`.** Every push runs the quality branches + a *targeted* Cypress selection.
   `ci-gate` tells you whether the code is sound; `merge-gate` sits `neutral` so the PR cannot be
   merged by accident. Review (human or automated) happens here.
3. **Promote.** `/finish-pr` drops the `[wip]` bracket (its Phase 7.5a); the `pull_request: edited`
   trigger re-runs CI in final mode (full Cypress, `merge-gate` now posts `success` iff `ci-gate`
   passed). You may also drop the bracket by hand earlier — nothing else about the title changes:
   ```bash
   gh pr edit <N> --title "✨ [#016][a] - Employee CRUD API ✨"
   ```
4. **Verify.** `/finish-pr` then waits for that final-mode run and reports merge-readiness
   "app-doctor" style — `ci-gate` + `merge-gate` green, the Codex review (`chatgpt-codex-connector`)
   clean on the merge-ready commit, the SonarCloud quality gate passed, threads resolved. It
   **fixes nothing** and **never merges**: if a requirement is unmet it says exactly what and
   stops. A human runs `gh pr merge` after their own check.

`/finish-pr` refuses to declare a still-`[wip]` PR ready without promoting it first.

### Title Examples

```
✨ [#016][a] - Employee CRUD API + Frontend Module ✨
🐛 [#042][b] - Fix duplicate code validation on employee create 🐛
🔨 [#033][c] - Refactor auth module to use Zustand 🔨
📚 [#028][a] - Add Swagger annotations to all endpoints 📚
```

---

## PR Description Template

Use the following structure for all PR descriptions:

```markdown
## Summary

Closes #NNN
Devin Review: https://deepwiki.com/pakodiazdev/sushigo/pull/<PR-number>

Brief description of what this PR accomplishes (1-3 sentences).

### Story (optional)

> As a [role], I want [action], so that [benefit].

---

## 🚀 Commits

1. **abc1234** ✨ Commit message 1
2. **def5678** 🔨 Commit message 2
3. **ghi9012** ✅ Commit message 3

---

## ✅ What's Included

### Backend

- Bullet points describing API changes
- New endpoints, models, migrations

### Frontend

- UI components added/modified
- New pages, hooks, services

---

## ⚠️ Breaking Changes (if any)

- Description of breaking changes
- Migration steps if required

---

## 🧪 Testing

- [ ] Unit tests pass
- [ ] Feature tests pass
- [ ] Manual testing completed
- [ ] E2E tests (if applicable)

---

## Manual Testing

Step-by-step instructions to exercise the change manually: exact command to run, page/route to
visit, inputs to use, expected result. For a bug fix: steps to reproduce the original bug, plus
steps confirming it no longer happens. Never include passwords or other credentials — reference
seeded test users by email only.

---

## 🔗 References

- **Task**: #NNN
- **Backlog**: AP-NNN (if applicable)
- **Spec**: RF-XX (if applicable)

---

## 📝 Pending (optional)

Items intentionally left out of scope:

- [ ] Future work item 1
- [ ] Future work item 2

---

## Workspace

`<workspace-name>` — `<branch-name>`
```

---

## Section Guidelines

### Summary

- **Required**
- Start with `Closes #NNN`, then `Devin Review: <deepwiki PR URL>` on the next line — the
  `Devin Review` link isn't known until the PR is created, so add it via a follow-up
  `gh pr edit <N> --body-file ...` right after `gh pr create` returns the PR **URL** (not a bare
  number — extract `<N>` from it first, e.g. `basename <url>`)
- 1-3 sentences describing the purpose
- Include the user story if the PR implements a backlog item

### 🚀 Commits

- **Required** for multi-commit PRs
- List commits in chronological order
- Include short hash and full commit message

### ✅ What's Included

- **Required**
- Organize by layer (Backend/Frontend)
- Use bullet points for clarity
- Be specific: mention endpoints, components, files

### ⚠️ Breaking Changes

- **Required if applicable**
- Clearly state what breaks
- Provide migration steps

### 🧪 Testing

- **Required**
- Use checkboxes to confirm testing status
- Mention specific test coverage

### Manual Testing

- **Required** — separate from the automated `🧪 Testing` checklist above
- Be concrete: exact commands, URLs, or UI steps — not "test the feature works"
- Never include passwords or other credentials in the PR body, even for seeded test users —
  reference them by email only and let the reviewer look up the password in its documented location

### 🔗 References

- **Required**
- Link to task, backlog story, spec requirements

### 📝 Pending

- **Optional**
- Document intentional omissions
- Link to follow-up issues if created

### Workspace

- **Required** for every PR opened from a dev-lab workspace clone — not applicable to standalone
  Docker mode
- Workspace name is the directory under `workspaces/` (e.g. `sushigo-a`); branch name is the full
  branch name at the time the PR was opened
- Place it as the last section, just before the `🤖 Generated with` attribution line

---

## Complete Example

```markdown
## Summary

Closes #016
Devin Review: https://deepwiki.com/pakodiazdev/sushigo/pull/294

Complete implementation of Employee management module including full CRUD API endpoints, frontend list/form components, and enhanced DataGrid features.

### Story

> As an Admin, I want to create, list, view, update, and deactivate employees via API, to manage the workforce.

---

## 🚀 Commits

1. **e30d6b0** ✨ Employee CRUD API, frontend, and ULID public identifiers
2. **171112a** 🔨 Migrate employee roles from enum to Spatie multi-role system
3. **c0b906e** ✨ Add multi-column sorting and enhanced pagination

---

## ✅ What's Included

### Backend

- `POST /api/v1/employees` — Create employee with welcome notification
- `GET /api/v1/employees` — List with filters, pagination, sorting
- `GET /api/v1/employees/{id}` — Show employee details
- `PUT /api/v1/employees/{id}` — Update employee
- `PATCH /api/v1/employees/{id}/toggle-active` — Toggle status
- 36 feature tests covering CRUD, validations, permissions

### Frontend

- Employee list page with pagination and filters
- Create/Edit employee slide panel
- `useEmployees`, `useCreateEmployee`, `useUpdateEmployee` hooks
- Enhanced DataGrid with multi-column sorting

---

## ⚠️ Breaking Changes

- **API**: `role` field replaced by `roles[]` array
- **Migration**: Existing data migrated automatically

---

## 🧪 Testing

- [x] Unit tests pass
- [x] Feature tests pass (36 tests)
- [x] Manual testing completed
- [ ] E2E tests (deferred to follow-up)

---

## Manual Testing

1. `POST /api/v1/employees` with a valid payload (see Swagger UI) — confirm `201` and a welcome
   email in Mailpit (`http://localhost:8025`)
2. Visit `/employees` in the webapp — confirm the new employee appears in the list, sorted and
   paginated correctly
3. Toggle the employee inactive via the row action — confirm `PATCH /toggle-active` returns `200`
   and the row updates without a page reload

---

## 🔗 References

- **Task**: #016
- **Backlog**: AP-002
- **Spec**: RF-01, RF-02

---

## 📝 Pending

- [ ] Employee Detail Page with tabs
- [ ] E2E Cypress tests

---

## Workspace

`sushigo-a` — `feature/016-employee-crud`
```

---

## Navigability Rule (mandatory)

**Every PR must include a reachable path to the new feature from the existing UI.**

A feature that cannot be reached by clicking through the app cannot be reviewed in the PR. Before starting an issue:

1. **Identify the entry point** — which existing page will link to the new one?
2. **If the entry point doesn't exist yet**, either:
   - Include it in the same issue (if it's small), or
   - Do the prerequisite issue first, then come back.
3. **Never merge a feature that is only reachable by typing a URL directly.**

### Dependent Branch Pattern

When issue B provides the entry point for issue A (e.g. B is an employee detail page with a "New Schedule" button that opens A's form), use a stacked branch strategy:

```
main
 └── feature/A-short-desc         ← PR #X (base: main)
       └── feature/B-short-desc   ← PR #Y (base: feature/A-short-desc)
```

**Merge order:**
1. Review and merge PR #X (feature A) into `main` first.
2. Rebase PR #Y onto `main`, then merge.

Or alternatively, keep them stacked and merge B → A before opening A's PR to main. The reviewer sees both features working end-to-end in a single review pass.

**Example — Schedule flow:**
- `feature/053-create-weekly-schedule` — the form (no entry point yet)
- `feature/056-view-current-schedule` — employee detail page with "Crear horario" CTA
- Branch `056` off `053` → PR #056 targets `feature/053`, making the full flow visible before anything merges to main.

### Checklist item for every frontend PR

Add this to the Testing section of the PR description:

- [ ] Feature is reachable by clicking from an existing page (no direct URL required)

---

## Frontend Review Checklist

When reviewing PRs that include frontend changes, verify the following rules in addition to the standard checklist:

### 📋 Forms — react-hook-form + zod (mandatory)

Every form must use `react-hook-form` + `@hookform/resolvers/zod` + `zod`. **Reject any PR that uses raw `useState` for field management or manual validation state.**

✅ Required:
- [ ] Schema defined with `zod` (at the top of the file or in a `*.schema.ts`)
- [ ] Type derived via `z.infer<typeof schema>` — never hand-written
- [ ] `useForm` configured with `zodResolver(schema)`
- [ ] No `useState` for form field values or validation errors
- [ ] Inline error messages shown below each field (`{errors.field && <p>{errors.field.message}</p>}`)
- [ ] `onSubmit` callback receives already-validated `FormValues`
- [ ] Forms with 3+ fields extracted as standalone components

❌ Reject if:
- Form fields managed with `useState` instead of `register`
- Validation logic written manually instead of using zod schema
- Error state managed with `useState<Record<string, string>>`
- Form values not typed via `z.infer`

### 🛡️ Contact fields on update (`email` / `phone`)

When a form updates employee contact fields, verify the frontend **only sends a field if its value changed** from the original — never sends both as empty strings simultaneously. This preserves the backend `required_without` cross-validation.

### 🔐 Role filtering on update

When submitting an employee update, verify the `roles` payload is **filtered to assignable roles only** (`assignableRolesQuery.data`). Non-super-admins must not send `super-admin` in the roles array even if the employee holds it.

### 🪝 Custom hooks — logic / view separation (mandatory)

Every component with **3+ `useState` calls or API mutations** must extract its logic into a `use<ComponentName>` hook. The component file must contain only JSX.

**Hook file convention:** `use-<component-name>.ts` (kebab-case, no JSX, same directory as the component).

✅ Required:
- [ ] Hook owns all `useState`, queries (`useQuery`), mutations (`useMutation`), and derived booleans
- [ ] Component only contains JSX — no business logic, no inline handlers with async operations
- [ ] Auth store values (branch, isAdmin, etc.) resolved inside the hook, not threaded through props
- [ ] Hook file exports types consumed by the component (`FormValues`, `PanelMode`, etc.)
- [ ] Component re-exports types it receives from the hook if downstream consumers need them

❌ Reject if:
- Component has 3+ `useState` calls and no corresponding hook
- API mutations (`mutateAsync`) are called directly inside a component function
- Auth store selectors are threaded through 2+ levels of props instead of being read in the hook
- Logic and JSX are mixed in the same file for non-trivial components

**Reference implementation:** `use-employee-form.ts` + `employee-form.tsx`, `use-employee-detail-actions.ts` + `employee-detail-view.tsx`, `use-deactivate-form.ts` + `deactivate-form.tsx`, `use-rehire-form.ts` + `rehire-form.tsx`.

---

## Quick Reference

| Element          | Format                                               |
| ---------------- | ---------------------------------------------------- |
| Title            | `:emoji [#NNN][x][wip] - Description :emoji` at creation; drop `[wip]` only via `/finish-pr` (or by hand) once ready |
| Merge checks     | `ci-gate` (quality, any mode) **and** `merge-gate` (`neutral` while `[wip]`, `success` in final) — both required |
| Summary opening  | `Closes #NNN` then `Devin Review: <deepwiki URL>`    |
| Commits section  | `**hash** :emoji message`                            |
| Breaking changes | Use ⚠️ section, be explicit                          |
| Testing          | Checkboxes for each test type                        |
| Manual Testing   | Concrete steps, no credentials                       |
| References       | Link task, backlog (AP-), spec (RF-)                 |
| Workspace        | `` `sushigo-<x>` — `<branch-name>` `` — last section |
