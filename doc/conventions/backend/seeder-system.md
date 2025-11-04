# Database Seeders with Tracking & Locking

Advanced seeder system organized by environment with tracking and automatic locking, similar to kuantys-api.

## 📁 Structure

```
database/seeders/
├── DatabaseSeeder.php              # Main seeder that detects environment
├── Base/                           # Base classes for seeders
│   ├── LockedSeeder.php           # Base for locked seeders
│   ├── OnceSeeder.php             # Base for once-run seeders
│   └── RepeatableSeeder.php       # Base for repeatable seeders
├── Traits/
│   └── TrackableSeeder.php        # Trait for tracking and locking
├── Development/                    # Seeders for development/local/testing
│   ├── DevelopmentSeeder.php      # Development seeder orchestrator
│   ├── UserSeeder.php             # Test users (OnceSeeder)
│   ├── RoleSeeder.php             # Development roles (LockedSeeder)
│   ├── PermissionSeeder.php       # Development permissions (LockedSeeder)
│   └── UserRoleSeeder.php         # Role assignment (OnceSeeder)
└── Production/                     # Seeders for production
    ├── ProductionSeeder.php       # Production seeder orchestrator
    ├── RoleSeeder.php             # Essential roles (LockedSeeder)
    └── PermissionSeeder.php       # Production permissions (LockedSeeder)
```

## 📊 Base Classes Comparison

| Base Class | Runs | Locks | Recommended Use |
|------------|------|-------|-----------------|
| `LockedSeeder` | Once | ✅ Yes | Roles, Permissions, Critical Config |
| `OnceSeeder` | Once | ❌ No | Users, Initial Data |
| `RepeatableSeeder` | Always | ❌ No | Dynamic Data, Updates |

### Usage Examples

```php
// 🔒 LOCKED - For critical system data
class RoleSeeder extends LockedSeeder { }          // Runs ONCE, LOCKS
class PermissionSeeder extends LockedSeeder { }    // Runs ONCE, LOCKS

// ✓ ONCE - For initial data
class UserSeeder extends OnceSeeder { }            // Runs ONCE, does NOT lock
class CategorySeeder extends OnceSeeder { }        // Runs ONCE, does NOT lock

// 🔄 REPEATABLE - For updatable data
class StockSeeder extends RepeatableSeeder { }     // Runs ALWAYS
class CacheSeeder extends RepeatableSeeder { }     // Runs ALWAYS
```

## 🔐 Locking System

### Why lock seeders?

In development, some seeders like **Roles** and **Permissions** should only run once. If run multiple times:
- Permissions would duplicate
- Configurations would be overwritten
- Inconsistencies would be generated

The locking system automatically prevents re-execution of critical seeders.

### Seeder Types

#### 🔒 Locked Seeders (`lockAfterExecution = true`)
Run ONCE and lock automatically:
- `RoleSeeder` (Development/Production)
- `PermissionSeeder` (Development/Production)

#### ✅ Unlocked Seeders (`lockAfterExecution = false`)
Can run multiple times (with `runOnce = true` they skip if already executed):
- `UserSeeder`
- `UserRoleSeeder`

### Tracking Table

Seeders are registered in the `seeder_logs` table:

| Field | Description |
|-------|-------------|
| seeder_class | Full class name of the seeder |
| environment | Environment where it ran (local, production, etc.) |
| is_locked | Whether the seeder is locked |
| executed_at | When it was first executed |
| locked_at | When it was locked |
| notes | Optional notes |

## 🚀 Usage

### View seeder information

```bash
# Shows information about available seeders, development users, etc.
php artisan seeders:info
```

### View executed seeder status

```bash
# Shows which seeders have been executed and which are locked
php artisan seeder:status

# Filter by specific environment
php artisan seeder:status --environment=production
```

### Run seeders by environment

The `DatabaseSeeder` automatically detects the environment and runs corresponding seeders:

```bash
# In development (local, development, dev, testing)
# Locked seeders will NOT run again
php artisan db:seed

# In production
php artisan db:seed --env=production

# Force in production
php artisan db:seed --force
```

### Unlock a seeder

```bash
# Unlock a specific seeder
php artisan seeder:unlock RoleSeeder

# Unlock in specific environment
php artisan seeder:unlock RoleSeeder --environment=production

# Unlock ALL seeders (careful!)
php artisan seeder:unlock --all
```

### Lock a seeder

```bash
# Lock a seeder manually
php artisan seeder:lock UserSeeder

# With notes
php artisan seeder:lock UserSeeder --notes="Initial data complete"
```

### Run specific seeders

```bash
# Only development seeders
php artisan db:seed --class=Database\\Seeders\\Development\\DevelopmentSeeder

# Only production seeders
php artisan db:seed --class=Database\\Seeders\\Production\\ProductionSeeder

# Specific seeder (respects locks)
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
```

### Refresh database with seeders

```bash
# Development (runs seeders, respects locks)
php artisan migrate:fresh --seed

# Production (requires --force)
php artisan migrate:fresh --seed --force
```

## 📊 Seeded Data

### Development Environment

#### Users
- **Admin User**
  - Email: `admin@sushigo.com`
  - Password: `admin123456`
  - Role: `super-admin`

- **Demo User**
  - Email: `demo@sushigo.com`
  - Password: `demo123456`
  - Role: `user`

- **Test User**
  - Email: `test@example.com`
  - Password: `password`
  - Role: `user`

- **Random Users**: 10 factory-generated users

#### Roles (🔒 LOCKED)
- `super-admin`: Full system access
- `admin`: User management
- `manager`: Limited management permissions
- `user`: Basic user

#### Permissions (🔒 LOCKED)
- `users.*`: User CRUD
- `roles.*`: Role CRUD
- `permissions.*`: Permission read

### Production Environment

#### Roles (🔒 LOCKED)
- `super-admin`: Full access
- `admin`: Administrator
- `user`: Basic user

#### Permissions (🔒 LOCKED)
Same as development, but without test users.

## 🔧 Create New Seeders with Tracking

### Available Base Classes

To simplify seeder creation, use these base classes according to your needs:

#### 🔒 `LockedSeeder` - Critical Seeders

For seeders that should run **ONCE** and **lock** automatically:

```php
use Database\Seeders\Base\LockedSeeder;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // Runs ONCE
        // LOCKS automatically
        // Ideal for: Roles, Permissions, Initial Configuration
    }
}
```

**Features:**
- ✅ Runs only once
- ✅ Locks automatically after execution
- ✅ Ideal for: Roles, Permissions, Critical Configurations

#### ✓ `OnceSeeder` - Data Seeders

For seeders that should run **ONCE** but **NOT lock**:

```php
use Database\Seeders\Base\OnceSeeder;

class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Runs ONCE
        // Does NOT lock (can be unlocked easily)
        // Ideal for: Users, Initial Data
    }
}
```

**Features:**
- ✅ Runs only once
- ❌ Does not lock (only registered)
- ✅ Ideal for: Users, Test Data, Initial Content

#### 🔄 `RepeatableSeeder` - Dynamic Seeders

For seeders that can run **multiple times**:

```php
use Database\Seeders\Base\RepeatableSeeder;

class DynamicDataSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Runs ALWAYS
        // Does NOT lock
        // Ideal for: Dynamic Data, Updates
    }
}
```

**Features:**
- ✅ Runs each time `db:seed` is called
- ❌ Does not lock
- ✅ Ideal for: Updates, Dynamic Data, Synchronization

### 1. Create the seeder

```bash
php artisan make:seeder Development/ProductSeeder
```

### 2. Choose base class according to need

**Option A: Critical Seeder (locks)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;

class ProductCategorySeeder extends LockedSeeder
{
    public function run(): void
    {
        // Product categories (create only once)
        $this->command->info('✓ Product categories seeded successfully');
    }
}
```

**Option B: Data Seeder (doesn't lock)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\OnceSeeder;

class ProductSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Example products
        $this->command->info('✓ Products seeded successfully');
    }
}
```

**Option C: Repeatable Seeder (always runs)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\RepeatableSeeder;

class ProductStockSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Update product stock
        $this->command->info('✓ Product stock updated successfully');
    }
}
```

### 3. Visual Comparison

```php
// ❌ BEFORE (lots of repetitive code)
class RoleSeeder extends Seeder
{
    use TrackableSeeder;

    protected function shouldLockAfterExecution(): bool { return true; }
    protected function shouldRunOnce(): bool { return true; }

    public function run(): void { /* ... */ }
}

// ✅ NOW (simple and clean)
class RoleSeeder extends LockedSeeder
{
    public function run(): void { /* ... */ }
}
```

**Benefits:**
- ✅ Less boilerplate code
- ✅ Clear intention from base class
- ✅ Easier to maintain
- ✅ Fewer errors

### 4. Register in DevelopmentSeeder

```php
public function run(): void
{
    $this->command->info("🚀 Starting Development Seeders...");
    $this->command->newLine();

    $seeders = [
        RoleSeeder::class,
        PermissionSeeder::class,
        UserSeeder::class,
        UserRoleSeeder::class,
        ProductSeeder::class, // ← New
    ];

    foreach ($seeders as $seederClass) {
        $seeder = new $seederClass();
        $seeder->setCommand($this->command);
        $seeder();
    }

    $this->command->newLine();
    $this->command->info("✅ Development seeders completed!");
}
```

## 🎯 Best Practices

### ✅ DO
- Use `updateOrCreate()` to avoid duplicates
- Separate seeders by entity (User, Role, Permission, etc.)
- **Use `LockedSeeder`** for critical system data (Roles, Permissions, Config)
- **Use `OnceSeeder`** for initial data that can be recreated (Users, Categories)
- **Use `RepeatableSeeder`** for frequently changing data (Stock, Cache)
- Use `command->info()` method for informative messages
- Keep sensitive data out of code (use `config/seeders.php`)
- Order seeders by dependencies (Roles before Permissions)

### 🎨 Base Class Selection Guide

```
Does this seeder modify system structure?
│
├─ YES (Roles, Permissions, Config)
│  └─ Use LockedSeeder 🔒
│
├─ NO, but creates important initial data
│  └─ Use OnceSeeder ✓
│
└─ NO, updates dynamic data
   └─ Use RepeatableSeeder 🔄
```

### ❌ DON'T
- Don't use real production data in development
- Don't mix business logic with seeders
- Don't create millions of records in development seeders
- Don't use seeders for data migrations
- Don't unlock seeders without understanding consequences

## 🔄 Execution Order

Order is important due to dependencies:

1. **RoleSeeder**: Creates roles → 🔒 LOCKS
2. **PermissionSeeder**: Creates permissions and assigns to roles → 🔒 LOCKS
3. **UserSeeder**: Creates users
4. **UserRoleSeeder**: Assigns roles to users

## 🌍 Environment Detection

The system automatically detects environment using `app()->environment()`:

- `production` → Runs `ProductionSeeder`
- `local`, `development`, `dev` → Runs `DevelopmentSeeder`
- `testing` → Runs `DevelopmentSeeder`
- Others → Shows warning

## 🐳 Docker Integration

The `init.sh` script automatically runs:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan seeder:status
```

When starting the project with `docker compose up`, you'll have:
✅ Migrations applied
✅ Seeders executed (respecting locks)
✅ Data ready to use

## 📝 Available Artisan Commands

| Command | Description |
|---------|-------------|
| `seeders:info` | Shows general seeder information |
| `seeder:status` | Shows executed seeder status |
| `seeder:lock {seeder}` | Manually locks a seeder |
| `seeder:unlock {seeder}` | Unlocks a seeder |
| `seeder:unlock --all` | Unlocks all seeders |
| `db:seed` | Runs seeders (respects locks) |
| `db:seed --force` | Runs in production |

## 🔍 Complete Flow Example

```bash
# 1. Start project for first time
docker compose up -d

# Seeders run automatically:
# ✓ RoleSeeder executed and locked
# ✓ PermissionSeeder executed and locked
# ✓ UserSeeder executed
# ✓ UserRoleSeeder executed

# 2. View status
php artisan seeder:status
# RoleSeeder       🔒 Locked
# PermissionSeeder 🔒 Locked
# UserSeeder       ✓ Executed
# UserRoleSeeder   ✓ Executed

# 3. Run seeders again
php artisan db:seed
# ⚠️  Seeder 'RoleSeeder' is locked. Skipping...
# ⚠️  Seeder 'PermissionSeeder' is locked. Skipping...
# ℹ️  Seeder 'UserSeeder' already executed. Skipping...
# ℹ️  Seeder 'UserRoleSeeder' already executed. Skipping...

# 4. Unlock UserSeeder to re-run it
php artisan seeder:unlock UserSeeder
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
# 🌱 Running seeder: UserSeeder
# ✓ User created: admin@sushigo.com
# ...

# 5. Lock UserSeeder again
php artisan seeder:lock UserSeeder --notes="Initial users configured"
```

## 🆘 Troubleshooting

### Problem: "Seeder is locked"
**Solution**: It's intentional. If you need to re-run:
```bash
php artisan seeder:unlock SeederName
```

### Problem: "Seeder already executed"
**Solution**: Seeder has `runOnce = true`. Unlock it or run with `--force`:
```bash
php artisan seeder:unlock SeederName
```

### Problem: Want to reset all seeders
**Solution**:
```bash
php artisan migrate:fresh --seed
# Or unlock all:
php artisan seeder:unlock --all
```

## 📚 Resources

- Configuration: `config/seeders.php`
- Model: `app/Models/SeederLog.php`
- Trait: `database/seeders/Traits/TrackableSeeder.php`
- Commands: `app/Console/Commands/Seeder*.php`

---

**End of Documentation v2.0**
Seeder System with Tracking & Locking successfully implemented! 🎉
