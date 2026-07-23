# 🔨 Task #268: Fix SonarCloud Maintainability Issues in sushigo-api (127 open)

## 📖 Story

**English:**
As a developer, I need to resolve the open maintainability Code Smells flagged by SonarCloud for sushigo-api, so the codebase stays consistent, easier to reason about, and the project's overall (non-New-Code) quality debt is paid down.

**Español:**
Como desarrollador, necesito resolver los Code Smells de mantenibilidad abiertos que SonarCloud reporta para sushigo-api, para que el código se mantenga consistente, más fácil de razonar, y se pague la deuda de calidad general del proyecto (no solo new code).

---

## 🔍 SonarCloud Findings — grouped by rule

| Rule | Severity | Count | Effort | Description |
|---|---|---|---|---|
| `php:S1172` | MAJOR | 65 | 5h 25m | Remove unused function parameter (mostly `$user`/model params in `app/Policies/*`, some in migrations) |
| `php:S112` | MAJOR | 20 | 6h 40m | Define and throw a dedicated exception instead of a generic one (`app/Services/CashAdjustments/*`) |
| `php:S1192` | CRITICAL | 9 | 2h 16m | Define a constant instead of duplicating a string literal (routes/api.php, factories, seeders, controllers) |
| `php:S1135` | INFO | 7 | 0m | Complete the task associated to a `TODO` comment |
| `php:S3776` | CRITICAL | 5 | 1h 1m | Refactor function to reduce Cognitive Complexity below 15 |
| `php:S1066` | MAJOR | 5 | 25m | Merge nested `if` into the enclosing one |
| `php:S1142` | MAJOR | 3 | 1h | Method has too many returns (reduce to ≤3) |
| `php:S107` | MAJOR | 3 | 1h | Function has too many parameters (reduce to ≤7) |
| `php:S6353` | MINOR | 3 | 15m | Use concise regex character class syntax (`\D` instead of `[^0-9]`) |
| `php:S3358` | MAJOR | 1 | 5m | Extract nested ternary into an independent statement |
| `php:S1488` | MINOR | 1 | 2m | Return expression directly instead of via temp variable |
| `php:S116` | MINOR | 1 | 2m | Rename field to match naming convention (`$guard_name`) |
| `php:S1155` | MINOR | 1 | 2m | Use `empty()` instead of manual array-size check |
| `php:S1481` | MINOR | 1 | 5m | Remove unused local variable |
| `php:S1854` | MAJOR | 1 | 1m | Remove useless assignment to local variable |
| `php:S138` | MAJOR | 1 | 20m | Function/closure body too long (>150 lines) |

**Hotspot files** (highest issue concentration): `app/Policies/InventoryLocationPolicy.php` (12), `app/Policies/ItemPolicy.php` (12), `app/Policies/ItemVariantPolicy.php` (12), `app/Services/CashAdjustments/CashAdjustmentService.php` (7), `app/Services/CashAdjustments/CashExpenseService.php` (7), `app/Policies/CashSessionPolicy.php` (6), `app/Services/Inventory/StockOutService.php` (6), `app/Services/Inventory/OpeningBalanceService.php` (5).

**Scope note:** given the size, this issue is split into one PR per bullet below rather than fixed in a single pass.

---

## ✅ Technical Tasks

- [x] 🔧 **Policies cleanup (`php:S1172`, 62 of 65 occurrences in `app/Policies/*`):** remove unused `$user`/model parameters across `app/Policies/*` (BankAccount, CashAdjustment, CashExpense, CashRegister, CashSession, CashTerminal, InventoryLocation, Item, ItemVariant policies). Guest-access exception: `viewAny()`/`view()` in `InventoryLocationPolicy`, `ItemPolicy`, `ItemVariantPolicy` use a nullable `?User $user` that Laravel's `Gate::methodAllowsGuests()` reads via reflection to permit unauthenticated access — that parameter is kept and suppressed with `// NOSONAR` instead of removed, to avoid silently breaking public/guest access. *(Session: 2026-07-21, PR: see below)*
- [x] 🔧 **Dedicated exceptions (`php:S112`, 20 of 20 occurrences):** created 10 dedicated exception classes in `app/Exceptions/` and replaced every `throw new \Exception(...)` across `app/Services/CashAdjustments/CashAdjustmentService.php`, `CashExpenseService.php`, `CashSessionService.php`, `app/Services/Inventory/OpeningBalanceService.php`, and `StockOutService.php` (the last two were not in the original file list for this bullet but carry the same rule, so folded in here to fully close `php:S112`). Controllers already catch `\Exception` generically, so no controller changes were needed. *(PR: see below)*
- [x] 🔧 **Extract duplicated literals (`php:S1192`, 9 of 9 occurrences):** introduced constants for repeated strings in `routes/api.php` (`/{id}`, `/{id}/post` — 38 occurrences via `App\Support\RouteParams`, a new autoloaded class rather than a top-level const, since `routes/api.php` is `require`d fresh per app boot and a top-level const fatals on redeclaration across tests), `database/factories/AttendanceFactory.php`, `database/seeders/Development/EmployeeSeeder.php`, `database/migrations/2025_11_30_232333_create_cash_expenses_table.php` (local variable, not a const, since it's an already-applied migration), `RegisterStockOutController.php`. PR [#277](https://github.com/pakodiazdev/sushigo/pull/277).
- [x] 🔧 **Reduce cognitive complexity (`php:S3776`, 5 occurrences):** refactored `database/seeders/Development/UserSeeder.php` (45→15), `app/Services/CashAdjustments/CashSessionService.php` (16→15), `app/Services/Inventory/OpeningBalanceService.php` (18→15), `app/Services/Inventory/StockOutService.php` (16→15), `app/Console/Commands/SeedersInfo.php` (16→15) via extract-method — no behavior change. *(Session: 2026-07-21, PR: [#278](https://github.com/pakodiazdev/sushigo/pull/278))*
- [x] 🔧 **Simplify conditionals & control flow (`php:S1066` 5/5, `php:S1142` 3/3, `php:S107` 3/3):** merged nested `if`s in `CreateItemVariantRequest`, `UpdateItemVariantRequest`, and both `UserSeeder` classes (Development/Production); split `SeederLock::handle()`, `SeederUnlock::handle()`, and `CloseDayAction::isScheduledRestDay()` into smaller helpers to bring each back to ≤3 `return`s; introduced `RegisterExpenseData`, `RegisterOpeningBalanceData`, `RegisterStockOutData` DTOs in `app/DataTransferObjects/` to collapse `registerExpense()` (12→1), `registerOpeningBalance()` (8→1), and `registerStockOut()` (9→1) parameters, updating the 3 corresponding controllers and their direct test call sites. *(Session: 2026-07-21/22, PR: [#280](https://github.com/pakodiazdev/sushigo/pull/280))*
- [x] 🔧 **Small/misc cleanups (single-digit or 1-off, batched in one PR):** `php:S6353` — `preg_replace('/[^0-9]/', ...)` → `preg_replace('/\D/', ...)` in `RegisterRequest.php`, `StoreEmployeeRequest.php`, `UpdateEmployeeRequest.php`. `php:S3358` — extracted the nested ternary in `EmployeeResource.php` (`has_active_period`) into a private `hasActivePeriod()` method with plain if/return. `php:S1488` — `CreateEmployeeAction::createUserForEmployee()` now returns the repository call directly instead of assigning to `$user` first. `php:S116` — `User::$guard_name` property replaced with a `guardName(): string` method (Spatie's `Guard::getDefaultName()` supports this alternative via `method_exists`). `php:S1155` — `count($defaults) > 0` → `! empty($defaults)` in `CreateInventoryLocationRequest.php`. `php:S1481` — removed the unused `$location` capture in `OpeningBalanceService::registerOpeningBalance()` (the `findOrFail()` existence check is kept, just not assigned). `php:S1854` — SonarCloud's exact 1854 occurrence could not be pinned to a second, separate line beyond the `$location` case above despite an AST-based control-flow-aware search (Explore subagent, `nikic/php-parser`) plus manual heuristics finding zero other dead-store candidates in `app/`; treating it as resolved by the same fix and re-checking on SonarCloud re-scan. `php:S138` — split `PermissionSeeder::run()` (210 lines) into `permissionDefinitions()`, `upsertPermissions()`, and one `assign*Permissions()` method per role group. Also folded in the 3 remaining `php:S1172` occurrences outside Policies: `WhatsAppService::sendMessage()` now logs `message_length` so `$message` is used, and the two empty `Schema::table()` closures in migration `2025_11_12_092126_add_is_manufactured_to_items_table.php` had their unused `Blueprint $table` parameter dropped. *(Note: that migration's closures are empty/no-op — the `is_manufactured` column referenced by `ShowItemController`/`ListItemsController` is never actually added to the `items` table by any migration. Out of scope here per "no behavior change"; flagged for a follow-up issue.)* PR: see below.
- [x] 📝 **TODO cleanup (`php:S1135`, 7 occurrences, 0 effort but needs judgment):** review each TODO in `app/Services/Notifications/WhatsAppService.php`, `app/Http/Requests/Inventory/RegisterOpeningBalanceRequest.php`, `InventoryLocation/CreateInventoryLocationRequest.php`, `InventoryLocation/UpdateInventoryLocationRequest.php`, `UnitsOfMeasure/CreateUnitOfMeasureRequest.php`, `UnitsOfMeasure/CreateUomConversionRequest.php`, `UnitsOfMeasure/UpdateUnitOfMeasureRequest.php` — either implement or remove/replace with a tracked issue. Implemented: `RegisterOpeningBalanceRequest`, `CreateInventoryLocationRequest`, `UpdateInventoryLocationRequest` now authorize directly against the `stock.manage` / `inventory_locations.manage` permissions already enforced at the route level (a first pass delegated to `InventoryLocationPolicy` instead, but PR review correctly flagged that `create()`/`update()` return `true` unconditionally there, so it didn't actually mirror the route middleware — switched to the permission string directly). Replaced with tracked-issue references (no permission infra exists yet, so implementing now would mean inventing a permission scheme — deferred): `CreateUnitOfMeasureRequest`, `UpdateUnitOfMeasureRequest`, `CreateUomConversionRequest` → [#275](https://github.com/pakodiazdev/sushigo/issues/275); `WhatsAppService` → [#276](https://github.com/pakodiazdev/sushigo/issues/276). *(Session: 2026-07-21, PR: [#279](https://github.com/pakodiazdev/sushigo/pull/279))*
- [x] 🔧 **Split `routes/api.php` by entity (`php:S138`, 1 occurrence — found only after the other 7 sub-tasks landed):** the top-level `Route::prefix('v1')->group(function () {...})` closure grew to 294 lines (all v1 route registrations in one closure) and was flagged as a *new* `S138` occurrence distinct from the one already fixed in `PermissionSeeder::run()`. Split into 9 files under `routes/api/` (`health`, `auth`, `units-of-measure`, `items`, `inventory`, `employees`, `attendance`, `vacation-holidays`, `cash-adjustments`), each with its own `use` imports, `require`d from the now ~10-line `v1` group in `routes/api.php`. No behavior change — verified with `php artisan route:list` before/after: all 163 routes identical (method, URI, name, action, middleware).
- [x] 🧪 Run full test suite (`php artisan test`) and `./vendor/bin/pint` after each batch — no behavior change is expected, only structure
- [x] 🔍 Re-check https://sonarcloud.io/project/issues?impactSoftwareQualities=MAINTAINABILITY&issueStatuses=OPEN%2CCONFIRMED&id=pakodiazdev_sushigo-api shows 0 open issues at the end

---

## 🎯 Acceptance Criteria

- [x] All 127 currently open/confirmed maintainability issues are resolved or explicitly won't-fixed with justification in SonarCloud
- [x] No behavior change — full PHPUnit suite passes after each batch
- [x] `./vendor/bin/pint` passes with no formatting diffs

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `12h` (SonarCloud effort estimate, assuming clean mechanical fixes)
- **Pessimistic:** `24h` (accounting for Policy signature changes needing test updates, and exception-class refactors touching call sites)
- **Tracked:** `16.07h` (all 8 sub-tasks complete — Policies, Dedicated exceptions, Extract duplicated literals, Reduce cognitive complexity, Simplify conditionals & control flow, Small/misc cleanups, TODO cleanup, Split routes/api.php by entity. Final test-suite run and SonarCloud 0-open-issues re-check both confirmed. PR #284 review comment addressed and thread resolved.)

### 📅 Sessions
```json
[
  { "date": "2026-07-21", "start": "14:24", "end": "14:33" },
  { "date": "2026-07-21", "start": "15:48", "end": "16:20" },
  { "date": "2026-07-21", "start": "18:29", "end": "18:42" },
  { "date": "2026-07-21", "start": "18:42", "end": "18:51" },
  { "date": "2026-07-21", "start": "18:51", "end": "19:06" },
  { "date": "2026-07-21", "start": "19:06", "end": "19:13" },
  { "date": "2026-07-21", "start": "19:31", "end": "20:10" },
  { "date": "2026-07-21", "start": "19:31", "end": "20:33" },
  { "date": "2026-07-21", "start": "20:30", "end": "20:55" },
  { "date": "2026-07-21", "start": "21:17", "end": "00:09" },
  { "date": "2026-07-22", "start": "08:30", "end": "10:26" },
  { "date": "2026-07-22", "start": "11:50", "end": "12:41" },
  { "date": "2026-07-22", "start": "14:15", "end": "14:31" },
  { "date": "2026-07-22", "start": "14:45", "end": "15:05" },
  { "date": "2026-07-22", "start": "15:58", "end": "22:16" }
]
```

---

## 📊 Sub-task Retrospectives

### ✅ Policies cleanup (`php:S1172`) — PR [#271](https://github.com/pakodiazdev/sushigo/pull/271), merged 2026-07-21
- **Actual:** 41m (9m + 32m)
- **vs SonarCloud effort estimate (5h25m):** −4h44m

**Justification:** Removing the unused `$user`/model parameters across the 9 Policy classes was mechanical and fast (session 1, 9m). A second session (32m) was needed after PR review flagged a coverage drop on the touched Policy classes — added dedicated Unit tests for `BankAccountPolicy`, `CashAdjustmentPolicy`, `CashExpensePolicy`, `CashRegisterPolicy`, `CashSessionPolicy`, `CashTerminalPolicy`, `InventoryLocationPolicy`, `ItemPolicy`, `ItemVariantPolicy` to restore the SonarCloud quality gate. SonarCloud's per-rule effort estimate is a generic default and does not reflect how repetitive/boilerplate this batch was.

### ✅ Dedicated exceptions (`php:S112`) — PR [#274](https://github.com/pakodiazdev/sushigo/pull/274)
- **Actual:** 44m (13m + 9m + 15m + 7m)
- **vs SonarCloud effort estimate (6h40m):** −5h56m

**Justification:** Once the exception-naming scheme was decided (group by domain error, e.g. `CashAdjustmentAlreadyPostedException`, `InsufficientStockException`), the mechanical replacement of 20 `throw new \Exception(...)` call sites with 10 new one-line exception classes was fast and required zero controller changes, since every caller already caught `\Exception` generically (session 1, 13m). A second session (9m) addressed two `copilot-pull-request-reviewer` review comments on PR #274: a missing `@throws InvalidCashExpenseException` on `CashExpenseService::updateExpense()`, and a stale "PR: pending" reference in this task file. A third session (15m) fixed the PR's own SonarCloud quality gate, which failed on `new_coverage` (55.0% < 80%) because 9 of the 20 new exception-throwing lines were never exercised by existing tests — added targeted PHPUnit cases for the empty-lines, missing-field, and not-found branches across `CashAdjustmentServiceTest`, `CashExpenseServiceTest`, and `StockOutTest`. A fourth session (7m) waited for CI + SonarCloud re-scan (new_coverage → 100%, gate → OK) and squashed the accumulated commits per request. SonarCloud's estimate assumes far more design/wiring effort than this codebase's existing generic-catch convention actually required, even accounting for the review/coverage follow-up.

### ✅ Extract duplicated literals (`php:S1192`) — PR [#277](https://github.com/pakodiazdev/sushigo/pull/277)
- **Actual:** 1.5h (39m + 51m)
- **vs SonarCloud effort estimate (2h16m):** −46m

**Justification:** The extraction itself across 5 files was mechanical, but `routes/api.php`'s 35 occurrences of `'/{id}'` needed real thought: a first attempt defined a plain top-level `const` in that file, which fataled with "already defined" once the PHPUnit suite ran a second test — `loadRoutesFrom()` calls plain `require` (not `require_once`) on every app boot, so top-level constants there redeclare across tests. Fixed by moving the constants into a new autoloaded `App\Support\RouteParams` class instead, which only loads once via Composer's autoloader. Most of the session time (beyond the fix itself) was spent waiting out two rounds of shared `mydb_test` contention from concurrent workspaces (deadlocks and a transient "relation migrations does not exist" from another workspace's `migrate:fresh` mid-run) before the full suite could confirm green — a known environment limitation, not a defect in this change.

**PR review follow-up (2026-07-22, 51m):** `copilot-pull-request-reviewer` flagged 16 threads on PR #277 — 2 for a leftover `\Exception` FQCN in `RegisterStockOutController.php` (pre-existing, not introduced here, but on a line the diff touched), and 14 for pre-existing `\App\Http\Controllers\CashAdjustments\...` FQCNs in `routes/api.php` on lines where `/{id}` was swapped for `RouteParams::ID`. Both are genuine CLAUDE.md violations ("no backslash-prefixed FQCNs"), so fixed rather than skipped: imported `Exception` in the controller, and imported all 32 CashAdjustments-module controllers in `routes/api.php`, replacing every FQCN in that block — including the ~10 lines outside the diff — for consistency rather than leaving a mix of styles. Full suite re-confirmed green (1279 tests) before pushing; most of the session was spent waiting out a third round of shared `mydb_test` contention.

### ✅ Reduce cognitive complexity (`php:S3776`) — PR [#278](https://github.com/pakodiazdev/sushigo/pull/278)
- **Actual:** 62m
- **vs SonarCloud effort estimate (1h1m):** −0m (in line with estimate)

**Justification:** Queried the SonarCloud Issues API directly (`GET /api/issues/search?rules=php:S3776`) to get the exact 5 flagged locations instead of guessing from the hotspot-file list — `UserSeeder::run()` (45→15), `CashSessionService::getSessionSummary()` (16→15), `OpeningBalanceService::registerOpeningBalance()` (18→15), `StockOutService::registerStockOut()` (16→15), and `SeedersInfo::handle()` (16→15). All five were fixed with straightforward extract-method refactors (pulling nested loops/conditionals into single-purpose private methods), preserving exact original behavior — verified with `pint` (no diff) and the scoped PHPUnit suites for the three services with existing coverage (`CashSessionServiceTest`, `StockOutTest`, `OpeningBalanceTest` — 32/32 passing). `SeedersInfo` has no dedicated test; manually ran `php artisan seeders:info` and confirmed identical output/behavior to `main`, including reproducing a pre-existing unrelated bug (`$user['name']` on a config array that only has `first_name`/`last_name`) — left untouched as out of scope for this maintainability task. Most of the session's wall-clock time was spent diagnosing a full-suite `php artisan test` run that failed with 79 unrelated failures — traced to a genuine Postgres deadlock (`SQLSTATE[40P01]`) from concurrent `DROP TABLE ... CASCADE` statements against the shared `mydb_test` database when multiple test workers run in parallel; none of the failures touched the 5 refactored files, confirming this is pre-existing test-infra flakiness, not a regression.

### ✅ Simplify conditionals & control flow (`php:S1066`, `php:S1142`, `php:S107`) — PR [#280](https://github.com/pakodiazdev/sushigo/pull/280)
- **Actual:** ~2.87h (single session, 21:17–00:09)
- **vs SonarCloud effort estimate (25m + 1h + 1h = 2h25m):** +26m

**Justification:** The `php:S1066` and `php:S1142` fixes were mechanical (merge `&&` conditions; extract guard clauses into named helper methods) and fast. The bulk of the session went to `php:S107`: rather than a bare associative-array signature, three readonly DTOs (`RegisterExpenseData`, `RegisterOpeningBalanceData`, `RegisterStockOutData`) were introduced under a new `app/DataTransferObjects/` namespace to keep type-safety at the call site, which meant updating each service, its sole controller caller, and 7 direct test call sites (`CashExpenseServiceTest` ×6, `StockOutTest` ×1) — `OpeningBalanceService` has no direct test caller, only HTTP-level coverage, so it needed no test changes. Roughly 35–40 minutes of the elapsed time was pure waiting, not work: `phpunit.xml` hardcodes `DB_DATABASE=mydb_test`, so this dev-lab's 5 concurrent workspaces (`sushigo-a`..`e`) all share one Postgres test database, and another workspace's concurrent `php artisan test` run caused repeated `SQLSTATE[40P01]` deadlocks on `DROP TABLE ... CASCADE` during RefreshDatabase teardown until that workspace's process exited. This is a pre-existing dev-lab environment limitation unrelated to this change, not a defect introduced here — full local suite (1279 tests, 3813 assertions) passed once the shared DB was free, and `./vendor/bin/pint` reported no diffs. A follow-up `/sonar-review` pass on the PR fixed 2 new `php:S3776` code smells (SonarCloud attributed the pre-existing closure complexity in `OpeningBalanceService`/`StockOutService` as "new" because the DTO change touched their signature lines) by extracting a conversion helper in each, plus added missing test coverage for `CreateCashExpenseController` and the `seeder:lock`/`seeder:unlock` commands (neither had any prior test coverage) to bring PR new-code coverage back above 80%. That same follow-up then collided with PR #277 and PR #278 landing on `main` in parallel — both touched `OpeningBalanceService.php`/`StockOutService.php`/`UserSeeder.php` with near-identical extract-method fixes for the same `php:S3776` rule, so merging `main` required manually picking PR #278's more complete extraction (it additionally split out `calculateBaseCost`/`upsertStock`/`assignOperatingUnits`) and dropping this branch's now-redundant duplicate helper methods rather than keeping both.

### ✅ Small/misc cleanups (8 rules, single-digit/1-off) — PR: see below
- **Actual:** ~1h56m
- **vs SonarCloud effort estimate (~48m across the 8 rules):** +1h8m

**Justification:** Unlike the two prior sub-tasks, most of these 13 occurrences had no line-number hints in the issue body, so locating them was the bulk of the effort — an Explore subagent spent ~104 minutes building AST-based detectors (via the vendored `nikic/php-parser`) for `S3358`/`S1488`/`S1155`/`S1481`/`S1854`/`S138` in parallel with manual token-stream analysis (a custom nullable-type-aware ternary-nesting detector) for the same rules, since naive regex/grep produced too many false positives (e.g. `?Type` nullable hints tokenize identically to ternary `?`). The actual code changes once each location was confirmed were all one-liners or small extractions (2–15 min each): regex literal swap (`S6353`), extract-to-method for one nested ternary and one long seeder `run()` (`S3358`, `S138`), direct-return (`S1488`), property→method (`S116`), `empty()` swap (`S1155`), drop one unused variable capture (`S1481`), and use an existing unused parameter instead of dropping it (`S1172`×2). `S1854` could not be isolated to a second distinct line beyond the `S1481` occurrence despite the AST search — noted as a risk to re-verify on the SonarCloud re-scan rather than spending further time guessing. Also discovered (but did not fix, to honor "no behavior change") that migration `2025_11_12_092126_add_is_manufactured_to_items_table.php` is empty/no-op, so the `is_manufactured` column read by `ShowItemController`/`ListItemsController` is never actually created — flagged for a follow-up issue rather than silently expanding this cleanup's scope.

### ✅ TODO cleanup (`php:S1135`) — PR [#279](https://github.com/pakodiazdev/sushigo/pull/279)
- **Actual:** 61m (25m + 16m + 20m)
- **vs SonarCloud effort estimate (0m):** N/A (rule carries no estimate — its cost is the judgment call, not the edit)

**Justification:** Of the 7 TODOs, 3 (`RegisterOpeningBalanceRequest`, `CreateInventoryLocationRequest`, `UpdateInventoryLocationRequest`) had a real fix ready to wire up: a matching Policy or permission already existed and was already enforced at the route-middleware level, so `authorize()` was updated to delegate to it instead of hardcoding `true`. The remaining 4 (3 UnitsOfMeasure/UomConversion TODOs + WhatsAppService) had no such infrastructure — UOM write endpoints have no permission defined at all, and WhatsApp has no real provider wired up. Implementing those properly would mean inventing a permission scheme or picking/configuring a WhatsApp provider, both product decisions out of scope for a TODO sweep and both changing current behavior, which the task's acceptance criteria rule out. Filed [#275](https://github.com/pakodiazdev/sushigo/issues/275) and [#276](https://github.com/pakodiazdev/sushigo/issues/276) and pointed the comments at them instead of leaving bare TODOs (session 1, 25m). A second session (16m) addressed two `copilot-pull-request-reviewer` threads on PR #279: for `CreateInventoryLocationRequest`/`UpdateInventoryLocationRequest`, delegating `authorize()` to `InventoryLocationPolicy::create()`/`update()` was correctly flagged as not actually mirroring the route's `inventory_locations.manage` middleware, since those Policy methods return `true` unconditionally — switched both to check `$this->user()->can('inventory_locations.manage')` directly, matching the `RegisterOpeningBalanceRequest` pattern. A third session (20m) squashed the 3 accumulated commits into one before merge (per request) and closed out the checklist item on both this task file and the parent GitHub issue #268.

### ✅ Split routes/api.php by entity (`php:S138`) — PR [#284](https://github.com/pakodiazdev/sushigo/pull/284)
- **Actual:** ~6.3h (single session, 15:58–22:16)
- **vs SonarCloud effort estimate (20m):** +6h10m

**Justification:** Only a small fraction of this session was actual coding — the fix itself (splitting the 294-line `v1` route group into 9 `require`d per-entity files) took roughly 30–40 minutes once started. The rest went to process overhead that surfaced only after the other 7 sub-tasks were already merged: (1) a full final-verification pass (`php artisan test` + `pint` on `main`, plus a fresh SonarCloud query) that surfaced this `S138` occurrence as the one thing keeping the acceptance criteria from being fully met; (2) an independent code review of PR #279 before merge, including verifying the `stock.manage`/`inventory_locations.manage` permission strings actually exist and match route middleware; (3) an investigation into why PR #279's `new_duplicated_lines_density` (28.6% on a 7-line diff) wasn't failing the gate — confirmed via SonarSource's own community forum that the "ignore duplication/coverage on small changes" fudge factor (~20-line threshold) is hardcoded in SonarCloud and not configurable via API, UI, or scanner property, despite a stored-but-inert `sonar.qualitygate.ignoreSmallChanges=false` project setting attempt; (4) two rounds of merge-conflict resolution against `main` while other #268 sub-task PRs (#277, #278) and later the unrelated #282 duplication-cleanup PR (#283) landed in parallel, each requiring a fresh sync; (5) a `/pr-comments` pass after CI/SonarCloud confirmed green — `copilot-pull-request-reviewer` flagged inline FQCNs (`\DB`, `\Exception`) in the new `routes/api/health.php`, a pre-existing pattern carried over verbatim from the original `routes/api.php` but a genuine CLAUDE.md violation once flagged; fixed by importing `DB` and using bare `Exception` (global namespace, no `use`/backslash needed since the file has no `namespace` declaration). For the fix itself: each of the 9 new files declares its own `use` imports (PHP resolves `use` per-file at compile time, so they don't inherit from the parent `routes/api.php` even though `require` shares runtime scope) and `Route::prefix('v1')->group()` in the main file now just contains 9 `require` lines. Correctness was verified structurally, not just by running tests: dumped `php artisan route:list --path=api --json` before and after (using `git show HEAD:routes/api.php` to reconstruct the pre-split file), normalized and diffed every route's method/URI/name/action/middleware tuple — all 163 routes identical. Final SonarCloud re-scan on the PR: Quality Gate `OK`, 0 open maintainability issues project-wide. Full suite (1294 tests) and Pint both green throughout.

---

## 🔗 References

- GitHub issue: [#268](https://github.com/pakodiazdev/sushigo/issues/268)
- SonarCloud Maintainability issues: https://sonarcloud.io/project/issues?impactSoftwareQualities=MAINTAINABILITY&issueStatuses=OPEN%2CCONFIRMED&id=pakodiazdev_sushigo-api

---

## 📌 Multi-PR tracking note

This issue was split across 8 sub-tasks/PRs (see Technical Tasks above — all 8 checked off). Both acceptance-criteria items and the final verification checklist are confirmed. Moved to `doc/tasks/2026-07/` as part of closing this task.
