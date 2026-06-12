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

The `docker/app/config/dev/init.sh` script bootstraps everything:

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

## Make commands

Run `make help` for the full list. Common commands grouped by purpose:

### E2E testing — dev-lab stack

Requires the dev-lab E2E stack to be running first (`make e2e WORKSPACE=sushigo-a` from `sushigo-dev-lab`).

| Command | Description |
|---|---|
| `make cypress-devlab` | Open Cypress GUI — pick and run specs interactively |
| `make cypress-devlab-spec SPEC=login` | Run one spec with browser visible |
| `make cypress-devlab-spec SPEC=login GREP="logs in"` | Same, filtered by test name |
| `make cypress-devlab-headed` | Run all specs with browser visible |
| `make cypress-devlab-run` | Run all specs headless |
| `make cypress-devlab-run-spec SPEC=login` | Run one spec headless |
| `make cypress-devlab-run-spec SPEC=login GREP="logs in"` | Same, filtered by test name |

`SPEC` is the filename without path or `.cy.ts` extension (e.g. `attendance-checkin`).
`GREP` filters by test description substring — useful to run a single `it()` inside a spec.

### E2E testing — devtest Docker stack

Uses the workspace's own `docker-compose.e2e.yml` with a Cypress container.

| Command | Description |
|---|---|
| `make e2e-up` | Start the E2E PHP container |
| `make e2e-down` | Stop it |
| `make e2e-restart` | Restart it |
| `make e2e-logs` | Tail its logs |
| `make cypress-run` | Run all specs headless inside Docker |
| `make cypress-spec SPEC=login` | Run one spec headed (browser via VNC) |
| `make cypress-ui` | Open Cypress GUI inside Docker (VNC at http://localhost:6080) |

### Database

| Command | Description |
|---|---|
| `make db-seed` | Run all seeders inside `dev_container` |

### Local setup

| Command | Description |
|---|---|
| `make hosts-setup` | Print the `/etc/hosts` line needed for `sushigo.local` |
| `make ssl-info` | Show SSL certificate status and install instructions |
| `make chrome-clear-hsts` | Instructions to clear Chrome HSTS cache for `localhost` |

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

## License

This project is licensed under the [Elastic License 2.0](LICENSE).

| Use case | Allowed |
|---|---|
| Study, fork, portfolio, research | ✅ |
| Self-hosting for your own business | ✅ |
| Installing for a single client (on-premise) | ✅ |
| Charging for implementation and support | ✅ |
| Offering as a hosted / managed SaaS | ❌ |
| Building a competing multi-tenant platform | ❌ |

Full rationale: [doc/conventions/licensing.md](doc/conventions/licensing.md)  
Commercial licensing inquiries: jfcodiaz@gmail.com

© 2026 Pako Díaz. All rights reserved.
