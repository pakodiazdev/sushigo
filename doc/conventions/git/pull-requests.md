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

## Quick Reference

| Element          | Format                               |
| ---------------- | ------------------------------------ |
| Title            | `:emoji [#NNN] - Description`        |
| Commits section  | `**hash** :emoji message`            |
| Breaking changes | Use ⚠️ section, be explicit          |
| Testing          | Checkboxes for each test type        |
| References       | Link task, backlog (AP-), spec (RF-) |
