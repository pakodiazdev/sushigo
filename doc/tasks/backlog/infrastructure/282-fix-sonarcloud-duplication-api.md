# 🔨 Task #282: Fix SonarCloud Code Duplication in sushigo-api (883 duplicated lines / 42 blocks)

## 📖 Story

**English:**
As a developer, I need to resolve the code duplication flagged by SonarCloud for sushigo-api, so the codebase stays consistent, easier to maintain, and the project's duplication debt is paid down.

**Español:**
Como desarrollador, necesito resolver la duplicación de código que SonarCloud reporta para sushigo-api, para que el código se mantenga consistente, más fácil de mantener, y se pague la deuda de duplicación del proyecto.

---

## 🔍 SonarCloud Findings — grouped by cluster

Baseline (via `GET /api/measures/component` and `GET /api/measures/component_tree`, SonarCloud public API): **duplicated_lines_density = 2.0%**, **duplicated_lines = 883**, **duplicated_blocks = 42**, **duplicated_files = 31**.

**Scope note:** given the size, this issue is split into one PR per cluster below rather than fixed in a single pass, mirroring #268.

---

## ✅ Technical Tasks

- [x] 🔨 **CashAdjustments FormRequest field casting (10 files):** `prepareForValidation()` in `Store/UpdateBankAccountRequest`, `Store/UpdateCashRegisterRequest`, `Store/UpdateCashTerminalRequest`, `Store/UpdateCashSessionRequest`, `Store/UpdateCashExpenseRequest` all repeated the same "if string, cast to float/bool and merge" boilerplate for a differently-named field each time (`is_active`, `opening_balance`, `closing_balance`, `amount`). Extracted into `App\Http\Requests\Concerns\CastsRequestFields` (`castToFloat()`/`castToBoolean()`), used via `use CastsRequestFields;` in all 10 classes. *(Session: 2026-07-22)*
- [x] 🔨 **StockOutService / OpeningBalanceService UOM conversion (2 files):** both services had a byte-identical `getConversion()` (38 lines, searches direct + inverse UOM conversion) and near-identical `convertToBaseQuantity()` (differing only in parameter names — `transactionUomId`/`transactionUom` vs `entryUomId`/`entryUom`). Extracted both into `App\Services\Inventory\Concerns\ConvertsUomQuantities`, used via `use ConvertsUomQuantities;` in both services. *(Session: 2026-07-22)*
- [ ] 🔨 **PayrollSeedService internal duplication:** two ~20-line blocks (lines ~201, ~330) with the same shape — needs inspection to confirm what's repeated and extract to a private method.
- [ ] 🔨 **PassportClientSeeder Development vs Production (2 files):** nearly-identical ~55-56 line files (86%/85.9% self-duplication density) — likely differ only in a couple of client secrets/redirect URIs. Candidate: shared base method parameterized by environment, or a single seeder reading env-specific config.
- [ ] 🔨 **EmployeeSeeder internal duplication:** two 29-line blocks within the same file (lines ~103, ~168) — likely two near-identical employee/schedule definitions that can be parameterized into a loop or shared private method.
- [ ] 🔨 **CoreTestSeeder internal duplication:** two 33-line blocks within the same file (lines ~438, ~449) — same pattern, needs inspection.
- [ ] 🔍 **InventoryLocation/UnitsOfMeasure Request `rules()` shape overlap:** SonarCloud flags `CreateInventoryLocationRequest`, `UpdateInventoryLocationRequest`, and `UpdateUnitOfMeasureRequest` as mutually duplicate (~20-line blocks), but inspection shows these are different domains with different field names — the "duplication" is just the coincidental array-literal shape (`'field' => ['nullable', 'string', 'max:N']` repeated structure), not real copy-paste logic. Forcing a shared abstraction here would reduce clarity for a marginal metric win. Recommend: leave as-is, document as an accepted/won't-fix false positive.
- [ ] 🔨 **Controller response-shaping duplication (8 files):** `InventoryLocation` Show/Create controllers, `Items` Show/Create/Update/List controllers, `Stock` ByVariant/ByLocation controllers, and `Devtools` ShiftClock/SetClock controllers each hand-build a similar response array or repeat the same clock-state-update-and-respond block. Candidate: extract to API Resource classes (e.g. `InventoryLocationResource`) for the data-shaping controllers, and a small trait for the Devtools clock controllers. Needs care to preserve exact JSON shape (Swagger schemas, existing consumers).
- [ ] 🔧 **Migrations duplication (2 pairs):** `create_cash_expenses_table` / `create_cash_adjustments_table`, and `create_vacation_request_dates_table` / `create_leave_dates_table` share ~20-line column-definition blocks. These are already-applied migrations — recommend excluding `database/migrations/**` via `sonar.cpd.exclusions` in `sonar-project.properties` rather than editing historical migration files, since migrations are point-in-time schema snapshots and refactoring them retroactively risks breaking chronological schema application for no behavioral benefit.
- [ ] 🧪 Run full test suite (`php artisan test`) and `./vendor/bin/pint` after each batch — no behavior change is expected, only structure
- [ ] 🔍 Re-check https://sonarcloud.io/component_measures?id=pakodiazdev_sushigo-api&metric=duplicated_lines_density shows an improved density at the end

---

## 🎯 Acceptance Criteria

- [ ] Duplicated lines density meaningfully reduced from the 2.0%/883-line baseline (exact target depends on which clusters are fixed vs. accepted as false positives/excluded)
- [ ] No behavior change — full PHPUnit suite passes after each batch
- [ ] `./vendor/bin/pint` passes with no formatting diffs

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` (mechanical extractions, assuming clean matches)
- **Pessimistic:** `10h` (seeder/migration clusters may need judgment calls on env-specific values; controller cluster needs care around Swagger/response-shape parity)
- **Tracked:** `0.4h` (in progress — 2 of 9 clusters complete)

### 📅 Sessions
```json
[
  { "date": "2026-07-22", "start": "15:07", "end": "15:31" }
]
```

---

## 📊 Sub-task Retrospectives

### ✅ CashAdjustments FormRequest field casting + StockOutService/OpeningBalanceService UOM conversion
- **Actual:** 24m

**Justification:** Both clusters were found via the SonarCloud public API (`/api/measures/component_tree` sorted by `duplicated_lines`, then `/api/duplications/show` per file to see exact matched line ranges) rather than guessing from the file list — this pinpointed exactly which methods/blocks were byte-identical vs. merely similar. Both fixes were mechanical: `CastsRequestFields` trait (2 one-line helper methods) collapsed 10 near-identical `prepareForValidation()` bodies into one-line calls; `ConvertsUomQuantities` trait moved 2 byte-identical/near-identical methods (`getConversion()`, `convertToBaseQuantity()`) out of `StockOutService`/`OpeningBalanceService` with zero behavior change (verified against `StockOutTest`/`OpeningBalanceTest`, including UOM-conversion-specific cases). No dedicated Feature/HTTP tests exist yet for the CashAdjustments endpoints (only Service-level unit tests), so that cluster's fix couldn't be regression-tested via HTTP, only via `php -l` + full suite + manual code review confirming the extraction preserved every conditional/cast exactly.

---

## 🔗 References

- GitHub issue: [#282](https://github.com/pakodiazdev/sushigo/issues/282)
- SonarCloud duplications: https://sonarcloud.io/component_measures?id=pakodiazdev_sushigo-api&metric=duplicated_lines_density

---

## 📌 Multi-PR tracking note

This issue is deliberately split across 9 clusters/PRs (see Technical Tasks above). This task file stays in `doc/tasks/backlog/infrastructure/` and the GitHub issue stays open across all of them — it only moves to the monthly folder and gets closed once every cluster above is checked off (fixed or explicitly accepted/excluded with justification).
