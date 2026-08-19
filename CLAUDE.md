# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SushiGo is a full-stack tenant platform within the ComandaFlow ecosystem. **This is a monorepo** with the following structure:
- **Laravel 12 API** (`code/api/`) - Backend with Passport OAuth, Spatie Permissions, L5 Swagger
- **React 19 Webapp** (`code/webapp/`) - Admin dashboard with TanStack Router/Query, Zustand, Tailwind
- **Documentation** (`doc/`) - Architecture, conventions, module specs, task tracking

## Development Commands

### Dev-Lab (multi-agent local development)

When working inside [sushigo-dev-lab](https://github.com/pakodiazdev/sushigo-dev-lab), each workspace clone starts with:

```bash
./init-agent-workspace.sh   # starts Laravel (php -S built-in server) + Vite via Overmind
```

This script lives at the root of this repo and is the **only startup method** when using the dev-lab.
Shared services (PostgreSQL, Redis, Mailpit) are managed by the dev-lab's `docker compose up -d`.
Do **not** run `docker compose up` from inside a workspace — that starts the full heavyweight stack.

#### Running tests in Dev-Lab mode

In Dev-Lab, processes run directly on the host (no `dev_container`). Run all commands from the workspace root without `docker exec`:

```bash
# API tests (PHPUnit)
cd code/api && php artisan test
cd code/api && php artisan test --filter=HolidayCrudTest   # specific test class
cd code/api && php artisan test --coverage

# API linter (Pint — auto-fixes in place)
cd code/api && ./vendor/bin/pint

# Database seeders
cd code/api && php artisan db:seed

# Swagger docs
cd code/api && php artisan l5-swagger:generate

# Frontend tests (Vitest)
cd code/webapp && npx vitest run
cd code/webapp && npx vitest run src/services/__tests__/holiday-api.test.ts   # specific file

# Frontend linters
cd code/webapp && npm run lint
cd code/webapp && npm run typecheck

# E2E (Cypress via dev-lab Makefile — from sushigo-dev-lab root)
make cypress-run WORKSPACE=sushigo-a        # headless (all specs)
make cypress WORKSPACE=sushigo-a            # interactive UI (pick a spec)
```

> **Rule:** When working in dev-lab, never prefix test or artisan commands with `docker exec dev_container`.
> The dev-lab stack does NOT use `dev_container` — that container belongs to the standalone Docker mode below.

> **Test database:** each dev-lab workspace has its own isolated PHPUnit test database (`sushigo_ws_<letter>_test`), configured via `code/api/.env.testing` (Laravel loads this instead of `.env` when `APP_ENV=testing`). `phpunit.xml` does **not** hardcode `DB_DATABASE` — outside dev-lab (standalone Docker mode, CI) it must be supplied explicitly (`DB_DATABASE=mydb_test`, see "Docker Development" below), otherwise tests silently fall back to `.env`'s dev database. Don't share a test database across workspaces — concurrent `RefreshDatabase` schema setup across workspaces causes `SQLSTATE[40P01]` deadlocks.

---

### Docker Development (standalone container mode)

Use this mode when running the full stack outside of dev-lab (e.g. CI, staging, or local all-in-one setup).

This monorepo runs inside `dev_container`. Each sub-project maps to a path inside the container:

| Sub-project    | Host path      | Container path     |
| -------------- | -------------- | ------------------ |
| API (Laravel)  | `code/api/`    | `/app/code/api`    |
| Webapp (React) | `code/webapp/` | `/app/code/webapp` |

```bash
# Start full stack (API, webapp, PostgreSQL, nginx, pgadmin, mailhog)
docker compose up --build

# Run API tests
# DB_DATABASE=mydb_test is required — phpunit.xml no longer hardcodes it (see below),
# so without this override tests would run against the dev database (mydb) instead.
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test"

# Run specific test
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test --filter=WageHistoryTest"

# Run database seeders
docker exec -it dev_container bash -c "cd /app/code/api && php artisan db:seed"

# View seeder status
docker exec -it dev_container bash -c "cd /app/code/api && php artisan seeder:status"

# Regenerate Swagger docs
docker exec -it dev_container bash -c "cd /app/code/api && php artisan l5-swagger:generate"

# Create test database (first time only)
docker exec -it dev_container psql -h pgsql -U admin -d mydb -c "CREATE DATABASE mydb_test;"
```

### E2E Testing

```bash
make e2e-up        # Start E2E container
make cypress-ui    # Open Cypress UI (VNC at http://localhost:6080)
make cypress-run   # Run Cypress headless
```

### Webapp Only

```bash
cd code/webapp
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

### API Only

```bash
cd code/api
composer install
php artisan test              # Run all tests
php artisan test --coverage   # With coverage
```

## Architecture

### API Structure (Laravel)

The API uses **Single Action Controllers (SAC)** - each controller handles one action via `__invoke()`:

```
app/Http/Controllers/Api/V1/
├── Items/
│   ├── CreateItemController.php
│   ├── ListItemsController.php
│   └── ...
├── Inventory/
│   ├── RegisterOpeningBalanceController.php
│   └── RegisterStockOutController.php
```

**Key patterns:**
- Business logic in `app/Actions/` or `app/Services/`
- Input validation in `app/Http/Requests/`
- Response formatting in `app/Http/Responses/`
- Swagger schemas documented alongside Request/Response classes
- All routes versioned under `/api/v1/`
- Routes are split by domain under `routes/api/*.php` and `require`d from `routes/api.php` — see `doc/conventions/backend/route-organization.md` before adding a new domain module or growing an existing route file

### Webapp Structure (React)

TanStack Router with file-based routing - each page exports its own route:

```
src/
├── pages/           # Route pages (export Route + component)
│   ├── __root.tsx   # Root layout
│   ├── inventory/   # Nested inventory routes
│   └── cash/        # Cash management routes
├── components/
│   ├── ui/          # Reusable UI components
│   └── layout/      # Layout components
├── services/        # API service functions with TanStack Query hooks
├── stores/          # Zustand stores (auth.store.ts)
└── lib/api-client.ts  # Axios instance with auth interceptor
```

**Key patterns:**
- Auth state in Zustand store, persisted to localStorage
- API calls via axios client with automatic token injection
- TanStack Query for server state management
- TanStack Router auto-generates `routeTree.gen.ts`

### Domain Model

Core inventory entities:
- `OperatingUnit` - operational context (branch inventory or temporary event)
- `InventoryLocation` - physical/logical zones within units
- `Item` / `ItemVariant` - product catalog
- `Stock` / `StockMovement` / `StockMovementLine` - stock tracking
- `CashSession` / `CashAdjustment` / `CashExpense` - cash management

Menu / Dishes ("Platillos") entities — the prepared-dish menu catalog, distinct from the resale
`Item`/`ItemVariant` inventory above (no stock quantity, no recipe costing):
- `DishCategory` - menu sections (Rollos, Ramen, etc.), ordered by `position`
- `Dish` - belongs to a category, has `base_price`, and media via the same
  `mediaAttachments()`/`primaryMediaGallery()` pattern as `Item`
- `DishExtraGroup` / `DishExtraOption` - per-dish (not shared) customization groups, e.g. "Elige tu
  salsa", each option carrying a `price_delta` added to the dish's `base_price`

See `doc/architecture/` for detailed diagrams and flows.

## Conventions

### Pre-commit Checks (mandatory — always run before committing)

**Before every commit, run the linters and fix all errors. Never commit with lint failures.**

```bash
# PHP — Laravel Pint (auto-fixes formatting)
docker exec dev_container bash -c "cd /app/code/api && ./vendor/bin/pint"

# Frontend — ESLint + TypeScript (must pass with 0 errors)
docker exec dev_container bash -c "cd /app/code/webapp && npm run lint && npm run typecheck"
```

**Rules:**
- Run `pint` (not `pint --test`) so it auto-fixes files in place
- Stage the auto-fixed files and include them in the same commit
- A commit must not be created if `npm run lint` or `npm run typecheck` report errors
- If linters cannot run (e.g. containers are down), fix manually before committing

---

### Commit Messages (mandatory — always follow this exactly)

Full convention reference: `doc/conventions/git/commits.md`

**Why this format exists:**

- **Issue number `[#NNN]`** — every commit must link to a GitHub issue. The issue is where the full context lives: *why* the change was needed, *what problem* it solves, *what decision* was made and why. Without it, future maintainers see code in a state they can't explain. A commit with no issue number destroys that history permanently. If the work has no issue yet, create one before committing.
- **Emojis instead of words** — `✨` replaces `feat`, `🐛` replaces `fix`, `🔨` replaces `refactor`. One character carries the same semantic weight as a whole word, keeps the subject line scannable at a glance, and makes the category immediately visible in `git log` without reading. Each emoji has a fixed meaning — they are not decoration, they are the category label.

**Format — every field is required:**
```
:emoji [#issue] - short description :emoji

- :emoji Activity 1
- :emoji Activity 2
- :emoji Activity 3
```

**Rules (violations like commit 73848c3b must not repeat):**
- **Every commit MUST be tied to a GitHub issue number** — no commit without `[#NNN]`. If the work doesn't have an issue yet, create one before committing. A commit without an issue number is a hard blocker.
- Subject line: `emoji [#NNN] - description emoji` — the dash (` - `) between issue and description is mandatory
- Each bullet in the body **must start with an emoji** — plain `- text` is not allowed
- Issue number is always 3 digits zero-padded: `#001`, `#030`, not `#1` or `#30`
- Description is concise (imperative mood), never a sentence ending in period
- Final ornamental emoji on the subject line is required
- If a commit covers work that spans the same issue as the previous commit, reuse that issue number — never leave the field blank or use a placeholder

**Emoji types:**
- ✨ feat — new feature
- 🐛 fix — bug fix
- 📚 docs — documentation
- 🎨 style — formatting, no logic change
- 🔨 refactor — code restructure
- 🚀 perf — performance improvement
- ✅ test — adding/updating tests
- 🔧 chore — config, tooling, maintenance

**Correct example:**
```
🔨 [#030] - Migrate API format from Model to JsonResource 🗂️

- 🗂️ Created BaseResource with envelope { data, status, meta }
- 📦 Created AttendanceResource migrating 20 fields from toApiArray()
- 👤 Created EmployeeResource + EmployeeSummaryResource
- 🔁 Migrated 4 Attendance controllers and 7 Employee controllers
- 🧹 Removed toApiArray() from both models
- 🧪 Updated EmployeeModelTest
```

**Wrong (do not do this):**
```
🔨 [#030] Implementar JsonResource — migrar formato API   ← missing dash
- Crear BaseResource                                       ← missing emoji on bullet
- Crear AttendanceResource                                 ← missing emoji on bullet

fix: address PR review comments                           ← no issue, no emoji — destroys history
feat(schedules): add schedule history                     ← no issue, word instead of emoji
refactor: fix SonarCloud issues                           ← no issue, word instead of emoji
```

When a commit relates to a backlog story or requirement, add traceability tags before the bullet list:
```
Story: AP-NNN · <full story text from backlog.en.md>
Refs:  RF-XX · <requirement text from spec.en.md>
```

### PR Title (mandatory)

Every PR title **must** include the workspace letter, in its own bracket right after the issue number bracket:

```
<emoji> [#NNN][x] - <description> <emoji>
```

- `x` is the workspace letter, lowercase, matching the `workspaces/sushigo-<x>` directory (e.g. `a`, `b`, `c`)
- No space between the issue bracket and the workspace-letter bracket
- Omit this bracket only for PRs opened from standalone Docker mode (see "Docker Development" below) — that mode has no `workspaces/sushigo-<x>` clone, so there is no letter to put in it

**Example:** `✨ [#073][a] - Confirm weekly payroll close ✅`

**Why:** dev-lab runs up to 8 parallel workspace clones. Without the letter in the title, reviewers scanning a PR list can't tell which workspace a PR came from without opening it.

---

### PR Description (mandatory)

Every PR body **must** include a `Closes #NNN` line referencing the issue the PR resolves, plus a `Devin Review:` line right under it linking to that same PR's DeepWiki page. Place both near the top of the `## Summary` section:

```
## Summary
Closes #009
Devin Review: https://deepwiki.com/pakodiazdev/sushigo/pull/294

- ...
```

**Why:** `Closes #NNN` lets GitHub auto-close the issue on merge — a merged PR without it leaves the issue open for someone to close by hand. `Devin Review:` links to the DeepWiki mirror of this PR, which surfaces the automated review (Devin) for free without needing write access to a paid tool — keeping it next to `Closes #NNN` puts it one click away for any reviewer.

**How:** the PR number isn't known until the PR exists, so add the `Devin Review:` line in a follow-up edit right after `gh pr create` returns the number — `gh pr edit <N> --body "..."` — before requesting review.

Every PR opened from dev-lab **must** also include a `## Workspace` footer identifying where it was developed:

```
## Workspace
`sushigo-c` — `feature/067-daily-operational-report`
```

**Why:** dev-lab runs up to 8 parallel workspace clones. Without this footer, reviewers cannot tell which workspace holds the branch, making it impossible to resume work or reproduce the environment without asking.

**Rules:**
- Workspace name is the directory name under `workspaces/` (e.g. `sushigo-a`, `sushigo-e`)
- Branch name is the full git branch name at the time the PR was opened
- Place the `## Workspace` section just before the `🤖 Generated with` attribution line

---

### Manual Testing Guide (mandatory)

Every PR description **must** include a manual testing guide:

- **New functionality:** step-by-step instructions to exercise the new behavior manually (command to run, page/route to visit, inputs to use, expected result).
- **Bug fix:** steps to reproduce the original bug, plus steps to confirm it no longer happens.

**Why:** automated tests catch regressions, but a reviewer still needs a fast, concrete way to verify the change does what the PR claims — without re-deriving the flow themselves from the diff.

**Rules:**
- Add it as its own `## Manual Testing` section in the PR body, separate from the automated `## Test plan` checklist
- Be concrete: exact commands, URLs, or UI steps — not "test the feature works"
- **Never include passwords or other credentials in the PR body**, even for seeded/ephemeral test environments. Reference the test user by email/username only (e.g. "login as `admin@sushigo.com`") — the password lives in the Test Users table below, not in PR history

---

### DateTime Standard (mandatory)

**UTC everywhere. RFC 3339 in transport. Local only for display.**

- **Database**: Always UTC (`config/app.timezone = 'UTC'`)
- **API input**: ISO 8601 with offset (`2026-02-23T09:05:30-06:00`). Backend normalizes with `Carbon::parse()->utc()`
- **API output**: ISO 8601 UTC (`toIso8601String()` → `2026-02-23T15:05:30+00:00`)
- **Frontend send**: Local time + offset (RFC 3339). Backend converts to UTC
- **Frontend display**: `new Date(utcIso).getHours()` → shows local time
- **Validation**: Use `'date'` rule (not `'date_format'`) to accept offsets
- **Seeders**: Define times in local for readability, convert with `Carbon::parse($time, $tz)->utc()`

See `doc/conventions/backend/api-rules.md` → "DateTime Standard" section for full reference.

### PHP Class Names (mandatory — no inline FQCNs)

**Always import classes at the top of the file and use their short names. Never use backslash-prefixed FQCNs inline in code.**

```php
// ✅ Correct — import at top, use short name
use Carbon\Carbon;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Database\UniqueConstraintViolationException;

Carbon::parse($date);
app()[PermissionRegistrar::class]->forgetCachedPermissions();
$this->expectException(UniqueConstraintViolationException::class);

// ❌ Wrong — inline FQCN
\Carbon\Carbon::parse($date);
app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
$this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
```

This rule applies everywhere: return types, parameter types, `::class` references, `instanceof` checks, `expectException()` calls. PHP built-ins (e.g. `BackedEnum`) that live in the global namespace need no `use` statement and no `\` prefix.

**PR requirement:** Reviewers must reject any code that uses a backslash-prefixed FQCN anywhere outside a `use` or `namespace` declaration.

### FormRequest / Controller / Service responsibilities (mandatory)

> Before writing a `messages()` method on a new `Store*Request`/`Update*Request` in an existing domain (e.g. `CashAdjustments/*`), see `doc/conventions/backend/avoiding-sonarcloud-duplication.md` — check `App\Http\Requests\Concerns\SharesValidationMessages::MESSAGES` for the field/rule pair first, and add new ones there rather than writing a fresh inline array. This is what caused 883 lines of SonarCloud duplication debt (#268, #282, #289).

Each layer has a fixed responsibility. Never mix them:

| Layer | Responsibility |
|---|---|
| **FormRequest** | Authorize the request · validate input · sanitize and transform data · expose typed accessor methods that return ready-to-use data structures |
| **Controller** | Receive the request · call `$request->someMethod()` to get processed data · delegate to a model or service · return the response. **No data transformation here.** |
| **Service** | Encapsulate business logic that spans multiple models or operations |

**FormRequest accessor pattern** — expose a named method instead of doing post-processing in the controller:

```php
// FormRequest
public function definitionData(): array
{
    $data = $this->validated();
    $data['recurrence_config'] ??= [];
    $data['pay_multiplier'] = match ($data['type']) {
        'obligatorio' => 3.00,
        'asueto'      => 1.00,
        default       => $data['pay_multiplier'] ?? 1.00,
    };
    return $data;
}

// Controller — one line, no logic
$definition = HolidayDefinition::create($request->definitionData());
```

**PR requirement:** Reviewers must reject any controller that performs data transformation (defaulting values, deriving fields from other fields, etc.) after calling `$request->validated()`. Move that logic into a FormRequest accessor method.

---

### API Code Style

- Strong typing always (PHP 8.2) - avoid redundant PHPDoc
- Use `updateOrCreate()` in seeders to avoid duplicates
- Seeders use base classes: `LockedSeeder` (critical), `OnceSeeder` (initial data), `RepeatableSeeder` (dynamic)
- Seeder data configured in `config/seeders.php`, not hardcoded

### Frontend Code Style

- Pages in `src/pages/` with `createFileRoute()` exports
- Components use PascalCase, files match component names
- Path aliases via `@/` for absolute imports

### TypeScript Strict Typing (mandatory — no `any`)

**Never use `any` in TypeScript code. Always use specific types or `unknown`.**

```tsx
// ✅ Correct — use specific types or unknown
import { getApiErrorMessage } from '@/lib/api-error'

// For error handlers:
onError: (error: unknown) => {
  showError(getApiErrorMessage(error, 'Operation failed'))
}

// For array callbacks, import and use the actual type:
import type { InventoryLocation, ItemVariant } from '@/types/inventory'

locations.map((loc: InventoryLocation) => loc.name)
variants.forEach((v: ItemVariant) => console.log(v.sku))

// For dynamic objects where shape is truly unknown:
const meta: Record<string, unknown> = {}

// ❌ Wrong — avoid any
onError: (error: any) => { ... }
items.map((item: any) => item.name)
const data: any = response
```

**Patterns for common cases:**

| Scenario               | Type to use                          |
| ---------------------- | ------------------------------------ |
| Error in catch/onError | `unknown` + `getApiErrorMessage()`   |
| Array callback         | Import specific type from `@/types/` |
| Event handler value    | `string \| number` or specific union |
| API response data      | Define interface in `@/types/`       |
| JSON meta fields       | `Record<string, unknown>`            |

**API error utilities** — use `@/lib/api-error.ts`:
- `getApiErrorMessage(error, defaultMsg)` — extract message safely
- `getApiValidationErrors(error)` — get field→message map for forms
- `hasApiValidationErrors(error)` — check if error has validation errors
- `isApiError(error)` — type guard for AxiosError

**PR requirement:** Reviewers must reject any code containing `any`. Run `npm run lint` to catch `@typescript-eslint/no-explicit-any` warnings.

See `doc/conventions/frontend/typescript-typing.md` for detailed patterns.

### Form Convention (mandatory for all forms)

**Every form in the webapp MUST use `react-hook-form` + `@hookform/resolvers` + `zod`.**

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const mySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  date: z.string().min(1, 'La fecha es requerida'),
})

type MyFormValues = z.infer<typeof mySchema>

function MyForm({ onSubmit }: { onSubmit: (v: MyFormValues) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<MyFormValues>({
    resolver: zodResolver(mySchema),
    defaultValues: { name: '', date: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <p>{errors.name.message}</p>}
    </form>
  )
}
```

**Rules:**
- Schema defined with `zod` at the top of the file (or in a separate `*.schema.ts`)
- Type inferred via `z.infer<typeof schema>` — never hand-write form value types
- No manual `useState` for form fields or validation errors in forms
- Validation errors displayed inline below each field
- `onSubmit` callback receives typed `FormValues` (already validated by zod)
- Forms extracted as standalone components when they have 3+ fields or independent state

**PR requirement:** Any PR that adds or modifies a form must comply with this pattern. Reviewers should reject form PRs that use raw `useState` for field management instead of `react-hook-form`.

### Custom Hook Convention (mandatory for components with logic)

**Any component with 3+ `useState` calls, API mutations, or non-trivial handlers MUST extract its logic into a custom `use<ComponentName>` hook.**

```tsx
// use-my-form.ts — logic only, no JSX
export function useMyForm() {
  const [showConfirm, setShowConfirm] = useState(false)
  const mutation = useCreateSomething()

  const handleSubmit = async (values: FormValues) => {
    await mutation.mutateAsync(values)
  }

  return { showConfirm, setShowConfirm, handleSubmit, isPending: mutation.isPending }
}

// my-form.tsx — view only, no business logic
export function MyForm() {
  const { showConfirm, setShowConfirm, handleSubmit, isPending } = useMyForm()
  return <form onSubmit={handleSubmit}>...</form>
}
```

**Rules:**
- Hook file: `use-<component-name>.ts` (kebab-case, no JSX)
- Hook lives alongside the component it serves (same directory)
- Hook owns: state, queries, mutations, submit handlers, derived booleans
- Component owns: JSX structure, className, labels — pure presentation
- Types exported from hook file; component re-exports them if consumers need them
- Hooks that resolve auth-store values (branch, isAdmin) do so internally — don't thread them as props

**PR requirement:** Any PR that adds a component with 3+ `useState` calls or API mutations must extract the logic into a custom hook. Reviewers should reject PRs where logic and JSX are mixed in the same component.

### Testing Strategy (mandatory)

**Cypress is reserved for happy-path E2E only. Security and error cases belong in PHPUnit/Vitest.**

Full convention reference: `doc/conventions/testing/testing-strategy.md`

**Testing pyramid — what goes where:**

| What to test | Where | Priority |
|---|---|---|
| API happy path + authorization + validation | PHPUnit Feature | Required |
| Complex business logic, edge cases, mocks | PHPUnit Unit | Required |
| Route guards, redirect config, role checks | Vitest | Required |
| Error feedback (toasts, form errors) | Vitest | Nice-to-have |
| User-facing happy path (full flow) | Cypress | Required (1 per feature) |
| Error/validation/security in UI | Cypress | **Prohibited** |

**Test data seeders** (see `doc/conventions/testing/test-data-seeders.md`):
- `Testing/` — concrete deterministic data, bulk inserts, used by Cypress/PHPUnit via `test:reset`
- `Fakes/` — factories for volume data (pagination, stress), used on demand in dev + testing
- `Development/` — full dev experience (Actions + factories + scenarios), never called from Cypress

**Test environment services** (see `doc/conventions/testing/test-environment-services.md`):
- Tests must not depend on infrastructure services (Mailhog, Redis) that are not the system under test
- Use environment-aware DI to replace external services with deterministic alternatives
- Test-only API endpoints (`/test/*`) guarded by environment check, never exposed in production

**PR merge requirements:**
- SonarCloud line coverage >= 80% on new code (backend and frontend)
- At least one Cypress spec with the happy path of the delivered feature
- All existing tests pass — enforced by CI's full-suite run, not a local pre-PR step (see `doc/conventions/testing/testing-strategy.md` → "Local vs CI"); if changes break prior tests, the PR includes fixes with explanation
- PHPUnit Feature tests for every new/changed endpoint (happy path + unauthorized access)

## Access URLs (Local Development)

- **Webapp**: https://sushigo.local (via nginx) or http://localhost:5173 (direct Vite)
- **API**: https://api.sushigo.local/api/v1
- **Swagger UI**: http://localhost:8080/api/documentation
- **PgAdmin**: http://localhost:5050 (admin@admin.com / admin)
- **Mailhog**: http://localhost:8025

**Default login**: admin@sushigo.com / admin123456

## Testing

### API Tests

Tests use PostgreSQL (`mydb_test` database, passed explicitly via `DB_DATABASE=mydb_test` — `phpunit.xml` does not hardcode it). Each test runs in a transaction that rolls back:

```bash
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test --testsuite=Feature"
```

### Test Users

| User              | Email                  | Password        | Role              |
| ----------------- | ---------------------- | --------------- | ----------------- |
| Super Admin       | superadmin@sushigo.com | admin123456     | super-admin       |
| Admin             | admin@sushigo.com      | admin123456     | admin             |
| Inventory Manager | inventory@sushigo.com  | inventory123456 | inventory-manager |
| Branch Manager    | manager@sushigo.com    | employee123456  | manager           |

## Task Tracking Convention (mandatory)

The **GitHub issue is the single source of truth** while work is open — see
[TD-01](doc/decisions/td-01-single-source-issue-tracking.md) for why. `doc/tasks/backlog/` is
retired; issues are filed directly on GitHub, never as a local file first.

```
doc/tasks/
└── yyyy-mm/          ← archived tasks, one folder per month — written once, at close
    └── NNN-task-name.md   (NNN = the GitHub issue number, always)
```

**Rules:**
- Every issue is linked to the **SushiGo Admin** GitHub Project (Status field only — never set
  **Iteration** until a human explicitly assigns a sprint)
- Every issue body carries the mandatory sections from `doc/conventions/tasks.md` (Description/
  Reason/Objective, or for bugs Bug description/Hypothesis/Reproduction guide, plus `## ⏱️ Time`
  with Estimates and an empty `Sessions` array)
- Every issue carries **exactly one** `investment:` label — see `doc/conventions/tasks.md` →
  "Investment Type" for the three canonical values and the classification rule of thumb
- While the issue is open, `/start-issue` opens/closes work sessions by editing the issue body
  directly — **no local `.md` exists or is touched during active work**
- The local `.md` archive is written **exactly once**, by `/finish-pr`, as a verbatim snapshot of
  the finished issue — never created or edited before that

**Closing an issue (mandatory checklist, done by `/finish-pr`):**
1. Recompute `Tracked` from the `Sessions` array already in the issue body
2. Tick completed checklist items on the issue itself
3. Append a `## 📊 Retrospective` section to the issue body — see `doc/conventions/tasks.md` for format and rules
4. Archive the finished issue verbatim to `doc/tasks/yyyy-mm/<issue-number>-task-name.md`
5. Close the GitHub issue (via the PR's `Closes #NNN`, not manually)

---

## Key Files

- `docker-compose.yml` - Main development stack
- `docker-compose.e2e.yml` - E2E testing stack
- `Makefile` - Common development commands
- `code/api/routes/api.php` - Route entry point (test/dev/devtools + requires `routes/api/*.php`)
- `code/webapp/src/routeTree.gen.ts` - Auto-generated route tree
- `doc/architecture/` - Domain architecture docs (English/Spanish)
- `doc/conventions/` - Code standards
- `doc/tasks/` - Archived, closed issues (one snapshot per issue, written at close — see Task Tracking Convention above)
- `doc/decisions.md` - Technical decisions log index (`doc/decisions/td-NN-*.md` for each entry)
