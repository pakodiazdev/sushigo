# API Project Rules & Conventions

Rules and conventions established for the sushigo-api project.

## 📋 Table of Contents

- [Documentation](#documentation)
- [Code](#code)
- [File Structure](#file-structure)
- [Seeders](#seeders)
- [Swagger/OpenAPI](#swaggeropenapi)
- [Configuration](#configuration)
- [API Response Standards](#api-response-standards)

---

## 📚 Documentation

### PHPDoc

**❌ DO NOT use PHPDoc when PHP typing is sufficient:**

```php
// ❌ BAD - Redundant PHPDoc
/**
 * Get the user's name.
 * @return string
 */
public function getName(): string
{
    return $this->name;
}

// ✅ GOOD - Strong typing without PHPDoc
public function getName(): string
{
    return $this->name;
}
```

**✅ USE PHPDoc only when it adds value:**

```php
// ✅ GOOD - Documents complex logic or business context
/**
 * Calculate user discount based on loyalty points and purchase history.
 * Applies tier-based discounts: Bronze (5%), Silver (10%), Gold (15%)
 */
public function calculateDiscount(User $user): float
{
    // ...
}
```

### Class Properties

**Use strong typing instead of annotations:**

```php
// ❌ BAD
/**
 * @var string
 */
protected $signature = 'command:name';

// ✅ GOOD
protected string $signature = 'command:name';

// ⚠️ ACCEPTABLE - When direct typing is not possible
protected $fillable = ['name', 'email'];
protected $casts = ['is_active' => 'boolean'];
```

### Inline Comments

**Avoid obvious or superfluous comments:**

```php
// ❌ BAD - Comments that repeat the code
// Create roles
$roles = ['admin', 'user'];

// Assign permissions
$role->syncPermissions($permissions);

// ✅ GOOD - No superfluous comments
$roles = ['admin', 'user'];
$role->syncPermissions($permissions);

// ✅ GOOD - Comment adds context
// Prevent race condition when multiple workers process the same job
$this->lock()->get();
```

---

## 💻 Code

### Typing

**Always use strong typing in PHP 8.2:**

```php
// ✅ Typed parameters and returns
public function createUser(string $name, string $email): User
{
    return User::create(['name' => $name, 'email' => $email]);
}

// ✅ Typed properties
protected string $table = 'users';
protected array $fillable = ['name', 'email'];

// ✅ Explicit nullable types
public function findUser(?int $id): ?User
{
    return $id ? User::find($id) : null;
}
```

### Laravel Best Practices

```php
// ✅ Use updateOrCreate to avoid duplicates
Role::updateOrCreate(
    ['name' => $roleName, 'guard_name' => 'api'],
    ['description' => 'Role description']
);

// ✅ Use descriptive methods
public function isAdmin(): bool
{
    return $this->hasRole('admin');
}

// ✅ Avoid business logic in controllers
// Use Services, Actions or Domain Logic
```

---

## 📁 File Structure

### Responses vs Resources

**Entity Responses (Swagger/OpenAPI Only):**

```
app/Http/Responses/Entities/
├── UserResponse.php
├── RoleResponse.php
└── PermissionResponse.php
```

These classes are **documentation only** for Swagger, contain no logic:

```php
/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     type="object"
 * )
 */
class UserResponse
{
    /**
     * @OA\Property(type="integer")
     */
    public int $id;

    /**
     * @OA\Property(type="string")
     */
    public string $name;
}
```

**Resources (Transform Data):**

```
app/Http/Resources/
├── UserResource.php
├── UserCollection.php
└── RoleResource.php
```

These classes transform models to JSON:

```php
class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }
}
```

### Naming Conventions

```
✅ Controllers: UserController, AuthController
✅ Models: User, Role, Permission
✅ Seeders: UserSeeder, RoleSeeder
✅ Commands: SeederLock, SeederUnlock (no Command suffix)
✅ Responses: UserResponse, RoleResponse
✅ Resources: UserResource, UserCollection
```

---

## 🌱 Seeders

### Base Classes System

**Use base classes according to purpose:**

```php
// 🔒 LockedSeeder - Critical data that gets locked
class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // Runs ONCE and LOCKS automatically
        Role::updateOrCreate(['name' => 'admin'], ['guard_name' => 'api']);
    }
}

// ✓ OnceSeeder - Initial data that doesn't lock
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Runs ONCE but does NOT lock
        User::factory(10)->create();
    }
}

// 🔄 RepeatableSeeder - Dynamic data
class CacheSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Runs ALWAYS
        Cache::flush();
    }
}
```

### Selection Guide

```
Does it modify system structure? (Roles, Permissions, Config)
└─ Use LockedSeeder 🔒

Does it create important initial data? (Users, Categories)
└─ Use OnceSeeder ✓

Does it update dynamic data? (Stock, Cache, Sync)
└─ Use RepeatableSeeder 🔄
```

### Best Practices

```php
// ✅ DO
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $users = config('seeders.development_users', []);

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}

// ❌ DON'T
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Don't use hardcoded sensitive data
        User::create([
            'email' => 'admin@example.com',
            'password' => 'password123', // ❌
        ]);

        // Don't mix business logic
        $user = User::first();
        $user->sendWelcomeEmail(); // ❌
    }
}
```

---

## 📖 Swagger/OpenAPI

### URL Configuration

**Use environment variables:**

```php
// config/l5-swagger.php
'servers' => [
    [
        'url' => env('API_URL', env('APP_URL', 'http://localhost:8080')),
        'description' => 'API Server',
    ],
],
```

```bash
# .env
API_URL=http://localhost:8080
```

### Entity Responses

**Document in dedicated folder:**

```php
namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     type="object",
 *     title="User Response"
 * )
 */
class UserResponse
{
    /**
     * @OA\Property(type="integer", example=1)
     */
    public int $id;

    /**
     * @OA\Property(type="string", example="John Doe")
     */
    public string $name;
}
```

### Controller Documentation

```php
/**
 * @OA\Get(
 *     path="/api/users/{id}",
 *     tags={"Users"},
 *     summary="Get user by ID",
 *     @OA\Response(
 *         response=200,
 *         ref="#/components/schemas/UserResponse"
 *     )
 * )
 */
public function show(int $id): JsonResponse
{
    return response()->json(User::findOrFail($id));
}
```

### UI Customizations

**Interface adjustments in `resources/views/vendor/l5-swagger/index.blade.php`:**

```css
/* Login button position */
.custom-login-button {
    top: 70px; /* Avoid overlap with definition selector */
}
```

---

## ⚙️ Configuration

### Configuration Files

**Centralize configurations:**

```php
// config/seeders.php
return [
    'environments' => [
        'local' => DevelopmentSeeder::class,
        'development' => DevelopmentSeeder::class,
        'production' => ProductionSeeder::class,
    ],

    'development_users' => [
        [
            'name' => 'Admin User',
            'email' => 'admin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'super-admin',
        ],
    ],
];
```

### Environment Variables

**Required variables:**

```bash
# .env

# Application
APP_NAME=SushiGo
APP_ENV=local
APP_URL=http://localhost:8080

# API
API_URL=http://localhost:8080

# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=sushigo
DB_USERNAME=postgres
DB_PASSWORD=secret

# Laravel Passport
PASSPORT_PRIVATE_KEY=...
PASSPORT_PUBLIC_KEY=...
```

---

## 🐳 Docker

### Structure

```
docker/
├── dev/
│   ├── Dockerfile
│   └── config/          # ✅ CORRECT (not "cofig")
│       ├── dev/
│       │   └── init.sh
│       └── prod/
└── prod/
```

### Init Script

**The `init.sh` script should:**

```bash
#!/bin/bash

# 1. Apply migrations
php artisan migrate --force

# 2. Run seeders (respects locks)
php artisan db:seed --force

# 3. Show seeder status
php artisan seeder:status

# 4. Generate Swagger documentation
php artisan l5-swagger:generate
```

---

## 🕐 DateTime Standard (UTC + RFC 3339)

All datetime handling in the project follows the **UTC-first** pattern used by Google, GitHub, Stripe, and AWS APIs.

### Three Golden Rules

| Rule | Description |
|------|-------------|
| **Storage = UTC** | The database always stores datetimes in UTC. `config/app.timezone = 'UTC'`. No exceptions. |
| **Transport = ISO 8601 with offset** | The API accepts/returns datetimes with explicit timezone offset (RFC 3339). Never naive (without timezone). |
| **Display = client responsibility** | The frontend/app converts UTC to the user's local timezone for display. The server never formats for display. |

### API Request Format

Datetime fields must be sent as **ISO 8601 / RFC 3339** with explicit timezone offset:

```
✅ 2026-02-23T09:05:30-06:00    (local time + offset)
✅ 2026-02-23T15:05:30Z          (UTC with Z suffix)
✅ 2026-02-23T15:05:30+00:00     (UTC with explicit offset)
✅ 2026-02-23T09:05:30            (naive — backward compatible, interpreted as UTC)
```

### Backend: Normalizing to UTC

Every Action that receives a datetime from the client must normalize to UTC before storing:

```php
// ✅ GOOD — Normalize to UTC
$checkIn = Carbon::parse($data['check_in'])->utc();

// ❌ BAD — Assumes timezone based on app config
$checkIn = Carbon::parse($data['check_in']);
```

### Backend: Validation Rules

Use Laravel's `date` rule (accepts any parseable datetime, including offsets):

```php
// ✅ GOOD — Accepts RFC 3339 with offset
'check_in' => ['required', 'date'],

// ❌ BAD — Rejects timezone offset
'check_in' => ['required', 'date_format:Y-m-d\TH:i:s'],
```

### Backend: Response Format

Always return datetimes as ISO 8601 UTC. Carbon's `toIso8601String()` produces `+00:00` suffix:

```php
// ✅ GOOD — Returns UTC ISO 8601
'check_in' => $attendance->check_in?->toIso8601String(),
// Output: "2026-02-23T15:05:30+00:00"
```

### Frontend: Sending Datetimes

Send the browser's local time with timezone offset (RFC 3339):

```typescript
// ✅ GOOD — ISO 8601 with offset
function nowIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOff = Math.abs(offset)
  const oh = pad(Math.floor(absOff / 60))
  const om = pad(absOff % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`
}
// Output in Mexico City (UTC-6): "2026-02-23T09:05:30-06:00"
```

### Frontend: Displaying Datetimes

Parse UTC from the API and display using browser's local timezone:

```typescript
// ✅ GOOD — Converts UTC → local for display
export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso) // Parses UTC, getHours() returns local
  if (isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// ❌ BAD — Extracts time directly from UTC string (shows UTC, not local)
const timePart = iso.split('T')[1]?.slice(0, 5)
```

### Seeders: Timezone Conversion

Development seeders define human-readable local times but convert to UTC on insert:

```php
private const TIMEZONE    = 'America/Mexico_City';
private const SHIFT_START = '13:00:00'; // 1 PM CDT → 19:00 UTC

private function toUtcTime(string $localTime): string
{
    return Carbon::parse($localTime, self::TIMEZONE)
        ->utc()
        ->format('H:i:s');
}
```

### Cross-Midnight Shifts

When schedule times are in UTC, shifts may cross midnight (e.g., `19:00→04:00 UTC`).
The `expected_end` comparison must detect and handle this:

```php
$expectedEnd = Carbon::parse($scheduleDay->expected_end)
    ->setDateFrom($attendance->date);

// Cross-midnight: expected_end < expected_start means next day
if ($scheduleDay->expected_start
    && $scheduleDay->expected_end < $scheduleDay->expected_start) {
    $expectedEnd->addDay();
}
```

### Summary Flow

```
Frontend (Mexico City, UTC-6)
│
│  User clicks "Check-in" at 9:05 AM local
│  → sends: "2026-02-23T09:05:30-06:00"
│
▼ API Request (RFC 3339 with offset)
│
Backend (UTC)
│  Carbon::parse("2026-02-23T09:05:30-06:00")->utc()
│  → stores: "2026-02-23 15:05:30 UTC"
│
▼ API Response (ISO 8601 UTC)
│  → returns: "2026-02-23T15:05:30+00:00"
│
Frontend (display)
│  new Date("2026-02-23T15:05:30+00:00").getHours()
│  → shows: "09:05" (local time)
```

---

## 📊 Available Artisan Commands

### Seeders

```bash
# General information
php artisan seeders:info

# Execution status
php artisan seeder:status
php artisan seeder:status --environment=production

# Lock/Unlock
php artisan seeder:lock RoleSeeder --notes="Critical data"
php artisan seeder:unlock UserSeeder
php artisan seeder:unlock --all

# Run seeders
php artisan db:seed
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
php artisan migrate:fresh --seed
```

### Swagger

```bash
# Generate documentation
php artisan l5-swagger:generate

# View documentation
# http://localhost:8080/api/documentation
```

---

## ✅ New Features Checklist

### Before Commit

- [ ] Remove unnecessary PHPDoc (use strong typing)
- [ ] Remove superfluous comments
- [ ] Use `updateOrCreate` in seeders to avoid duplicates
- [ ] Configure seeders with appropriate base class (Locked/Once/Repeatable)
- [ ] Document endpoints in Swagger if public API
- [ ] Use Entity Responses for Swagger schemas
- [ ] Configuration in `.php` files, not hardcoded
- [ ] Sensitive variables in `.env`

### Testing

- [ ] Test seeders: `php artisan migrate:fresh --seed`
- [ ] Verify locks: `php artisan seeder:status`
- [ ] Generate Swagger: `php artisan l5-swagger:generate`
- [ ] Verify types with static analysis (if applicable)

---

## 🚫 Anti-Patterns

### Avoid

```php
// ❌ Redundant PHPDoc with typing
/**
 * @var string
 */
protected $name;

// ❌ Obvious comments
// Get all users
$users = User::all();

// ❌ Business logic in controllers
public function store(Request $request)
{
    $user = new User();
    $user->name = $request->name;
    $user->calculateDiscount(); // ❌
    $user->sendEmail(); // ❌
    $user->save();
}

// ❌ Hardcoded sensitive data
$password = 'admin123'; // ❌

// ❌ Seeders without tracking
class RoleSeeder extends Seeder // ❌ Use base classes
{
    public function run(): void
    {
        Role::create(['name' => 'admin']);
    }
}
```

### Prefer

```php
// ✅ Strong typing without PHPDoc
protected string $name;

// ✅ Self-explanatory code
$users = User::all();

// ✅ Logic in Services/Actions
public function store(StoreUserRequest $request)
{
    return $this->userService->createUser($request->validated());
}

// ✅ Configuration in files
$users = config('seeders.development_users');

// ✅ Seeders with tracking
class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        Role::updateOrCreate(['name' => 'admin'], []);
    }
}
```

---

## � API Response Standards

### ResponseEntity

All API endpoints must use `ResponseEntity` for consistent response structure.

**Response format:**
```json
{
  "status": 200,
  "data": { ... },
  "meta": null
}
```

### Returning Single Entities

For single entity responses, pass the model as an associative array:

```php
// ✅ GOOD - Single entity
return new ResponseEntity(data: $employee->toArray());

// Response:
// { "status": 200, "data": { "id": "...", "name": "..." }, "meta": null }
```

### Returning Lists/Collections

**⚠️ IMPORTANT: Always wrap arrays in an associative key**

`ResponseEntity` converts `data` to `(object)`, which breaks indexed arrays. For list endpoints, wrap the array in a named key:

```php
// ❌ BAD - This breaks the array structure
$wages = $employee->wageHistories()->get()->toArray();
return new ResponseEntity(data: $wages);
// Result: { "data": { "0": {...}, "1": {...} } } ← Object, not array!

// ✅ GOOD - Wrap in a named key
$wages = $employee->wageHistories()->get()->toArray();
return new ResponseEntity(data: ['wages' => $wages]);
// Result: { "data": { "wages": [{...}, {...}] } } ← Correct array
```

**Frontend must access the wrapped key:**
```typescript
// Frontend hook
const response = await employeeApi.listWages(employeeId);
return response.data.data.wages; // Access the wrapped array
```

### Standard List Response Keys

Use plural, snake_case keys for lists:

| Entity    | Key         |
| --------- | ----------- |
| Employees | `employees` |
| Wages     | `wages`     |
| Periods   | `periods`   |
| Items     | `items`     |

---

## �📚 References

- Laravel Documentation: https://laravel.com/docs
- PSR-12 Coding Standard: https://www.php-fig.org/psr/psr-12/
- OpenAPI Specification: https://swagger.io/specification/
- Laravel Spatie Permissions: https://spatie.be/docs/laravel-permission
- L5-Swagger: https://github.com/DarkaOnLine/L5-Swagger

---

**Last updated:** November 4, 2025
**Version:** 1.0
**Project:** sushigo-api (Laravel 12.x + PHP 8.2)
