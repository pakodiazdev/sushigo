# 📱 Task #085: Mobile App — Project Bootstrap (Flutter)

## 📖 Story

**English:**
As a developer, I need to set up the mobile application project in Flutter with authentication, navigation, and base components, so the team can build attendance-capture screens on a solid foundation. Initially the app will focus on **attendance operations for the Manager**; it will later evolve into a POS and operational management tool with **Bluetooth ticket printing on Android**.

**Español:**
Como desarrollador, necesito configurar el proyecto de la aplicación móvil en Flutter con autenticación, navegación y componentes base, para que el equipo pueda construir las pantallas de captura de asistencia sobre una base sólida. Inicialmente la app se enfocará en **operaciones de asistencia del Manager**; después evolucionará a POS y herramienta de gestión operativa con **impresión de tickets por Bluetooth en Android**.

> **Por qué Flutter:** Flutter ofrece soporte nativo superior para impresión Bluetooth en Android (packages como `flutter_bluetooth_serial` o `blue_thermal_printer`), que es un requerimiento central del flujo de POS futuro.

---

## ✅ Technical Tasks

### Phase 1: Project Scaffolding

- [ ] 📂 Create Flutter project with Dart: `flutter create --org com.comandaflow sushigo_mobile`
- [ ] 📂 Configure `analysis_options.yaml` (lint rules) and `pubspec.yaml` with environment constraints
- [ ] 📦 Add core dependencies:
  - `go_router` — declarative navigation
  - `flutter_riverpod` — state management (or `bloc` — decide approach)
  - `dio` — HTTP client
  - `flutter_secure_storage` — secure token persistence
  - `shared_preferences` — lightweight local storage
- [ ] 📂 Define folder structure: `lib/{core,features,shared}` following feature-first layout
- [ ] 📝 Create `lib/core/env.dart` — API_BASE_URL config per environment (dev/staging/prod)
- [ ] 📝 Add `README.md` with setup instructions, flutter run commands, Android emulator setup

### Phase 2: API Client & Auth

- [ ] 🔧 Create `lib/core/api_client.dart` — Dio instance with base URL, interceptors (attach Bearer token, handle 401)
- [ ] 🔧 Create auth state/notifier — stores `{ token, user, isAuthenticated }` with `flutter_secure_storage` persistence; exposes `login()` and `logout()`
- [ ] 🔧 Support login via email OR phone + password (matches API `POST /api/v1/login`)
- [ ] 📱 Create `LoginScreen` — email/phone field, password field, submit button, error display, loading indicator
- [ ] 📱 Create auth navigation guard — redirect to Login if unauthenticated (GoRouter `redirect`)

### Phase 3: Navigation & Shell

- [ ] 📱 Configure `go_router` routes: `/login`, `/attendance` (initial protected route)
- [ ] 📱 Create app shell — `AppBar` with branch name, user info, logout action
- [ ] 📱 Create bottom navigation placeholder: **Asistencia**, **Más**
- [ ] 🎨 Define `ThemeData` (colors, typography, spacing) matching webapp palette

### Phase 4: Shared Widgets

- [ ] 🔧 Create `AppButton` widget — primary, secondary, danger variants, loading state
- [ ] 🔧 Create `EmployeeCard` widget — code, name, role chip, active indicator
- [ ] 🔧 Create `StatusBadge` widget — color-coded per DayStatus enum
- [ ] 🔧 Create `LoadingIndicator` and `EmptyState` widgets
- [ ] 🔧 Create `ConfirmDialog` — reusable confirmation bottom sheet

### Phase 5: Types & API Layer

- [ ] 📝 Create Dart model classes: `Employee`, `Attendance`, `DayStatus`, `EmployeeRole` (matching API responses)
- [ ] 🔧 Create `AttendanceRepository` — wraps Dio calls for attendance endpoints

### Phase 6: Dev & Build

- [ ] 🔧 Configure Flutter flavors or `--dart-define` for dev/staging/prod environments
- [ ] 🔧 Verify: app connects to local API via `adb reverse tcp:8080 tcp:8080` (or ngrok tunnel)
- [ ] 🧪 Verify: login flow works against local API
- [ ] 🧪 Verify: token persists across app restarts
- [ ] 🧪 Verify: auth guard redirects unauthenticated users to login

---

## 🎯 Acceptance Criteria

- [ ] Project builds and runs on Android emulator
- [ ] Login with email works; login with phone works
- [ ] Token stored securely, persists on restart
- [ ] Navigation guard redirects unauthenticated users to login
- [ ] Shared widgets render correctly

---

## 🔗 References

- **Depends on:** Task #016 (Employee API), attendance APIs (#031–#035)
- **Tech stack:** Flutter, Dart, GoRouter, Riverpod (or Bloc), Dio, flutter_secure_storage
- **Future Bluetooth deps:** `blue_thermal_printer` / `flutter_bluetooth_serial` (added in POS slice)
- **Priority target platform:** Android (Bluetooth printing); iOS as secondary

---

## ⏱️ Estimates

- **Optimistic:** `8h`
- **Pessimistic:** `14h`
- **Tracked:** ``
