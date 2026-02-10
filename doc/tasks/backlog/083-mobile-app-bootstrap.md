````markdown
# 📱 Task #083: Mobile App — Project Bootstrap

## 📖 Story

**English:**
As a developer, I need to set up the mobile application project (React Native / Expo) with authentication, navigation, and base components, so the team can build attendance-capture screens on a solid foundation. Initially the app will focus on **attendance operations for the Manager**; it will later evolve into a POS and operational management tool.

**Español:**
Como desarrollador, necesito configurar el proyecto de la aplicación móvil (React Native / Expo) con autenticación, navegación y componentes base, para que el equipo pueda construir las pantallas de captura de asistencia sobre una base sólida. Inicialmente la app se enfocará en **operaciones de asistencia del Manager**; después evolucionará a POS y herramienta de gestión operativa.

---

## ✅ Technical Tasks

### Phase 1: Project Scaffolding

- [ ] 📂 Initialize Expo project with TypeScript template (`npx create-expo-app@latest`)
- [ ] 📂 Configure `tsconfig.json` path aliases (`@/` → `src/`)
- [ ] 📦 Install core dependencies: `expo-router`, `@tanstack/react-query`, `zustand`, `axios`, `expo-secure-store`
- [ ] 📦 Install UI dependencies: `nativewind` (TailwindCSS for RN) or `tamagui` — decide styling approach
- [ ] 📂 Define folder structure: `src/{components,screens,services,stores,hooks,types,lib,navigation}`
- [ ] 📝 Create `.env` / `app.config.ts` with `API_BASE_URL` variable
- [ ] 📝 Add `README.md` with setup instructions, run commands

### Phase 2: API Client & Auth

- [ ] 🔧 Create `src/lib/api-client.ts` — Axios instance with base URL, interceptors (attach Bearer token, handle 401)
- [ ] 🔧 Create `src/stores/auth.store.ts` — Zustand store with `expo-secure-store` persistence: `{ token, user, isAuthenticated, login(), logout() }`
- [ ] 🔧 Support login via email OR phone + password (matches API `POST /api/v1/login`)
- [ ] 📱 Create `LoginScreen` — email/phone input, password input, submit button, error display, loading state
- [ ] 📱 Create auth navigation guard — redirect to Login if unauthenticated

### Phase 3: Navigation & Shell

- [ ] 📱 Configure `expo-router` file-based routing: `(auth)/login`, `(app)/_layout`, `(app)/index`
- [ ] 📱 Create app shell/layout — header with branch name, user info, logout button
- [ ] 📱 Create bottom tab navigation placeholder: **Asistencia** (attendance), **Más** (more/settings)
- [ ] 🎨 Define color tokens, typography, spacing constants matching webapp theme

### Phase 4: Shared Components

- [ ] 🔧 Create `<Button>` component — primary, secondary, danger variants, loading state
- [ ] 🔧 Create `<Card>` component — employee card base
- [ ] 🔧 Create `<Badge>` component — status badges (on time, late, absent, etc.)
- [ ] 🔧 Create `<LoadingSpinner>` and `<EmptyState>` components
- [ ] 🔧 Create `<Toast>` notification system (success, error)
- [ ] 🔧 Create `<ConfirmModal>` reusable confirmation dialog

### Phase 5: Types & API Hooks

- [ ] 📝 Create shared TypeScript types: `Employee`, `Attendance`, `DayStatus`, `EmployeeRole` (mirroring API)
- [ ] 🔧 Create `useApiQuery` / `useApiMutation` wrappers around `@tanstack/react-query`
- [ ] 🔧 Create `src/services/attendance.service.ts` — API functions for attendance endpoints

### Phase 6: Dev & Build

- [ ] 🔧 Configure ESLint + Prettier for mobile project
- [ ] 🔧 Configure Expo build profiles (development, preview, production) in `eas.json`
- [ ] 🧪 Verify: login flow works against local API (via `adb reverse` or tunnel)
- [ ] 🧪 Verify: authenticated navigation guard works
- [ ] 🧪 Verify: token persists across app restarts

---

## 🎯 Acceptance Criteria

- [ ] Project builds and runs on Android emulator / iOS simulator
- [ ] Login with email works, login with phone works
- [ ] Token stored securely, persists on restart
- [ ] Navigation guard redirects unauthenticated users to login
- [ ] Shared components render correctly
- [ ] API client attaches token and handles 401 logout

---

## 🔗 References

- **Depends on:** Task #016 (Employee API), #026–#032 (Attendance APIs)
- **Tech stack:** React Native, Expo, TypeScript, Zustand, TanStack Query, Axios
- Webapp patterns: `code/webapp/src/stores/auth.store.ts`, `code/webapp/src/lib/api-client.ts`

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `8h`
- **Pessimistic:** `14h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
````
