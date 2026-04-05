# Test Data Seeders

Convention for managing seeded data across environments. Defines three seeder categories, their rules, and when to use each.

---

## Seeder Architecture

```
database/seeders/
├── Base/                  # LockedSeeder, OnceSeeder, RepeatableSeeder
├── Production/            # Production-safe seeders (roles, permissions, initial data)
├── Development/           # Full dev experience (config employees + factories + scenarios)
├── Testing/               # Concrete, deterministic data for E2E and PHPUnit
└── Fakes/                 # Volume generators (factories) for dev and testing on demand
```

### Three Categories

| Category | Namespace | Data source | Speed | Used in |
|---|---|---|---|---|
| **Testing** | `Testing/` | Hardcoded concrete values, bulk `DB::table()->insert()` | Fastest (~1-3s total) | Cypress, PHPUnit, CI |
| **Fakes** | `Fakes/` | Factories (`::factory()->count(N)->create()`) | Variable (depends on N) | Dev + Testing on demand |
| **Development** | `Development/` | Config + factories + edge-case scenarios | Slow (~15-30s) | Local dev (`docker compose up`) |

---

## Category 1 — Testing Seeders (`Testing/`)

**Purpose:** Seed the minimum concrete data for E2E and integration tests. Every value is explicit and deterministic so tests can assert against known data.

### Rules

1. **No fakes, no factories, no randomness.** Every value is hardcoded or read from `config/seeders.php`.
2. **Bulk inserts preferred.** Use `DB::table()->insert([...])` with arrays instead of individual `Model::create()` calls. This skips Eloquent events, observers, and accessor overhead.
3. **Hash passwords once.** `Hash::make()` is expensive (~100ms). Call it once, reuse the hash for all users in the same seeder.
4. **Generate ULIDs manually** when bypassing Eloquent (since the `HasPublicId` trait fires on the `creating` event). Use `Str::ulid()->toBase32()`.
5. **No idempotency checks.** Testing seeders always run after `TRUNCATE` (via `test:reset`), so `updateOrCreate`, `firstOrCreate`, and existence checks are unnecessary overhead.
6. **No base class inheritance.** Testing seeders extend plain `Illuminate\Database\Seeder` — they don't use `LockedSeeder`, `OnceSeeder`, or `TrackableSeeder` because there's no `seeder_logs` table after truncation.
7. **Spatie roles via direct insert.** Instead of `$user->assignRole('cook')`, insert directly into `model_has_roles` with the known role ID.

### Structure

```
Testing/
├── CoreTestSeeder.php          # Passport clients, roles, permissions, branch, units, system users
├── AttendanceTestSeeder.php    # 8 employees + 2 admin profiles, schedules
├── InventoryTestSeeder.php     # Items, variants, locations, opening stock (future)
└── CashTestSeeder.php          # Cash registers, terminals, sessions (future)
```

### Registration

Testing seeders are registered in `TestReset.php` as groups:

```php
private array $seederGroups = [
    'core'       => [CoreTestSeeder::class],
    'attendance' => [AttendanceTestSeeder::class],
    'inventory'  => [InventoryTestSeeder::class],  // future
    'cash'       => [CashTestSeeder::class],        // future
];
```

`core` always runs first. Additional groups are requested via `--seeders=attendance,inventory`.

### Cypress Usage

```typescript
// Core only (login, home specs)
before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

// Core + attendance (attendance, employees specs)
before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// Core + multiple groups
before(() => {
  cy.task('test:reset', 'attendance,inventory', { timeout: 60_000 })
})
```

### Example: Bulk Insert Pattern

```php
// BAD — 8 individual INSERTs + 8 Eloquent event chains
foreach ($employees as $emp) {
    User::create([...]);
}

// GOOD — 1 bulk INSERT, no events
$rows = [];
foreach ($employees as $emp) {
    $rows[] = [
        'name' => $emp['first_name'] . ' ' . $emp['last_name'],
        'email' => $emp['email'],
        'password' => $hashedPassword,  // computed once
        'public_id' => Str::ulid()->toBase32(),
        'email_verified_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ];
}
DB::table('users')->insert($rows);
```

---

## Category 2 — Fakes Seeders (`Fakes/`)

**Purpose:** Generate N records of a given entity using factories. Used when a test or dev scenario needs volume (e.g., pagination, performance, list views with many rows).

### Rules

1. **Always use factories.** Fakes seeders exist to leverage `::factory()->count(N)->create()`.
2. **Configurable count.** Accept the quantity as a parameter or read from `config/seeders.php` under `factory_counts`.
3. **Usable in both dev and testing.** A dev scenario might call the same Fakes seeder as a Cypress spec that tests pagination.
4. **Depend on Testing seeders.** Fakes seeders assume the base data (branch, roles, units) already exists. They are called AFTER the Testing seeders, never standalone.
5. **Registered as `test:reset` groups** with the `fakes-` prefix.

### Structure

```
Fakes/
├── FakeUsersSeeder.php         # N random users with roles
├── FakeEmployeesSeeder.php     # N random employees with schedules
├── FakeItemsSeeder.php         # N random items + variants (future)
└── FakeAttendancesSeeder.php   # N days of attendance records (future)
```

### Registration

```php
private array $seederGroups = [
    'core'            => [CoreTestSeeder::class],
    'attendance'      => [AttendanceTestSeeder::class],
    'fakes-users'     => [FakeUsersSeeder::class],
    'fakes-employees' => [FakeEmployeesSeeder::class],
];
```

### Usage

```bash
# Dev: fill DB with volume data for manual testing
php artisan test:reset --seeders=attendance,fakes-employees

# Cypress: test pagination with many employees
cy.task('test:reset', 'attendance,fakes-employees')
```

---

## Category 3 — Development Seeders (`Development/`)

**Purpose:** Full-featured data setup for the local development experience. Includes config employees, factory randoms, edge-case scenarios (re-hires, terminated employees, audit logs), and realistic timestamps.

### Rules

1. **Use `CreateEmployeeAction`** and other Actions — dev seeders exercise the real application flow including events, notifications (caught by Mailhog), and observers.
2. **Use base classes** (`OnceSeeder`, `LockedSeeder`, `RepeatableSeeder`) with tracking and locking.
3. **Include edge-case scenarios** (employees with multiple employment periods, terminated employees, audit log entries) that make the dev experience realistic.
4. **Registered in `DevelopmentSeeder`** and invoked via `php artisan db:seed` or `migrate:fresh --seed`.
5. **Never called from Cypress** — too slow and too much data.

---

## Decision Matrix

| I need to... | Use |
|---|---|
| Run Cypress E2E tests | `Testing/` via `test:reset` |
| Run PHPUnit tests that need seeded data | `Testing/` via `test:reset` or per-test setup |
| Test pagination / large lists in Cypress | `Testing/` + `Fakes/` via `test:reset --seeders=...,fakes-employees` |
| Develop locally with realistic data | `Development/` via `migrate:fresh --seed` |
| Fill dev DB with volume for manual testing | `Development/` first, then `Fakes/` on demand |
| Add a new domain (e.g., Inventory) | Create `Testing/InventoryTestSeeder` + optionally `Fakes/FakeItemsSeeder` |

---

## Naming Convention

| Category | File pattern | Example |
|---|---|---|
| Testing | `{Domain}TestSeeder.php` | `AttendanceTestSeeder.php` |
| Fakes | `Fake{Entity}Seeder.php` | `FakeEmployeesSeeder.php` |
| Development | `{Entity}Seeder.php` | `EmployeeSeeder.php` |

---

## Performance Targets

| Scenario | Target | Mechanism |
|---|---|---|
| `test:reset` (core only) | < 2s | Truncate + bulk inserts |
| `test:reset --seeders=attendance` | < 3s | Truncate + bulk inserts |
| `test:reset --seeders=attendance,fakes-employees` | < 5s | Truncate + bulk inserts + factories |
| `migrate:fresh --seed` (development) | < 30s | Full schema rebuild + Actions + factories |
