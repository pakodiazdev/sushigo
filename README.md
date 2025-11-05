# SushiGo Tenant Platform

Full-stack workspace that powers the SushiGo tenant inside the ComandaFlow ecosystem.  
The repository bundles a Laravel API (inventory, auth and future operational modules), a React/Vite admin webapp, and Docker tooling for a one-command local environment.

## Project layout

- `code/api/` – Laravel 12 backend with Passport OAuth and Spatie Permissions.
- `code/webapp/` – React 19 + Vite dashboard that consumes the API.
- `doc/architecture/` – Domain & design docs for inventory and tenant flows.
- `doc/tasks/` – Engineering task logs (e.g. auth migration to Zustand).
- `docker/` – Dev container image, Apache config and provisioning scripts.
- `.devcontainer/` – VS Code devcontainer definition wiring the compose stack.

## Tech stack

| Layer | Stack |
|-------|-------|
| API | PHP 8.2, Laravel 12, Passport, Spatie Permissions, L5 Swagger |
| Webapp | React 19, Vite 7, TypeScript 5, TanStack Router/Query, Zustand, Tailwind |
| Data | PostgreSQL 15, seeders tracked via `SeederLog` |
| Tooling | Docker Compose, MailHog, PgAdmin, Supervisor, Devcontainer |

## Getting started (Docker Compose)

Prerequisites: Docker Engine + Compose.

```bash
git clone <repo>
cd <repo>
docker compose up --build
```

The `docker/dev/config/dev/init.sh` script bootstraps everything:

- Installs Composer/NPM deps (API + webapp).
- Waits for PostgreSQL, runs migrations and tracked seeders.
- Generates Passport keys (600/600 perms) and Swagger docs.
- Links storage and starts Apache + Vite via Supervisor.

When the stack is up:

- API: http://localhost:8080/api/v1
- Swagger UI: http://localhost:8080/api/documentation (generated on start)
- Webapp: http://localhost:5173 (proxied from the same container)
- PgAdmin: http://localhost:5050 (`admin@admin.com` / `admin`)
- Mailhog: http://localhost:8025

Default seeded account (`config/seeders.php`):

- `admin@sushigo.com` / `admin123456` (super-admin)

Use it to log into the webapp after the first boot.

## Running services manually

### Backend (Laravel)

```bash
cd code/api
cp .env.example .env    # adjust DB credentials if needed
composer install
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan serve
```

Useful artisan commands:

```bash
php artisan seeder:status        # view tracked seeders
php artisan l5-swagger:generate  # regenerate API docs
php artisan test                 # run backend tests
```

### Frontend (React)

```bash
cd code/webapp
npm install
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # production build into dist/
```

The webapp relies on the API base URL configured in `src/lib/api-client.ts`.

## Architecture & domain documentation

- [Inventory Architecture & Design (modelos, diagramas y flujos)](doc/architecture/inventory-architecture.md)
- [Security & User System Architecture](doc/architecture/security-and-user-system-architecture.md)
- [Task #004 — Auth + Zustand migration](doc/tasks/2025-11/004-authentication-frontend-zustand.md)

These documents capture the target inventory domain (operating units, stock movements, Hashids exposure) and should guide upcoming modules.

## Development tips

- Seeders use `TrackableSeeder` + `SeederLog` to avoid duplicate data; pass `--force` to rerun when required.
- Passport tokens are managed via password grant; the React store (`src/stores/auth.store.ts`) persists tokens with Zustand.
- Running inside the provided devcontainer (`F1 → Dev Containers: Reopen in Container`) attaches VS Code extensions listed in `.devcontainer/devcontainer.json`.

Happy hacking 🥢
