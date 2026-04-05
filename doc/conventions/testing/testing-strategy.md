# Testing Strategy

This document defines the mandatory testing strategy for the SushiGo project. Every contributor and reviewer must follow these rules.

## Guiding Principles

1. **Cypress is expensive** — reserve it exclusively for critical happy-path flows.
2. **Push complexity down** — the harder something is to test at a high level, the lower in the pyramid it should live.
3. **Security is non-negotiable** — enforce it in backend Feature tests (Laravel PHPUnit), never rely on the frontend alone.
4. **Coverage is a merge gate** — SonarCloud enforces minimums before a PR can be merged.

---

## Testing Pyramid

```
         ┌──────────┐
         │ Cypress   │  E2E – happy path only
         │ (few)     │
        ─┼───────────┼─
        │  Vitest     │  Frontend integration + unit
        │  (moderate) │
       ─┼─────────────┼─
       │   PHPUnit     │  Backend Feature + Unit
       │   (many)      │
       └───────────────┘
```

### Layer 1 — PHPUnit (Backend)

| Scope | Test type | What to validate |
|---|---|---|
| **Feature (Integration)** | `tests/Feature/` | API endpoints, request/response contracts, authorization (roles & permissions), validation rules, business flows end-to-end through the HTTP layer |
| **Unit** | `tests/Unit/` | Actions, Services, Repositories, Model scopes, accessors/mutators, complex calculations, edge cases that are hard to reach via Feature tests. Use mocks/stubs when needed |

**Rules:**

- Every API endpoint MUST have at least one Feature test covering the happy path AND one test for unauthorized access (wrong role / no token).
- Validation rules (required fields, formats, uniqueness) MUST be tested in Feature tests.
- Complex business logic (e.g., lateness calculation, stock movement math) MUST have Unit tests with mocks where external dependencies exist.
- Cases that are difficult to reproduce at the Feature level (race conditions, specific date boundaries, exception handling) belong in Unit tests.

### Layer 2 — Vitest (Frontend)

| Scope | Priority | What to validate |
|---|---|---|
| **Route guards & config** | Required | Auth guards redirect unauthenticated users; role-based route protection works; public routes are accessible |
| **Error feedback to user** | Nice-to-have | Toast/alert messages on API errors; form validation messages display correctly; loading/error states render |
| **Component logic (hooks)** | Required when complex | Custom hooks with 3+ state variables or API mutations; derived state calculations; conditional logic |

**Rules:**

- Route security (guards, redirects, role checks) MUST be validated with Vitest — never rely solely on Cypress for this.
- Error feedback tests (toasts, inline validation, error boundaries) are a nice-to-have but encouraged for every form.
- Pure UI rendering tests (snapshot, visual) are optional and low priority.

### Layer 3 — Cypress (E2E)

| Scope | What to validate |
|---|---|
| **Happy path only** | The critical user journey for the delivered feature works end-to-end |

**Rules:**

- Each PR that delivers a user-facing feature MUST include at least one Cypress spec covering its happy path.
- **Do NOT test error cases, validation, or edge cases in Cypress** — those belong in PHPUnit (backend) or Vitest (frontend).
- **Do NOT test authorization/security in Cypress** — that belongs in PHPUnit Feature tests.
- Keep Cypress specs fast: one `db:reset` per spec file (in `before()`), not per test.
- Avoid `cy.wait(ms)` unless absolutely necessary for DOM stability (document the reason with an inline comment).

---

## Coverage Requirements

### Merge Gate (enforced by SonarCloud)

| Metric | Minimum | Scope |
|---|---|---|
| **Line coverage — Backend** | 80% | New code in the PR (`code/api/`) |
| **Line coverage — Frontend** | 80% | New code in the PR (`code/webapp/`) |

- SonarCloud runs automatically on every PR via GitHub Actions.
- A PR **cannot be merged** if coverage on new lines falls below the threshold.
- Legacy code is exempt from the gate, but contributors are encouraged to improve coverage when touching existing files.

### How to check locally

```bash
# Backend coverage
docker exec -it dev_container bash -c "cd /app/code/api && php artisan test --coverage"

# Frontend coverage
docker exec -it dev_container bash -c "cd /app/code/webapp && npx vitest run --coverage"
```

---

## PR Testing Checklist

Every PR that modifies application code MUST satisfy:

- [ ] **Backend Feature tests** — happy path + authorization for every new/changed endpoint
- [ ] **Backend Unit tests** — complex logic, edge cases, hard-to-reach scenarios
- [ ] **Frontend Vitest tests** — route guards/config; error feedback (nice-to-have)
- [ ] **Cypress happy path** — at least one E2E spec for the delivered feature
- [ ] **No regressions** — all existing tests pass (`make cypress-run`, `php artisan test`, `npx vitest run`)
- [ ] **Coverage gate** — SonarCloud reports >= 80% line coverage on new code (backend and frontend)
- [ ] **Test fixes** — if changes break existing tests, the PR includes the necessary test updates with a comment explaining why

---

## Summary Table

| What to test | Where | Priority |
|---|---|---|
| API happy path (request → response) | PHPUnit Feature | Required |
| Authorization (roles, permissions, token) | PHPUnit Feature | Required |
| Input validation (required, format, unique) | PHPUnit Feature | Required |
| Complex business logic / calculations | PHPUnit Unit | Required |
| Edge cases hard to reach via HTTP | PHPUnit Unit (with mocks) | Required |
| Route guards & redirect config | Vitest | Required |
| Error feedback (toasts, form errors) | Vitest | Nice-to-have |
| Custom hook logic | Vitest | Required when complex |
| User-facing happy path (full flow) | Cypress | Required (1 per feature) |
| Error/validation scenarios in UI | Cypress | **Prohibited** — use Vitest/PHPUnit |
| Security/auth scenarios in UI | Cypress | **Prohibited** — use PHPUnit Feature |
