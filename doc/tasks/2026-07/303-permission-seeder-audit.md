# 🐛 Task #303: Missing permission definitions in Development/Production seeders

## 📖 Story

**English:**
As a developer, I need every permission string actually checked in code (route middleware, `authorize()` methods, `hasPermissionTo()`) to exist in every environment's permission seeder, so that a permission enforced in the app is never silently unreachable — not even for `admin` — because the seeder for that environment never defined it.

**Español:**
Como desarrollador, necesito que cada permiso que realmente se valida en el código (middleware de rutas, métodos `authorize()`, `hasPermissionTo()`) exista en el seeder de permisos de cada entorno, para que un permiso exigido por la aplicación nunca sea inalcanzable en silencio — ni siquiera para `admin` — porque el seeder de ese entorno nunca lo definió.

---

## 🔍 Root cause

Audited every permission string checked in code against `Development/PermissionSeeder`, `Production/PermissionSeeder`, and `Testing/CoreTestSeeder`. Found two gaps:

- **`attendances.view` / `attendances.create`** — enforced via `permission:attendances.create` middleware on `/negotiated-extra-days` (`routes/api/attendance.php`). Present in `Production` and `Testing`, but entirely absent from `Development` (no definition, no role assignment). In dev-lab, nobody — including `admin`/`manager` — could ever pass this check.
- **`reports.today` / `reports.weekly-summary`** — `reports.weekly-summary` enforced via `WeeklySummaryRequest::authorize()`. Present in `Development` and `Testing`, but entirely absent from `Production`. In production, nobody — including `admin` — could pass this check.

(`reports.today`'s own `TodayReportRequest::authorize()` currently `return true` unconditionally, so it's unenforced everywhere — seeded-but-unused, not a blocking bug, no action needed.)

---

## ✅ Technical Tasks

- [x] 🔐 Add `attendances.view` / `attendances.create` definitions to `Development/PermissionSeeder`, assigned to `admin` and `manager` (matching `attendances.%` in `Production`/`Testing`)
- [x] 🔐 Add `reports.today` / `reports.weekly-summary` definitions to `Production/PermissionSeeder`, assigned to `admin` and `manager` (matching `reports.%` in `Development`/`Testing`)
- [x] 🧪 Static verification: diffed every used permission string against all three seeders — zero gaps remaining
- [x] 🧪 Pint clean

---

## 🎯 Acceptance Criteria

- [x] Every permission string enforced in code exists in all three seeders (Development, Production, Testing)
- [x] `admin` and `manager` roles get `attendances.*` in Development and `reports.*` in Production, matching the pattern already established elsewhere
- [x] No behavior change to permissions/roles not covered by this audit

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` (mechanical audit + two small seeder edits)
- **Pessimistic:** `1h`
- **Tracked:** `0.3h`

### 📅 Sessions
```json
[
  { "date": "2026-07-24", "start": "20:23", "end": "20:40" }
]
```

## 📊 Retrospective
- **Actual total:** ~17m
- **vs optimistic:** −13m under
- **vs pessimistic:** −43m under

**Justification:**

Landed under the optimistic estimate. The audit itself was mechanical (grep every `permission:`/`->can(`/`hasPermissionTo(` usage, diff against each seeder's permission list), and both fixes were small, well-precedented edits (copying the exact pattern already used for the same permission group in the sibling seeder). No test suite changes were needed since these seeders aren't exercised by PHPUnit (Testing uses `CoreTestSeeder`, which already had both permission groups defined correctly).

---

## 🔗 References

- GitHub issue: [#303](https://github.com/pakodiazdev/sushigo/issues/303)
- Surfaced while auditing permission coverage after #275
