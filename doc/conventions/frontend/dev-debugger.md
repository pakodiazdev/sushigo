# DevDebugger — Developer Debugging Panel

The `DevDebugger` is a floating, draggable in-app panel that gives developers real-time visibility into authentication state, roles/permissions, and TanStack Query cache — without leaving the browser. It also provides a **Dev Login** feature for quickly switching between users during development.

**Location:** `code/webapp/src/components/dev/DevDebugger.tsx`

---

## Purpose

During development it is common to need to:

- Verify what user is authenticated and what token/roles they hold
- Switch between users with different roles to test permission-gated views
- Inspect query cache state without opening DevTools
- Spot auth-state regressions immediately after a code change

The DevDebugger surfaces all of this directly in the app UI, removing the need to check `localStorage`, network tabs, or restart sessions manually.

---

## Rendering

The component is only included in the bundle when Vite builds in `DEV` mode:

```tsx
// src/App.tsx (or root layout)
{import.meta.env.DEV && <DevDebugger />}
```

It is never shipped in a production build — the condition is evaluated at build time, so the component and all its imports are tree-shaken out.

---

## Keyboard Shortcut

| OS              | Shortcut           |
| --------------- | ------------------ |
| macOS           | `Cmd + Shift + D`  |
| Windows / Linux | `Ctrl + Shift + D` |

The shortcut toggles the panel visible/hidden. When revealed after being hidden, it always opens in expanded mode. The shortcut is ignored when the cursor is inside an input, textarea, or contenteditable element.

---

## Sections

### User
Displays the currently authenticated user: ID, name, email, authentication status, and a truncated token preview.

### Roles & Permissions
Shows role badges and direct permission badges from the auth store. Also exposes the computed `isAdmin` value.

### Query Cache
Live snapshot of TanStack Query's cache: total queries, fresh, stale, and currently fetching. The toolbar **Refresh** button (`↻`) calls `queryClient.invalidateQueries()` to force a full refetch.

### Dev Login *(shown only when not authenticated)*
Allows logging in as any existing user without a password. See [Dev Login](#dev-login) below.

---

## State Persistence

The panel position and each section's collapsed/expanded state are persisted to `localStorage` under the key `dev_debugger_state`. They survive page reloads within the same browser.

To reset to defaults, run in the console:

```js
localStorage.removeItem('dev_debugger_state')
```

---

## Visibility Control

By default the debugger starts visible when the page loads. To start hidden (useful in E2E environments), set:

```env
VITE_DEV_DEBUGGER_START_HIDDEN=true
```

The panel can still be revealed at any time with the keyboard shortcut.

---

## Dev Login

### What it does

When a developer is **not authenticated**, the Dev Login section lists all users in the database. Clicking any user logs in as that user instantly — no password required — and reloads the page with a valid session.

This is strictly a developer convenience. It is designed to be inert in any non-development environment.

### How to enable it

Two environment variable pairs must be set — one on each side of the stack:

**API (`code/api/.env`):**
```env
LOGIN_WITH_DEVDEBUG=true
DEV_LOGIN_ALLOWED_ENVIRONMENTS=local,dev,devtest
```

**Webapp (`code/webapp/.env`):**
```env
VITE_LOGIN_WITH_DEVDEBUG=true
VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS=local,dev,devtest
VITE_APP_ENV=local
```

Both pairs default to disabled in `.env.example`.

### Search / filter

The section renders a search field that filters the user list **locally** (no additional API calls on each keystroke). Useful when the database has many users — type a name or email to narrow the list.

---

## Security Architecture

The feature employs **defense in depth**: two independent validation layers, each capable of blocking access on its own.

### Layer 1 — Backend (source of truth)

Implemented in `App\Support\DevLoginGuard::validate()` and called at the start of both `GET /v1/dev/users` and `POST /v1/dev/login`.

| Condition                                | Variable                               | Failure behavior              |
| ---------------------------------------- | -------------------------------------- | ----------------------------- |
| Feature flag explicitly enabled          | `LOGIN_WITH_DEVDEBUG=true`             | Returns **404**               |
| Current `APP_ENV` is in the allowed list | `DEV_LOGIN_ALLOWED_ENVIRONMENTS` (csv) | Returns **404**               |
| `production` in the allowed list         | —                                      | **Throws `RuntimeException`** |

Endpoints return **404** (not 401 or 403) when disabled. From the perspective of a caller, the endpoints do not exist.

Routes are also only registered at all when `app()->environment('testing', 'local', 'dev', 'devtest')` is true (see `routes/api.php`). In a production deployment where `APP_ENV=production`, the routes are not registered at the framework level — the guard never even runs.

### Layer 2 — Frontend (avoids unnecessary requests)

`isDevLoginEnabled()` in `dev-login-enabled.ts` mirrors the backend logic using the `VITE_` copies of the same variables. If either condition fails the Dev Login section is not rendered and no API call is made.

```
VITE_LOGIN_WITH_DEVDEBUG !== 'true'  →  section hidden, no request
VITE_APP_ENV not in VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS  →  section hidden, no request
```

The frontend check is a UX guard, not a security control. The backend is always the authoritative gate.

### Why 404, not 401/403?

Returning 401 or 403 would reveal that the endpoint exists. A 404 makes the endpoint indistinguishable from any unknown route to an external observer or automated scanner.

### Why `RuntimeException` for production in the list?

If `production` appeared in the allowed list it would mean a misconfiguration slipped through. A silent 404 would hide the problem; a thrown exception causes an immediate, loud failure that forces the developer to fix the configuration before the app can serve any request. This is intentional **fail-loud** behavior.

### Production deployment checklist

| Check                            | Expected value                                      |
| -------------------------------- | --------------------------------------------------- |
| `LOGIN_WITH_DEVDEBUG`            | `false` (or unset)                                  |
| `DEV_LOGIN_ALLOWED_ENVIRONMENTS` | must not contain `production`                       |
| `APP_ENV`                        | `production`                                        |
| Routes registered?               | No — environment guard prevents it                  |
| Bundle contains `DevDebugger`?   | No — `import.meta.env.DEV` is `false` at build time |

---

## File Map

| File                                                         | Purpose                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `src/components/dev/DevDebugger.tsx`                         | Main component — UI, drag, sections, Dev Login              |
| `src/components/dev/dev-login-enabled.ts`                    | `isDevLoginEnabled()` — frontend guard helper               |
| `src/services/dev-api.ts`                                    | `listDevUsers()` + `loginAs()` — API calls                  |
| `app/Support/DevLoginGuard.php`                              | Backend guard — double validation + RuntimeException        |
| `config/devlogin.php`                                        | Laravel config reading `LOGIN_WITH_DEVDEBUG` + allowed envs |
| `app/Http/Controllers/Api/V1/Dev/ListDevUsersController.php` | `GET /v1/dev/users`                                         |
| `app/Http/Controllers/Api/V1/Dev/DevLoginController.php`     | `POST /v1/dev/login`                                        |

---

## Tests

| Suite           | File                                                     | Cases                                                    |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| PHPUnit Feature | `tests/Feature/Dev/DevLoginTest.php`                     | 6 — guard conditions, user list, token, RuntimeException |
| Vitest          | `src/components/dev/__tests__/dev-login-enabled.test.ts` | 6 — flag states, env mismatch, whitespace, empty list    |
| Cypress E2E     | `cypress/e2e/dev-debug-login.cy.ts`                      | 3 — section visibility, login happy path, local search   |
