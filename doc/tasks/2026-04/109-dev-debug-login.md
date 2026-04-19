# 🔑 Task #109: Dev Debug Login — Quick User Switch in DevDebugger

## 📖 Story

**English:**
As a developer, I need to be able to log in as any existing user directly from the DevDebugger panel (without knowing their password), so that I can quickly test the app from different user perspectives during development.

**Español:**
Como desarrollador, necesito poder iniciar sesión como cualquier usuario existente directamente desde el panel DevDebugger (sin conocer su contraseña), para poder probar la aplicación desde distintas perspectivas de usuario durante el desarrollo.

---

## 🧠 Design — Double Security Validation (backend + frontend)

The endpoints and the UI are only available when **both** conditions are met simultaneously. Validation occurs in two independent layers (defense in depth):

### Layer 1 — Backend (source of truth)

| Condition            | Variable                                               | Behavior on failure                              |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Feature flag enabled | `LOGIN_WITH_DEVDEBUG=true`                             | Returns 404 (appears non-existent)               |
| Environment allowed  | `APP_ENV` in `DEV_LOGIN_ALLOWED_ENVIRONMENTS` (csv)    | Returns 404 (appears non-existent)               |
| Safety guard         | `DEV_LOGIN_ALLOWED_ENVIRONMENTS` contains `production` | **Throws exception** — critical misconfiguration |

**Español:** Los endpoints solo están activos si el flag está en `true` **y** el entorno actual está en la lista permitida. Si `production` aparece en esa lista, se lanza una excepción explícita — nunca se silencia.

### Layer 2 — Frontend (avoids unnecessary requests)

The same variables are exposed to the frontend via Vite (`VITE_` prefix). The DevDebugger evaluates both **before** making any API call:

| Vite variable                         | Default       | Purpose                                         |
| ------------------------------------- | ------------- | ----------------------------------------------- |
| `VITE_LOGIN_WITH_DEVDEBUG`            | `false`       | Feature flag — must be exactly `true`           |
| `VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS` | `dev,devtest` | Allowed environments (csv)                      |
| `VITE_APP_ENV`                        | `production`  | Current environment — compared against the list |

If either condition fails on the frontend → the section is not rendered and no API call is made.
The backend remains the source of truth (the 404 is the final safety net).

**Español:** El frontend tiene su propia validación para no hacer llamadas innecesarias. Si cualquiera de las dos condiciones falla, la sección no se renderiza y no se hace ninguna petición a la API.

**Default values in `.env.example` (API):**
```env
LOGIN_WITH_DEVDEBUG=false
DEV_LOGIN_ALLOWED_ENVIRONMENTS=dev,devtest
```

**Default values in `.env.example` (Webapp):**
```env
VITE_LOGIN_WITH_DEVDEBUG=false
VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS=dev,devtest
VITE_APP_ENV=production
```

**Rules:**
- Any value other than exactly `true` in both flags is treated as `false`
- `DEV_LOGIN_ALLOWED_ENVIRONMENTS` is a csv list (`dev,devtest,local`)
- If `production` appears in the backend list → explicit exception, never silenced
- Endpoints return **404** (not 401/403) when disabled — they appear not to exist

---

## ✅ Technical Tasks

### Backend — Dev-only Endpoints

- [x] 🔧 Create reusable `DevLoginGuard` helper encapsulating the double validation:
  - Reads `LOGIN_WITH_DEVDEBUG` — if not exactly `true` → abort with 404
  - Reads `DEV_LOGIN_ALLOWED_ENVIRONMENTS` as csv → if `production` is in the list → throw `RuntimeException`
  - If `APP_ENV` is not in the list → abort with 404
- [x] 🔧 Create endpoint `GET /v1/dev/users` — returns paginated list of users with id, name, email, roles
  - Registered only inside the `if (app()->environment(...))` block in `api.php` (same as `/v1/test/`)
  - Calls the guard at the start of the handler
  - Returns users without passwords or tokens
  - Supports `?search=` (filter by name/email) and `?page=` (pagination)
- [x] 🔧 Create endpoint `POST /v1/dev/login` — receives `{ user_id: int }`, generates Passport token and returns it
  - Calls the guard at the start of the handler
  - Returns 404 if user does not exist
  - Creates OAuth token via `$user->createToken('dev-debug')->accessToken`
  - Returns same structure as `POST /v1/auth/login`

### Backend — Environment Variables

- [x] 📝 Add to `code/api/.env.example`:
  ```env
  LOGIN_WITH_DEVDEBUG=false
  DEV_LOGIN_ALLOWED_ENVIRONMENTS=dev,devtest
  ```
- [ ] 📝 Add to `code/api/.env` (local dev) with `LOGIN_WITH_DEVDEBUG=true`

### Frontend — Environment Variables

- [x] 📝 Add to `code/webapp/.env.example`:
  ```env
  VITE_LOGIN_WITH_DEVDEBUG=false
  VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS=dev,devtest
  VITE_APP_ENV=production
  ```
- [x] 📝 Add to `code/webapp/.env` (local dev):
  ```env
  VITE_LOGIN_WITH_DEVDEBUG=true
  VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS=dev,devtest
  VITE_APP_ENV=dev
  ```
- [x] 🔧 Add `VITE_LOGIN_WITH_DEVDEBUG`, `VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS`, `VITE_APP_ENV` to `src/vite-env.d.ts` with JSDoc

### Frontend — DevDebugger

- [x] 🔧 Create `isDevLoginEnabled()` helper — evaluates `VITE_LOGIN_WITH_DEVDEBUG` and checks `VITE_APP_ENV` is in `VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS`
- [x] 🔧 Add "Dev Login" section to `DevDebugger.tsx` — only visible when `!isAuthenticated && isDevLoginEnabled()`
- [x] 🔧 Create `listDevUsers()` → `GET /v1/dev/users` (returns full user list, no pagination)
- [x] 🔧 Create `loginAs(userId)` → `POST /v1/dev/login`
- [x] 🔧 Section renders: search field + scrollable user list (name + email)
  - Uses `useQuery` from TanStack Query — fetches full list once
  - Search field filters the list **locally** (no backend calls on type)
  - Each item is clickable → calls `loginAs` → stores token in auth store via `initializeAfterReset` → `globalThis.location.reload()`
- [x] 🔧 If endpoint returns 404, section is not shown (silent — no error displayed)
- [x] 🔧 Loading states: skeleton while loading the list, spinner on the item during login
- [ ] 🎨 Each user card shows **role badges** — one colored badge per role, with a distinctive color per role name
- [ ] 🔧 Add **role filter** — a row of toggleable role buttons above the user list; tapping a role shows only users with that role (cumulative with the text search)

### Tests

- [x] ✅ PHPUnit: `GET /v1/dev/users` returns 404 in `production` environment
- [x] ✅ PHPUnit: `GET /v1/dev/users` returns 404 if `LOGIN_WITH_DEVDEBUG` is not `true`
- [x] ✅ PHPUnit: `GET /v1/dev/users` returns full user list when both conditions are met
- [x] ✅ PHPUnit: `POST /v1/dev/login` with valid `user_id` returns a token
- [x] ✅ PHPUnit: `POST /v1/dev/login` with non-existent `user_id` returns 404
- [x] ✅ PHPUnit: `DEV_LOGIN_ALLOWED_ENVIRONMENTS` containing `production` throws exception
- [x] ✅ Vitest: `isDevLoginEnabled()` returns `false` if `VITE_LOGIN_WITH_DEVDEBUG` is not `true`
- [x] ✅ Vitest: `isDevLoginEnabled()` returns `false` if `VITE_APP_ENV` is not in the allowed list

---

## 🎯 Acceptance Criteria

- [ ] Without an active session, DevDebugger shows a search field + scrollable user list
- [ ] Search field filters the list locally (no additional API calls on type)
- [ ] Clicking a user logs in without requiring a password
- [ ] Endpoints return 404 if either condition is not met (backend)
- [ ] Frontend makes no API calls if `isDevLoginEnabled()` is `false`
- [ ] If `production` appears in the allowed environments list → explicit runtime exception
- [ ] Feature is disabled by default (`LOGIN_WITH_DEVDEBUG=false` / `VITE_LOGIN_WITH_DEVDEBUG=false`)
- [ ] Each user card shows a colored badge for each of their roles
- [ ] Role filter row is visible above the list; selecting a role hides users without that role
- [ ] Text search and role filter work cumulatively (AND logic)

---

## 🔗 References

- **Depends on:** none
- **Related to:** `DevDebugger` (`code/webapp/src/components/dev/DevDebugger.tsx`)
- **Reference pattern:** `if (app()->environment(...))` block in `routes/api.php` line 80

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** —

### 📅 Sessions
```json
[]
```
