# Route Organization Standard

> **Scope:** ComandaFlow / SushiGo · Laravel 12 · PHP 8.3

This document defines how API routes are organized across files. The
goal is to keep `routes/api.php` small and stable, and to make adding
a new domain module a predictable, low-risk change.

------------------------------------------------------------------------

## 1) Why this exists

`routes/api.php` originally registered every `/api/v1/*` route inside a
single `Route::prefix('v1')->group(function () { ... })` closure. By
mid-2026 that closure had grown to **294 lines**, tripping SonarCloud's
`php:S138` rule (function/closure body > 150 lines) — see issue
[#268](https://github.com/pakodiazdev/sushigo/issues/268), sub-task 8.

A single growing route file has the same problems as any oversized
function: it's hard to scan, every new module's diff touches the same
hunk as everyone else's (constant merge conflicts), and there's no
natural boundary stopping it from growing indefinitely.

## 2) Structure

```
code/api/routes/
  api.php              ← entry point: test/dev/devtools routes + require list
  api/
    health.php
    auth.php
    units-of-measure.php
    items.php
    inventory.php
    employees.php
    attendance.php
    vacation-holidays.php
    cash-adjustments.php
```

`routes/api.php` keeps:
- The `test`/`dev`/`devtools` route groups (env-gated, rarely touched).
- The `v1` group, whose body is now just a list of `require` statements:

```php
// V1 API Routes — split by entity into routes/api/*.php to keep this group
// small (php:S138); each file registers its own routes under this prefix.
Route::prefix('v1')->group(function () {
    require __DIR__.'/api/health.php';
    require __DIR__.'/api/auth.php';
    require __DIR__.'/api/units-of-measure.php';
    require __DIR__.'/api/items.php';
    require __DIR__.'/api/inventory.php';
    require __DIR__.'/api/employees.php';
    require __DIR__.'/api/attendance.php';
    require __DIR__.'/api/vacation-holidays.php';
    require __DIR__.'/api/cash-adjustments.php';
});
```

Each `routes/api/*.php` file registers the `Route::...` definitions for
one domain — grouped by what a developer would look for together (e.g.
`inventory.php` holds inventory locations, operating units, and stock
routes; `cash-adjustments.php` holds the whole cash-adjustments module),
not necessarily one file per single HTTP resource.

## 3) Rules

- **Each split file must declare its own `use` imports.** `require`
  shares the *runtime* scope of the including file, but PHP resolves
  `use` imports **per file at compile time** — a controller class
  referenced in `routes/api/inventory.php` is not visible just because
  it's `use`d at the top of `routes/api.php`. Import only what that
  file actually references (no wildcard/blanket imports).
- **Never use inline FQCNs to work around this** (e.g.
  `\App\Http\Controllers\...\FooController::class`) — that violates the
  no-inline-FQCN rule (see root `CLAUDE.md`). Always `use` + short name,
  same as everywhere else in the codebase.
- **A file grows too long → split it further**, following the same
  domain-boundary logic (e.g. if `employees.php` keeps growing, carve
  out `employee-requests.php` or `leaves.php` as their own files and
  add the corresponding `require` line in `routes/api.php`).
- **New top-level domain → new file.** When adding a route module that
  doesn't fit an existing file (e.g. a new `reports/` sub-domain), add
  `routes/api/<domain>.php` and one `require` line in `routes/api.php`
  — don't grow an existing file for an unrelated domain, and don't add
  routes directly in `routes/api.php`'s `v1` group.
- **Route names, URIs, and middleware stay exactly as if everything
  were still in one file** — splitting is purely an organizational
  change. `Route::prefix()`/`Route::middleware()`/`Route::name()`
  nesting works identically whether the nested group is declared
  inline or inside a `require`d file, since `require` executes in the
  same scope as the calling code.

## 4) Verifying a split is behavior-neutral

Before merging any change that moves routes between files, confirm
`php artisan route:list` is unchanged:

```bash
# capture the "before" state (e.g. from the previous commit or main)
php artisan route:list --path=api --json > /tmp/before.json

# make the change, then capture "after"
php artisan route:list --path=api --json > /tmp/after.json

# diff the meaningful fields (method, uri, name, action, middleware) —
# ignore JSON key order, focus on the tuple set
python3 - <<'PY'
import json
def rows(p):
    return sorted(
        (r['method'], r['uri'], r['name'], r['action'], sorted(r['middleware']))
        for r in json.load(open(p))
    )
before, after = rows('/tmp/before.json'), rows('/tmp/after.json')
assert before == after, "route set changed — this should be a no-op"
print("OK — routes identical")
PY
```

------------------------------------------------------------------------

## 5) References

- Issue [#268](https://github.com/pakodiazdev/sushigo/issues/268) — the
  SonarCloud maintainability cleanup that introduced this split
  (sub-task 8, `php:S138`)
- `doc/conventions/backend/controllers-standard.md` — Single Action
  Controllers convention that these routes point to

------------------------------------------------------------------------

**End of Standard v1 – Route Organization.**
Any modifications should be proposed via Pull Request with rationale
and examples.
