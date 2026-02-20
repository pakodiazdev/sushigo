# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SushiGo is a full-stack tenant platform within the ComandaFlow ecosystem. It consists of:
- **Laravel 12 API** (`code/api/`) - Backend with Passport OAuth, Spatie Permissions, L5 Swagger
- **React 19 Webapp** (`code/webapp/`) - Admin dashboard with TanStack Router/Query, Zustand, Tailwind

## Development Commands

### Docker Development (Recommended)

```bash
# Start full stack (API, webapp, PostgreSQL, nginx, pgadmin, mailhog)
docker compose up --build

# Run API tests
docker exec -it dev_container php artisan test

# Run specific test
docker exec -it dev_container php artisan test --filter=OpeningBalanceTest

# Run database seeders
docker exec -it dev_container php artisan db:seed

# View seeder status
docker exec -it dev_container php artisan seeder:status

# Regenerate Swagger docs
docker exec -it dev_container php artisan l5-swagger:generate

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

### Commit Messages

Use emoji-prefixed format:
```
:emoji [#issue] - short description :emoji

- :emoji Activity 1
- :emoji Activity 2
```

Emojis: ✨ (feat), 🐛 (fix), 📚 (docs), 🔨 (refactor), 🔧 (chore), ✅ (test)

### API Code Style

- Strong typing always (PHP 8.2) - avoid redundant PHPDoc
- Use `updateOrCreate()` in seeders to avoid duplicates
- Seeders use base classes: `LockedSeeder` (critical), `OnceSeeder` (initial data), `RepeatableSeeder` (dynamic)
- Seeder data configured in `config/seeders.php`, not hardcoded

### Frontend Code Style

- Pages in `src/pages/` with `createFileRoute()` exports
- Components use PascalCase, files match component names
- Path aliases via `@/` for absolute imports

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

| User | Email | Password | Role |
|------|-------|----------|------|
| Super Admin | superadmin@sushigo.com | admin123456 | super-admin |
| Admin | admin@sushigo.com | admin123456 | admin |
| Inventory Manager | inventory@sushigo.com | inventory123456 | inventory-manager |

## Key Files

- `docker-compose.yml` - Main development stack
- `docker-compose.e2e.yml` - E2E testing stack
- `Makefile` - Common development commands
- `code/api/routes/api.php` - All API route definitions
- `code/webapp/src/routeTree.gen.ts` - Auto-generated route tree
- `doc/architecture/` - Domain architecture docs (English/Spanish)
- `doc/conventions/` - Code standards
