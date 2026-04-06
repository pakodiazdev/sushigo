# Test Environment Services

Convention for replacing external service dependencies in testing and development environments. Defines how to decouple tests from infrastructure services like Mailhog, Redis queues, or third-party APIs.

**Status:** ✅ Implemented (Task #090)

---

## Guiding Principle

> **Tests must not depend on infrastructure services that are not the system under test.**

A Cypress spec that tests "employee creation + password reset + first login" is testing the **application flow**, not Mailhog. If Mailhog is down, slow, or misconfigured, the test fails for the wrong reason.

**Strategy:** Replace external service calls with deterministic, in-process alternatives in testing (and optionally in development).

---

## Pattern: Environment-Aware Service Resolution

Laravel's service container + environment detection gives us clean dependency injection per environment:

```php
// AppServiceProvider::register()
use App\Contracts\PasswordResetTokenRecorder;
use App\Services\Testing\FileTokenRecorder;
use App\Services\Testing\NullTokenRecorder;

if ($this->app->environment('testing', 'local', 'dev', 'devtest')) {
    $this->app->singleton(PasswordResetTokenRecorder::class, FileTokenRecorder::class);
} else {
    $this->app->singleton(PasswordResetTokenRecorder::class, NullTokenRecorder::class);
}
```

This keeps production code untouched while giving tests fast, reliable alternatives.

---

## Implemented: Password Reset Link (Mailhog Replacement)

### Problem Solved

The `employees.cy.ts` spec previously depended on Mailhog to retrieve password reset links:
1. Creates an employee via UI (triggers welcome email with password reset link)
2. Called `cy.task('mailhog:getResetLink', email)` to scrape the link from Mailhog's API
3. Visits the reset link, sets a password, then logs in

**Failure modes eliminated:**
- Mailhog not running → test fails
- Email delivery delayed → flaky timing
- Mailhog API format changes → parser breaks
- CI without Mailhog → impossible

### Implementation

#### Interface — `app/Contracts/PasswordResetTokenRecorder.php`

```php
interface PasswordResetTokenRecorder
{
    public function record(string $email, string $resetLink): void;
    public function retrieve(string $email): ?string;
    public function clear(): void;
}
```

#### Production — `app/Services/Testing/NullTokenRecorder.php`

No-op implementation. Email is the delivery channel in production.

#### Testing/Dev — `app/Services/Testing/FileTokenRecorder.php`

Writes reset links to `storage/testing/reset-links/{email}.txt`. Instant and deterministic.

#### Hook Point — `app/Actions/Auth/ForgotPasswordAction.php`

The `PasswordResetTokenRecorder` is injected as a constructor dependency. After `generateResetLink()` creates the reset URL, it calls `$this->tokenRecorder->record($email, $resetUrl)`. This is the single point that serves both forgot-password and welcome-employee flows.

#### Cypress Task — `cypress.config.ts`

```typescript
'test:getResetLink': (email: string) => {
  // Uses artisan tinker to call FileTokenRecorder->retrieve() directly
  const result = execSync(
    `docker exec ${CONTAINER} php /app/code/api/artisan tinker --execute="echo app(App\\\\Contracts\\\\PasswordResetTokenRecorder::class)->retrieve('${email}') ?? 'NULL';"`,
    { timeout: 10_000, encoding: 'utf-8' }
  ).trim()
  if (result === 'NULL' || !result) return null
  return result
}
```

#### Cypress Spec — `employees.cy.ts`

```typescript
// Uses FileTokenRecorder — no Mailhog dependency, instant response
cy.task<string | null>('test:getResetLink', email, { timeout: 10_000 })
```

#### Cleanup — `test:reset` command

`TestReset::clearTestArtifacts()` calls `app(PasswordResetTokenRecorder::class)->clear()` after truncating tables, which deletes the `storage/testing/reset-links/` directory.

---

## General Pattern for Other Services

### When to apply

Apply this pattern whenever a test depends on an external service that:
- Can be unavailable (Mailhog, Redis, S3, third-party API)
- Introduces timing/flakiness (email delivery, queue processing)
- Is expensive to set up in CI

### How to apply

1. **Define an interface** in `app/Contracts/` for the service interaction
2. **Create a production implementation** (typically a no-op or real service call)
3. **Create a test implementation** in `app/Services/Testing/` using a fast, deterministic alternative (file, in-memory, direct DB)
4. **Bind in `AppServiceProvider::register()`** based on `app()->environment()`
5. **Hook into the action/notification** that generates the data (constructor DI)
6. **Create a Cypress task** that retrieves the data via artisan tinker or test-only API endpoint
7. **Add cleanup** to `TestReset::clearTestArtifacts()`

### Service Replacement Table

| External Service | Production Impl | Test Impl | Test Access | Status |
|---|---|---|---|---|
| **Email (Mailhog)** | `NullTokenRecorder` | `FileTokenRecorder` | `cy.task('test:getResetLink')` | ✅ Implemented |
| **SMS** | Twilio/SNS gateway | `FileSmsRecorder` | `cy.task('test:getSmsLink')` | 🔮 Future |
| **File Storage (S3)** | S3 adapter | Local disk adapter | Direct file read | 🔮 Future |
| **Queue (Redis)** | Redis queue | Sync queue (`QUEUE_CONNECTION=sync`) | Immediate execution | ✅ Already done |
| **External API** | HTTP client | Fake/stub client | Pre-configured responses | 🔮 Future |

---

## Rules

1. **Test-only endpoints MUST check environment.** Never expose `/test/*` routes in production.
   ```php
   if (!app()->environment('testing', 'local', 'dev', 'devtest')) {
       abort(404);
   }
   ```

2. **Test-only endpoints MUST NOT require authentication.** They are internal tools for test infrastructure, not user-facing APIs.

3. **Production code MUST NOT know about test implementations.** The interface is in the main codebase; the test implementation lives alongside it. The binding happens in the service provider.

4. **Prefer file-based recorders over in-memory.** Files survive process restarts and can be inspected for debugging. Use `storage/testing/` as the base directory. Add `storage/testing/` to `.gitignore`.

5. **Clean up test artifacts.** The `test:reset` command should clear `storage/testing/` as part of its truncation step via `clearTestArtifacts()`.
