# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SushiGo is a full-stack tenant platform within the ComandaFlow ecosystem. **This is a monorepo** with the following structure:
- **Laravel 12 API** (`code/api/`) - Backend with Passport OAuth, Spatie Permissions, L5 Swagger
- **React 19 Webapp** (`code/webapp/`) - Admin dashboard with TanStack Router/Query, Zustand, Tailwind
- **Documentation** (`doc/`) - Architecture, conventions, module specs, task tracking

## Development Commands

### Docker Development (Recommended)

This monorepo runs inside `dev_container`. Each sub-project maps to a path inside the container:

| Sub-project    | Host path      | Container path     |
| -------------- | -------------- | ------------------ |
| API (Laravel)  | `code/api/`    | `/app/code/api`    |
| Webapp (React) | `code/webapp/` | `/app/code/webapp` |

All `php artisan` commands must run from `/app/code/api` inside `dev_container`.

```bash
# Start full stack (API, webapp, PostgreSQL, nginx, pgadmin, mailhog)
docker compose up --build

# Run API tests
docker exec -it dev_container bash -c "cd /app/code/api && php artisan test"

# Run specific test
docker exec -it dev_container bash -c "cd /app/code/api && php artisan test --filter=WageHistoryTest"

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

**Format — every field is required:**
```
:emoji [#issue] - short description :emoji

- :emoji Activity 1
- :emoji Activity 2
- :emoji Activity 3
```

**Rules (violations like commit 73848c3b must not repeat):**
- Subject line: `emoji [#NNN] - description emoji` — the dash (` - `) between issue and description is mandatory
- Each bullet in the body **must start with an emoji** — plain `- text` is not allowed
- Issue number is always 3 digits zero-padded: `#001`, `#030`, not `#1` or `#30`
- Description is concise (imperative mood), never a sentence ending in period
- Final ornamental emoji on the subject line is required

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
```

When a commit relates to a backlog story or requirement, add traceability tags before the bullet list:
```
Story: AP-NNN · <full story text from backlog.en.md>
Refs:  RF-XX · <requirement text from spec.en.md>
```

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

## Access URLs (Local Development)

- **Webapp**: https://sushigo.local (via nginx) or http://localhost:5173 (direct Vite)
- **API**: https://api.sushigo.local/api/v1
- **Swagger UI**: http://localhost:8080/api/documentation
- **PgAdmin**: http://localhost:5050 (admin@admin.com / admin)
- **Mailhog**: http://localhost:8025

**Default login**: admin@sushigo.com / admin123456

## Testing

### API Tests

Tests use PostgreSQL (`mydb_test` database). Each test runs in a transaction that rolls back:

```bash
docker exec -it dev_container php artisan test --testsuite=Feature
```

### Test Users

| User              | Email                  | Password        | Role              |
| ----------------- | ---------------------- | --------------- | ----------------- |
| Super Admin       | superadmin@sushigo.com | admin123456     | super-admin       |
| Admin             | admin@sushigo.com      | admin123456     | admin             |
| Inventory Manager | inventory@sushigo.com  | inventory123456 | inventory-manager |

## Task Tracking Convention (mandatory)

Tasks live in `doc/tasks/` with this structure:

```
doc/tasks/
├── yyyy-mm/          ← completed tasks, one folder per month
│   └── NNN-task-name.md
└── backlog/
    └── <category>/   ← pending tasks grouped by category (e.g. infrastructure)
        └── NNN-task-name.md
```

**Rules:**
- When a task is completed, move its `.md` file from `backlog/<category>/` to `doc/tasks/yyyy-mm/` where `yyyy-mm` is the **current month** (e.g. `2026-02`)
- Never create a `done/` folder — completed tasks go directly into the monthly folder
- The monthly folder is flat (no subfolders by category inside it)
- If the `yyyy-mm` folder doesn't exist yet, create it

---

## Key Files

- `docker-compose.yml` - Main development stack
- `docker-compose.e2e.yml` - E2E testing stack
- `Makefile` - Common development commands
- `code/api/routes/api.php` - All API route definitions
- `code/webapp/src/routeTree.gen.ts` - Auto-generated route tree
- `doc/architecture/` - Domain architecture docs (English/Spanish)
- `doc/conventions/` - Code standards
- `doc/tasks/` - Task tracking (backlog + monthly completed)
