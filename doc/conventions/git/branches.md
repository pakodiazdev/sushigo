# Branch Naming Convention

This guide establishes the naming convention for Git branches, ensuring consistency and traceability across the project.

---

## Branch Format

Each branch follows this general format:

```
<type>/<issue>-<short-description>
```

### Components

- **Type**: A prefix that categorizes the purpose of the branch.
- **Issue Number**: The task/issue number from the tracker (zero-padded to 3 digits).
- **Short Description**: A brief, kebab-case description of the work (2-5 words).

---

## Branch Types

| Prefix      | Purpose                                  | Example                            |
| ----------- | ---------------------------------------- | ---------------------------------- |
| `feature/`  | New features or functionality            | `feature/016-employee-crud-api`    |
| `fix/`      | Bug fixes                                | `fix/042-login-redirect-loop`      |
| `hotfix/`   | Urgent production fixes                  | `hotfix/051-payment-timeout`       |
| `refactor/` | Code refactoring without behavior change | `refactor/033-auth-module-cleanup` |
| `docs/`     | Documentation only                       | `docs/028-api-swagger-annotations` |
| `test/`     | Adding or updating tests                 | `test/019-employee-e2e-tests`      |
| `chore/`    | Maintenance, config, tooling             | `chore/055-upgrade-vite-6`         |

---

## Naming Rules

1. **Always use lowercase** — No uppercase letters.
2. **Use kebab-case** — Words separated by hyphens (`-`).
3. **Include issue number** — Zero-pad to 3 digits (e.g., `016` not `16`).
4. **Keep descriptions short** — 2-5 words maximum.
5. **Use English** — All branch names in English.
6. **No special characters** — Only alphanumeric and hyphens.

---

## Examples

### ✅ Good Branch Names

```
feature/016-employee-crud-api
fix/042-duplicate-code-validation
refactor/033-simplify-auth-flow
docs/028-update-readme
hotfix/051-fix-payment-gateway
test/019-add-employee-e2e
chore/055-upgrade-dependencies
```

### ❌ Bad Branch Names

```
empleados                    # No type, no issue, Spanish
Feature/16-EmployeeCrud      # Uppercase, no padding
feat/16                      # Abbreviated type, no description
fix-login-bug                # Missing issue number
feature/016_employee_crud    # Underscores instead of hyphens
```

---

## Special Branches

| Branch    | Purpose                                |
| --------- | -------------------------------------- |
| `main`    | Production-ready code                  |
| `develop` | Integration branch (if using Git Flow) |
| `staging` | Pre-production environment             |

---

## Workflow

1. Create branch from `main`:

    ```bash
    git checkout main
    git pull origin main
    git checkout -b feature/016-employee-crud-api
    ```

2. Work on your branch, commit following [commits.md](./commits.md).

3. Push and open the PR **as a draft** (`gh pr create --draft`) — merge-blocking is native draft
   status (#598), and a draft with no title modifier runs the fast `[ci-check]` CI scope. Mark it
   ready (`gh pr ready`, or let `/finish-pr` do it) for the full regression. Optional CI-cost
   modifiers (`[skip-ci]` / `[ci-check-all]`) are the **PR title's** concern, not the branch's: see
   [`pull-requests.md`](./pull-requests.md) → "PR Title CI-Cost Modifiers". The branch name never
   changes for any of this.

    ```bash
    git push -u origin feature/016-employee-crud-api
    ```

4. After merge, delete the branch:
    ```bash
    git branch -d feature/016-employee-crud-api
    git push origin --delete feature/016-employee-crud-api
    ```

---

## Mapping to Commit Emojis

The branch type should correspond to the primary commit type:

| Branch Type | Commit Emoji |
| ----------- | ------------ |
| `feature/`  | ✨           |
| `fix/`      | 🐛           |
| `hotfix/`   | 🐛           |
| `refactor/` | 🔨           |
| `docs/`     | 📚           |
| `test/`     | ✅           |
| `chore/`    | 🔧           |

