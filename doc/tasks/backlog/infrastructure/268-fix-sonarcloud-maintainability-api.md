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
- [ ] 🔧 **Dedicated exceptions (`php:S112`, 20 occurrences):** create specific exception classes for `app/Services/CashAdjustments/CashAdjustmentService.php`, `CashExpenseService.php`, `CashSessionService.php` instead of throwing generic `\Exception`
- [ ] 🔧 **Extract duplicated literals (`php:S1192`, 9 occurrences):** introduce constants for repeated strings in `routes/api.php` (`/{id}`, `/{id}/post`), `database/factories/AttendanceFactory.php`, `database/seeders/Development/EmployeeSeeder.php`, `database/migrations/2025_11_30_232333_create_cash_expenses_table.php`, `RegisterStockOutController.php`
- [ ] 🔧 **Reduce cognitive complexity (`php:S3776`, 5 occurrences):** refactor `database/seeders/Development/UserSeeder.php` (45→15) and `CashSessionService.php` plus 3 others below 15
- [ ] 🔧 **Simplify conditionals & control flow:** merge nested `if`s (`php:S1066`, 5), reduce excess `return`s (`php:S1142`, 3), reduce excess parameters (`php:S107`, 3 — `CashExpenseService` constructor is one)
- [ ] 🔧 **Small/misc cleanups (single-digit or 1-off, batch into one PR):** `php:S6353` (regex `\D`), `php:S3358` (nested ternary), `php:S1488` (direct return), `php:S116` (rename `$guard_name`), `php:S1155` (`empty()`), `php:S1481` (unused var), `php:S1854` (useless assignment), `php:S138` (long function), plus the 3 remaining `php:S1172` occurrences outside Policies (`WhatsAppService.php` line 16, migration `2025_11_12_092126_add_is_manufactured_to_items_table.php` lines 14 & 24)
- [ ] 📝 **TODO cleanup (`php:S1135`, 7 occurrences, 0 effort but needs judgment):** review each TODO in `app/Services/Notifications/WhatsAppService.php`, `app/Http/Requests/Inventory/RegisterOpeningBalanceRequest.php`, `InventoryLocation/CreateInventoryLocationRequest.php`, `InventoryLocation/UpdateInventoryLocationRequest.php`, `UnitsOfMeasure/CreateUnitOfMeasureRequest.php`, `UnitsOfMeasure/CreateUomConversionRequest.php`, `UnitsOfMeasure/UpdateUnitOfMeasureRequest.php` — either implement or remove/replace with a tracked issue
- [ ] 🧪 Run full test suite (`php artisan test`) and `./vendor/bin/pint` after each batch — no behavior change is expected, only structure
- [ ] 🔍 Re-check https://sonarcloud.io/project/issues?impactSoftwareQualities=MAINTAINABILITY&issueStatuses=OPEN%2CCONFIRMED&id=pakodiazdev_sushigo-api shows 0 open issues at the end

---

## 🎯 Acceptance Criteria

- [ ] All 127 currently open/confirmed maintainability issues are resolved or explicitly won't-fixed with justification in SonarCloud
- [ ] No behavior change — full PHPUnit suite passes after each batch
- [ ] `./vendor/bin/pint` passes with no formatting diffs

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `12h` (SonarCloud effort estimate, assuming clean mechanical fixes)
- **Pessimistic:** `24h` (accounting for Policy signature changes needing test updates, and exception-class refactors touching call sites)
- **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-21", "start": "14:24", "end": "?" }
]
```

---

## 🔗 References

- GitHub issue: [#268](https://github.com/pakodiazdev/sushigo/issues/268)
- SonarCloud Maintainability issues: https://sonarcloud.io/project/issues?impactSoftwareQualities=MAINTAINABILITY&issueStatuses=OPEN%2CCONFIRMED&id=pakodiazdev_sushigo-api

---

## 📌 Multi-PR tracking note

This issue is deliberately split across 8 sub-tasks/PRs (see Technical Tasks above). This task file stays in `doc/tasks/backlog/infrastructure/` and the GitHub issue stays open across all of them — it only moves to the monthly folder and gets closed once every sub-task above is checked off.
