# 🔐 Implement Authentication API with Advanced Seeder System

## 📖 Story
As a backend developer, I need to implement a complete authentication API with OAuth2 Passport integration and an advanced seeder tracking system, so that users can register, login, and manage their sessions securely, while ensuring database seeders run consistently across environments without duplicating critical data.

---

## ✅ Technical Tasks

### Authentication System
- [x] 🔧 Create `RegisterUser` action for user registration
- [x] 🔧 Create `LoginUser` action for user authentication
- [x] 📂 Implement `RegisterController` with Swagger documentation
- [x] 📂 Implement `LoginController` with Swagger documentation
- [x] 📂 Implement `LogoutController` with token revocation
- [x] 📂 Implement `MeController` for authenticated user info
- [x] 📝 Create `LoginRequest` with validation rules
- [x] 📝 Create `RegisterRequest` with validation rules
- [x] 🔧 Create `AuthTokenResponse` for token responses
- [x] 🔧 Create common response classes (`ResponseEntity`, `ResponseError`, `ResponseMessage`, `ResponsePaginated`)
- [x] 📝 Create `UserResponse` entity schema for Swagger
- [x] 📖 Add OpenAPI documentation to base `Controller` class
- [x] 🔧 Configure OAuth2 security schemes in Swagger

### Seeder Tracking System
- [x] 🗄️ Create `seeder_logs` migration table
- [x] 🔧 Create `SeederLog` model with tracking methods
- [x] 🔧 Create `TrackableSeeder` trait for execution tracking
- [x] 📂 Create base seeder classes:
  - [x] `LockedSeeder` - For critical data that locks after execution
  - [x] `OnceSeeder` - For data that runs once but doesn't lock
  - [x] `RepeatableSeeder` - For data that runs every time
- [x] 🗂️ Create environment-based seeder structure:
  - [x] `Development/DevelopmentSeeder` orchestrator
  - [x] `Development/RoleSeeder` (LockedSeeder)
  - [x] `Development/PermissionSeeder` (LockedSeeder)
  - [x] `Development/UserSeeder` (OnceSeeder)
  - [x] `Development/UserRoleSeeder` (OnceSeeder)
  - [x] `Production/ProductionSeeder` orchestrator
  - [x] `Production/RoleSeeder` (LockedSeeder)
  - [x] `Production/PermissionSeeder` (LockedSeeder)
- [x] ⚙️ Create `config/seeders.php` for centralized configuration
- [x] 🔧 Update `DatabaseSeeder` for environment detection

### Artisan Commands
- [x] 💻 Create `SeedersInfo` command - Display seeder configuration
- [x] 💻 Create `SeederStatus` command - Show execution status with locks
- [x] 💻 Create `SeederLock` command - Manually lock seeders
- [x] 💻 Create `SeederUnlock` command - Manually unlock seeders

### Configuration & Environment
- [x] ⚙️ Add `API_URL` to `.env.example`
- [x] ⚙️ Add Swagger OAuth2 configuration variables
- [x] 🐳 Update Docker `init.sh` to run seeders automatically
- [x] 🐳 Fix typo in Docker config path (cofig → config)
- [x] 🔧 Add Swagger documentation generation to init script

### Documentation
- [x] 📝 Create comprehensive seeder system README
- [x] 📖 Document base classes usage with examples
- [x] 📋 Add comparison table for seeder types
- [x] 📚 Document all Artisan commands
- [x] 📖 Add troubleshooting section

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h`
- **Pessimistic:** `12h`
- **Tracked:** `8h 30m`

### 📅 Sessions
```json
[
  { "date": "2025-11-02", "start": "17:00", "end": "20:30" },
  { "date": "2025-11-02", "start": "22:30", "end": "23:59" },
  { "date": "2025-11-03", "start": "00:00", "end": "01:00" }
]
```

---

## 📋 Implementation Details

### Authentication Flow
1. **Register**: `POST /api/v1/auth/register`
   - Validates name, email, password
   - Creates user with hashed password
   - Generates OAuth2 token
   - Returns token + user data

2. **Login**: `POST /api/v1/auth/login`
   - Validates credentials with Laravel Auth
   - Generates OAuth2 token via Passport
   - Returns token + user data

3. **Logout**: `POST /api/v1/auth/logout`
   - Requires authentication
   - Revokes current access token
   - Returns success message

4. **Me**: `GET /api/v1/auth/me`
   - Requires authentication
   - Returns current user data

### Seeder System Architecture

#### Base Classes
- **LockedSeeder**: Extends `Seeder`, uses `TrackableSeeder` trait
  - `shouldLockAfterExecution()` returns `true`
  - `shouldRunOnce()` returns `true`
  - Use for: Roles, Permissions, Critical Config

- **OnceSeeder**: Extends `Seeder`, uses `TrackableSeeder` trait
  - `shouldLockAfterExecution()` returns `false`
  - `shouldRunOnce()` returns `true`
  - Use for: Users, Initial Data

- **RepeatableSeeder**: Extends `Seeder`, uses `TrackableSeeder` trait
  - `shouldLockAfterExecution()` returns `false`
  - `shouldRunOnce()` returns `false`
  - Use for: Dynamic Data, Updates, Cache

#### Tracking Logic
1. Check if seeder is locked → Skip if locked
2. Check if already executed + `runOnce` → Skip if already run
3. Execute seeder's `run()` method
4. Mark as executed in `seeder_logs` table
5. Lock if `shouldLockAfterExecution()` returns true

#### Environment Detection
- `local`, `development`, `dev`, `testing` → `DevelopmentSeeder`
- `production` → `ProductionSeeder`
- Other → Warning message

### Response Structures

#### Common Responses
- `ResponseEntity`: Standard data response with optional meta
- `ResponseMessage`: Simple message response
- `ResponseError`: Error with optional validation errors
- `ResponsePaginated`: Paginated data with meta (current_page, total, etc.)

#### Auth Specific
- `AuthTokenResponse`: Token + user data

#### Entity Schemas (Swagger Only)
- `UserResponse`: Documentation-only class for OpenAPI schema

### Commands Usage

```bash
# View seeder configuration
php artisan seeders:info

# Check execution status
php artisan seeder:status
php artisan seeder:status --environment=production

# Lock/unlock seeders
php artisan seeder:lock RoleSeeder --notes="Critical data"
php artisan seeder:unlock UserSeeder
php artisan seeder:unlock --all

# Run seeders
php artisan db:seed
php artisan migrate:fresh --seed
```

---

## 🧪 Testing Checklist

- [x] Register new user with valid data
- [x] Register with duplicate email (should fail)
- [x] Login with correct credentials
- [x] Login with wrong credentials (should fail)
- [x] Logout and verify token revocation
- [x] Access `/api/v1/auth/me` with valid token
- [x] Access protected route without token (should fail)
- [x] Run `migrate:fresh --seed` multiple times
- [x] Verify locked seeders skip on second run
- [x] Check `seeder:status` shows correct lock states
- [x] Unlock and re-run a seeder
- [x] Test environment detection (local vs production)
- [x] Verify Swagger documentation displays correctly
- [x] Test OAuth2 login in Swagger UI

---

## 🎯 Success Criteria

- ✅ Users can register, login, and logout via API
- ✅ OAuth2 Passport integration working
- ✅ All endpoints documented in Swagger
- ✅ Swagger UI has embedded login functionality
- ✅ Seeders execute automatically on Docker startup
- ✅ Critical seeders (Roles, Permissions) lock after first execution
- ✅ Development users can be re-seeded without locking
- ✅ Seeder status visible via Artisan command
- ✅ Manual lock/unlock capability available
- ✅ Environment-based seeder execution working
- ✅ No code duplication (DRY principle with base classes)
- ✅ Zero PHPDoc redundancy (using PHP 8.2 type declarations)

---

## 📚 Related Files

### Authentication
- `app/Actions/Auth/RegisterUser.php`
- `app/Actions/Auth/LoginUser.php`
- `app/Http/Controllers/Api/V1/Auth/*Controller.php`
- `app/Http/Requests/Auth/*Request.php`
- `app/Http/Responses/Auth/AuthTokenResponse.php`
- `app/Http/Responses/Common/*.php`
- `app/Http/Responses/Entities/UserResponse.php`

### Seeders
- `database/seeders/Base/*.php`
- `database/seeders/Traits/TrackableSeeder.php`
- `database/seeders/Development/*.php`
- `database/seeders/Production/*.php`
- `database/seeders/DatabaseSeeder.php`
- `database/migrations/2025_11_04_100000_create_seeder_logs_table.php`

### Commands
- `app/Console/Commands/Seeder*.php`
- `app/Console/Commands/SeedersInfo.php`

### Configuration
- `config/seeders.php`
- `.env.example` (API_URL, OAuth2 config)

### Models
- `app/Models/SeederLog.php`

### Docker
- `docker/app/config/dev/init.sh`

---

## 🔗 Dependencies

- Laravel 12.x
- PHP 8.2
- Laravel Passport v13.3
- Spatie Laravel Permission v6.23
- L5-Swagger v9.0
- PostgreSQL 15

---

## 📝 Notes

- All seeders use base classes to reduce boilerplate code
- PHPDoc only used where it adds value (Swagger schemas, complex logic)
- Type declarations preferred over annotations
- Configuration centralized in `config/seeders.php`
- Sensitive data (passwords) in config, not hardcoded
- Docker init script handles migrations + seeders + swagger generation
- Seeder system prevents data duplication in development
- Lock mechanism protects critical data (roles, permissions)

---

## 🚀 Next Steps

- [ ] Add integration tests for authentication flow
- [ ] Implement refresh token functionality
- [ ] Add rate limiting to auth endpoints
- [ ] Create additional seeders for business entities
- [ ] Add email verification flow
- [ ] Implement password reset functionality
- [ ] Add user profile endpoints
- [ ] Create admin panel authentication
