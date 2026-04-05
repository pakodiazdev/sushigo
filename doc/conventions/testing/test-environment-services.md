# Test Environment Services

Convention for replacing external service dependencies in testing and development environments. Defines how to decouple tests from infrastructure services like Mailhog, Redis queues, or third-party APIs.

---

## Guiding Principle

> **Tests must not depend on infrastructure services that are not the system under test.**

A Cypress spec that tests "employee creation + password reset + first login" is testing the **application flow**, not Mailhog. If Mailhog is down, slow, or misconfigured, the test fails for the wrong reason.

**Strategy:** Replace external service calls with deterministic, in-process alternatives in testing (and optionally in development).

---

## Pattern: Environment-Aware Service Resolution

Laravel's service container + environment detection gives us clean dependency injection per environment:

```php
// AppServiceProvider or a dedicated TestingServiceProvider
public function register(): void
{
    if (app()->environment('testing', 'local', 'dev', 'devtest')) {
        $this->app->bind(PasswordResetLinkResolverInterface::class, FilePasswordResetLinkResolver::class);
    } else {
        $this->app->bind(PasswordResetLinkResolverInterface::class, EmailPasswordResetLinkResolver::class);
    }
}
```

This keeps production code untouched while giving tests fast, reliable alternatives.

---

## Case Study: Password Reset Link (Mailhog Replacement)

### Current Problem

The `employees.cy.ts` spec:
1. Creates an employee via UI (triggers welcome email with password reset link)
2. Calls `cy.task('mailhog:getResetLink', email)` to scrape the link from Mailhog's API
3. Visits the reset link, sets a password, then logs in

**Failure modes:**
- Mailhog is not running → test fails
- Email delivery is delayed → test is flaky with timing
- Mailhog API format changes → task parser breaks
- Running in CI without Mailhog → impossible

### Solution: Token File Strategy

When `APP_ENV` is `testing` or `local`, the password reset notification writes the token/link to a known file instead of (or in addition to) sending email.

#### Backend

```php
// Interface
interface PasswordResetTokenRecorder
{
    public function record(string $email, string $token, string $link): void;
}

// Production: no-op (email is the delivery channel)
class NullTokenRecorder implements PasswordResetTokenRecorder
{
    public function record(string $email, string $token, string $link): void {}
}

// Testing/Dev: write to file
class FileTokenRecorder implements PasswordResetTokenRecorder
{
    public function record(string $email, string $token, string $link): void
    {
        $path = storage_path("testing/reset-links/{$email}.txt");
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $link);
    }
}
```

The notification (or the Action that triggers it) calls the recorder after generating the token:

```php
app(PasswordResetTokenRecorder::class)->record($email, $token, $resetLink);
```

#### Backend API Endpoint (test-only)

```php
// routes/api.php — only registered in non-production
if (app()->environment('testing', 'local', 'dev', 'devtest')) {
    Route::get('test/reset-link/{email}', function (string $email) {
        $path = storage_path("testing/reset-links/{$email}.txt");
        if (!File::exists($path)) {
            return response()->json(['link' => null], 404);
        }
        return response()->json(['link' => File::get($path)]);
    })->name('test.reset-link');
}
```

#### Cypress Task

```typescript
// Replace mailhog:getResetLink with a direct API call
'test:getResetLink': (email: string) => {
  const apiUrl = process.env.CYPRESS_apiUrl || 'https://devtest.api.sushigo.local/api/v1'
  // Simple HTTP GET — no Mailhog dependency
  return fetch(`${apiUrl}/test/reset-link/${email}`, {
    headers: { Accept: 'application/json' },
  })
    .then(res => res.json())
    .then(data => data.link)
    .catch(() => null)
}
```

#### Cypress Spec (updated employees.cy.ts)

```typescript
// BEFORE (Mailhog-dependent)
cy.task<string | null>('mailhog:getResetLink', email, { timeout: 30_000 })

// AFTER (file-based, instant)
cy.task<string | null>('test:getResetLink', email, { timeout: 10_000 })
```

---

## General Pattern for Other Services

### When to apply

Apply this pattern whenever a test depends on an external service that:
- Can be unavailable (Mailhog, Redis, S3, third-party API)
- Introduces timing/flakiness (email delivery, queue processing)
- Is expensive to set up in CI

### How to apply

1. **Define an interface** for the service interaction (e.g., `PasswordResetTokenRecorder`, `SmsGateway`, `FileStorageAdapter`)
2. **Create a production implementation** that uses the real service
3. **Create a test implementation** that uses a fast, deterministic alternative (file, in-memory, direct DB)
4. **Bind in the service provider** based on `app()->environment()`
5. **Expose a test-only endpoint** (if Cypress needs the result) guarded by environment check
6. **Create a Cypress task** that calls the test endpoint instead of the external service

### Service Replacement Table

| External Service | Production Impl | Test Impl | Test Access |
|---|---|---|---|
| **Email (Mailhog)** | SMTP notification | `FileTokenRecorder` | `GET /test/reset-link/{email}` |
| **SMS** | Twilio/SNS gateway | `FileSmsRecorder` | `GET /test/sms/{phone}` |
| **File Storage (S3)** | S3 adapter | Local disk adapter | Direct file read |
| **Queue (Redis)** | Redis queue | Sync queue (`QUEUE_CONNECTION=sync`) | Immediate execution |
| **External API** | HTTP client | Fake/stub client | Pre-configured responses |

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

5. **Clean up test artifacts.** The `test:reset` command should clear `storage/testing/` as part of its truncation step.

---

## Implementation Priority

| Service | Priority | Reason |
|---|---|---|
| Password reset link (Mailhog) | **High** | `employees.cy.ts` depends on it; Mailhog adds ~2-5s latency + flakiness |
| Queue (sync in testing) | **Already done** | `QUEUE_CONNECTION=sync` in `.env.testing` |
| File storage | **Low** | No Cypress specs depend on S3 yet |
| SMS | **Future** | No SMS features implemented yet |
