# Pull Request Convention

This guide establishes the format for PR titles and descriptions, ensuring clarity, traceability, and consistency across the project.

---

## PR Title Format

```
:emoji [#issue] - Short description
```

### Components

- **Emoji**: Same as the primary commit type (see [commits.md](./commits.md)).
- **Issue Number**: Enclosed in brackets, preceded by `#`.
- **Description**: Imperative mood, concise summary of the change.

### Title Examples

```
✨ [#016] Employee CRUD API + Frontend Module
🐛 [#042] Fix duplicate code validation on employee create
🔨 [#033] Refactor auth module to use Zustand
📚 [#028] Add Swagger annotations to all endpoints
```

---

## PR Description Template

Use the following structure for all PR descriptions:

```markdown
## 📋 Summary

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

## 🔗 References

- **Task**: #NNN
- **Backlog**: AP-NNN (if applicable)
- **Spec**: RF-XX (if applicable)

---

## 📝 Pending (optional)

Items intentionally left out of scope:

- [ ] Future work item 1
- [ ] Future work item 2
```

---

## Section Guidelines

### 📋 Summary

- **Required**
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

### 🔗 References

- **Required**
- Link to task, backlog story, spec requirements

### 📝 Pending

- **Optional**
- Document intentional omissions
- Link to follow-up issues if created

---

## Complete Example

```markdown
## 📋 Summary

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

## 🔗 References

- **Task**: #016
- **Backlog**: AP-002
- **Spec**: RF-01, RF-02

---

## 📝 Pending

- [ ] Employee Detail Page with tabs
- [ ] E2E Cypress tests
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

| Element          | Format                               |
| ---------------- | ------------------------------------ |
| Title            | `:emoji [#NNN] - Description`        |
| Commits section  | `**hash** :emoji message`            |
| Breaking changes | Use ⚠️ section, be explicit          |
| Testing          | Checkboxes for each test type        |
| References       | Link task, backlog (AP-), spec (RF-) |
