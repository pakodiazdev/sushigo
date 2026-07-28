# SushiGo Platform

SushiGo is the operations platform for a single restaurant tenant inside the ComandaFlow ecosystem — one business running across multiple branches and temporary events from a single system. It currently covers four live domains: **Inventory & Stock** (multi-location, transfers, auditable movements), **Cash Management** (sessions, adjustments, expenses, card terminals), **Attendance & Payroll** (schedules, check-in/out, overtime, vacations, leave requests, payroll close) and **User & Access Control** (OAuth, roles, granular permissions). The repository bundles the Laravel 12 API, the React 19 admin webapp, and the Docker tooling to run all of it locally in one command — a Flutter mobile app is planned to extend attendance operations into a full point-of-sale with on-device ticket printing.

## Engineering Highlights

*A quick read for reviewers — every claim below is backed by a badge or a linked doc further down.*

- **Testing discipline, not just volume** — a strict PHPUnit → Vitest → Cypress pyramid (112 / 237 / 45 test files) with SonarCloud enforcing ≥80% coverage on new code as a hard merge gate, not a suggestion.
- **Clean backend architecture** — Single Action Controllers, dedicated Actions/Services layers, effective-dated domain modeling for wage/schedule history, real Laravel Policy-based authorization (`$user->can(...)`), OpenAPI docs generated from code.
- **Full CI/CD pipeline** — 5 GitHub Actions workflows gate every PR (backend/frontend tests + lint), plus a one-click manual Cloud Run preview deploy via GCP Workload Identity Federation.
- **A genuinely distinctive workflow** — [`sushigo-dev-lab`](https://github.com/pakodiazdev/sushigo-dev-lab) orchestrates up to 8 parallel git-worktree "workspaces," each a fully independent Laravel + Vite stack sharing Postgres/Redis/Mailpit, so multiple issues ship as parallel waves instead of one branch at a time.
- **A real business domain, not a CRUD toy** — multi-location inventory, cash sessions, and a full attendance/payroll system (schedules, overtime banking, punctuality bonuses, vacations, leave requests, payroll close/reopen/export) built for a multi-branch restaurant operation.

---

**Backend Quality:**

[![Tests](https://github.com/pakodiazdev/sushigo/actions/workflows/api-tests.yml/badge.svg)](https://github.com/pakodiazdev/sushigo/actions/workflows/api-tests.yml)
[![Lint](https://github.com/pakodiazdev/sushigo/actions/workflows/api-lint.yml/badge.svg)](https://github.com/pakodiazdev/sushigo/actions/workflows/api-lint.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=pakodiazdev_sushigo-api&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=pakodiazdev_sushigo-api)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=pakodiazdev_sushigo-api&metric=coverage)](https://sonarcloud.io/summary/new_code?id=pakodiazdev_sushigo-api)

**Backend stack:**
![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![Passport](https://img.shields.io/badge/Passport-OAuth2-3178C6?logo=oauth&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)

---

**Frontend Quality:**

[![Tests](https://github.com/pakodiazdev/sushigo/actions/workflows/webapp-tests.yml/badge.svg)](https://github.com/pakodiazdev/sushigo/actions/workflows/webapp-tests.yml)
[![Lint](https://github.com/pakodiazdev/sushigo/actions/workflows/webapp-lint.yml/badge.svg)](https://github.com/pakodiazdev/sushigo/actions/workflows/webapp-lint.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=pakodiazdev_sushigo-webapp&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=pakodiazdev_sushigo-webapp)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=pakodiazdev_sushigo-webapp&metric=coverage)](https://sonarcloud.io/summary/new_code?id=pakodiazdev_sushigo-webapp)

**Frontend stack:**  
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack%20Router-1-FF4154?logo=reactrouter&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-443E38?logo=react&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)

---

**Infra:**
  
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/pakodiazdev/sushigo)
[![License: Elastic-2.0](https://img.shields.io/badge/license-Elastic--2.0-blue.svg)](LICENSE)

---

## Table of contents

- [SushiGo Platform](#sushigo-platform)
  - [Engineering Highlights](#engineering-highlights)
  - [Table of contents](#table-of-contents)
  - [Project layout](#project-layout)
  - [Tech stack](#tech-stack)
  - [Getting started (Docker Compose)](#getting-started-docker-compose)
  - [Running services manually](#running-services-manually)
    - [Backend (Laravel)](#backend-laravel)
    - [Frontend (React)](#frontend-react)
  - [Testing](#testing)
  - [Make commands](#make-commands)
    - [E2E testing — dev-lab stack](#e2e-testing--dev-lab-stack)
    - [E2E testing — devtest Docker stack](#e2e-testing--devtest-docker-stack)
    - [Database](#database)
    - [Local setup](#local-setup)
  - [Architecture \& domain documentation](#architecture--domain-documentation)
  - [Sprints](#sprints)
  - [Development tips](#development-tips)
  - [License](#license)

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

## Testing

Testing follows a strict pyramid — see [`doc/conventions/testing/testing-strategy.md`](doc/conventions/testing/testing-strategy.md) for the full rationale.

```
         ┌──────────┐
         │ Cypress   │  E2E – happy path only
        ─┼───────────┼─
        │  Vitest     │  Frontend integration + unit
       ─┼─────────────┼─
       │   PHPUnit     │  Backend Feature + Unit
       └───────────────┘
```

| Layer | What it covers | Command |
|---|---|---|
| **PHPUnit** (`code/api/tests/`) | API endpoints (happy path + unauthorized access), validation rules, business logic edge cases | `cd code/api && php artisan test` |
| **Vitest** (`code/webapp/src/**/__tests__/`) | Route guards/redirects (required), custom hooks with 3+ state vars or mutations, error feedback | `cd code/webapp && npx vitest run` |
| **Cypress** (`code/webapp/cypress/e2e/`) | One happy-path spec per delivered feature — never error/validation/security cases | `make cypress-run` (see below) |

**Coverage is a merge gate**: SonarCloud requires ≥80% coverage on new code for both `pakodiazdev_sushigo-api` and `pakodiazdev_sushigo-webapp` — see the badges above.

```bash
# Backend, with coverage
cd code/api && php artisan test --coverage

# Frontend, with coverage
cd code/webapp && npx vitest run --coverage
```

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

## Sprints

Development is organized into documented sprints — see [`doc/conventions/sprints.md`](doc/conventions/sprints.md) for the full convention and [`doc/sprints/`](doc/sprints/) for every sprint document (goal, scope, execution rounds, conflict analysis, and results).

| Sprint | Title | Status | Started | Completed | Target | Document |
|---|---|---|---|---|---|---|
| 000 | Introduction | Completed | 2026-07-26 | 2026-07-26 | — | [sprint-000-introduction.md](doc/sprints/sprint-000-introduction.md) |
| 001 | Attendance, Payroll & Quality | In Progress | 2026-07-26 | 19.2% | 2026-08-09 | [sprint-001-attendance-payroll-quality.md](doc/sprints/sprint-001-attendance-payroll-quality.md) |

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
