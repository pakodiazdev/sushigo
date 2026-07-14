# 🔧 Task #131: Seeder Passwords — Centralize in Config and Parameterize via Env

## 📖 Story

As a developer, I want seeder passwords to be defined in a single place and overridable via environment variables, so that dev/test credentials are never scattered across multiple files and can be changed without touching source code.

---

## 🧠 Context

Seeder passwords are hardcoded as string literals in multiple files with no single source of truth:

| File | Hardcoded password |
|---|---|
| `database/seeders/Development/EmployeeSeeder.php` (×2) | `'employee123456'` |
| `database/seeders/Testing/CoreTestSeeder.php` (×3) | `'admin123456'`, `'inventory123456'`, `'employee123456'` |
| `database/seeders/Testing/AttendanceTestSeeder.php` | `'employee123456'` |
| `database/seeders/Testing/PayrollPreviewSeeder.php` | `'employee123456'` (found during implementation, not in original issue list) |
| `database/seeders/Production/UserSeeder.php` | `'Admin123!'` |

`Development/UserSeeder.php` already reads credentials from `config/seeders.php` (`development_users` array) — that's the correct pattern being extended here.

---

## 🔧 Implementation

### 1. `config/seeders.php` — add passwords with env fallback

```php
'passwords' => [
    'admin'     => env('SEEDER_ADMIN_PASSWORD',     'admin123456'),
    'employee'  => env('SEEDER_EMPLOYEE_PASSWORD',  'employee123456'),
    'inventory' => env('SEEDER_INVENTORY_PASSWORD', 'inventory123456'),
],
```

### 2. Migrate all hardcoded passwords to read from config

- `Development/EmployeeSeeder.php` → `config('seeders.passwords.employee')`
- `Testing/CoreTestSeeder.php` → `config('seeders.passwords.admin|inventory|employee')`
- `Testing/AttendanceTestSeeder.php` → `config('seeders.passwords.employee')`
- `Testing/PayrollPreviewSeeder.php` → `config('seeders.passwords.employee')`
- `Production/UserSeeder.php` → `config('seeders.passwords.admin')` — **note:** this changes the production default from `'Admin123!'` to `'admin123456'` when `SEEDER_ADMIN_PASSWORD` is unset (confirmed acceptable — single shared `admin` key/env var across all environments)

### 3. Document in `.env.example`

```dotenv
# Seeder credentials (override for custom dev environments)
SEEDER_ADMIN_PASSWORD=admin123456
SEEDER_EMPLOYEE_PASSWORD=employee123456
SEEDER_INVENTORY_PASSWORD=inventory123456
```

---

## ✅ Acceptance Criteria

- [ ] `config/seeders.php` defines the 3 passwords with `env()` and fallback
- [ ] No seeder contains a password as a string literal
- [ ] `.env.example` documents the 3 variables
- [ ] `php artisan db:seed` in dev produces the same result as before
- [ ] `php artisan test` passes with no changes to existing tests
- [ ] Pint passes with 0 errors

---

## 🔗 Additional Context

Detected during code review of PR #130 in `Testing/CoreTestSeeder.php:315` when adding the `manager@sushigo.com` user.

---

## ⏱️ Estimates

- **Optimistic:** `30min` · **Pessimistic:** `1h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30min` · **Pessimistic:** `1h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:11", "end": "?" }
]
```
