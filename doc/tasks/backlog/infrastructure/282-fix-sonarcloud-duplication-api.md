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
- [x] 🔍 **InventoryLocation/UnitsOfMeasure Request `rules()` shape overlap:** re-inspected — this was **not** a false positive as originally assessed. `UpdateUnitOfMeasureRequest` no longer has any active duplication on `main` (resolved by another cluster's changes), but `CreateInventoryLocationRequest`/`UpdateInventoryLocationRequest` are genuinely near-identical: same domain, 6 of 8 rule entries byte-identical (`code`, `priority`, `is_primary`, `is_active`, `is_pickable`, `notes`), only `name`/`type` differ (`required` vs `nullable`). Extracted the 6 shared entries into `App\Http\Requests\InventoryLocation\Concerns\SharesInventoryLocationRules::sharedLocationFieldRules()`, used via `use SharesInventoryLocationRules;` in both classes.
- [x] 🔨 **Controller response-shaping duplication (8 files):** `InventoryLocation` Show/Create controllers, `Items` Show/Create/Update/List controllers, `Stock` ByVariant/ByLocation controllers, and `Devtools` ShiftClock/SetClock controllers each hand-built a similar response array or repeated the same clock-state-update-and-respond block. Fixed via 5 domain-scoped `Concerns` traits (not JsonResource — kept the existing `ResponseEntity`/array-based envelope to avoid touching the response-wrapping mechanism): `FormatsInventoryLocation`, `AppliesSimulatedClock`, `FormatsItemVariant`, `FiltersItemListing` (the actual Sonar-flagged overlap for the List pair was query-filter duplication, not response shaping), `SummarizesStock`. *(Session: 2026-07-22/23)*
- [x] 🔧 **Migrations duplication (2 pairs):** `create_cash_expenses_table` / `create_cash_adjustments_table`, and `create_vacation_request_dates_table` / `create_leave_dates_table` share ~20-line column-definition blocks. These are already-applied migrations — excluded `database/migrations/**` via `sonar.cpd.exclusions` in `code/api/sonar-project.properties` rather than editing historical migration files, since migrations are point-in-time schema snapshots and refactoring them retroactively risks breaking chronological schema application for no behavioral benefit.
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
- **Tracked:** `2.13h` (in progress — 5 of 9 clusters complete)

### 📅 Sessions
```json
[
  { "date": "2026-07-22", "start": "15:07", "end": "15:31" },
  { "date": "2026-07-22", "start": "23:10", "end": "24:00" },
  { "date": "2026-07-23", "start": "00:00", "end": "00:39" },
  { "date": "2026-07-23", "start": "00:39", "end": "00:54" }
]
```

---

## 📊 Sub-task Retrospectives

### ✅ CashAdjustments FormRequest field casting + StockOutService/OpeningBalanceService UOM conversion
- **Actual:** 24m

**Justification:** Both clusters were found via the SonarCloud public API (`/api/measures/component_tree` sorted by `duplicated_lines`, then `/api/duplications/show` per file to see exact matched line ranges) rather than guessing from the file list — this pinpointed exactly which methods/blocks were byte-identical vs. merely similar. Both fixes were mechanical: `CastsRequestFields` trait (2 one-line helper methods) collapsed 10 near-identical `prepareForValidation()` bodies into one-line calls; `ConvertsUomQuantities` trait moved 2 byte-identical/near-identical methods (`getConversion()`, `convertToBaseQuantity()`) out of `StockOutService`/`OpeningBalanceService` with zero behavior change (verified against `StockOutTest`/`OpeningBalanceTest`, including UOM-conversion-specific cases). No dedicated Feature/HTTP tests exist yet for the CashAdjustments endpoints (only Service-level unit tests), so that cluster's fix couldn't be regression-tested via HTTP, only via `php -l` + full suite + manual code review confirming the extraction preserved every conditional/cast exactly.

### ✅ Controller response-shaping duplication
- **Actual:** ~1.05h

**Justification:** Used `/api/duplications/show` per flagged file (not just `/api/measures/component_tree`) to get the exact matched line ranges for all 5 sub-pairs before writing any code — this revealed that the `ListItems`/`ListItemVariants` pair's "duplication" was actually query-filter logic (`is_active` boolean filter, ILIKE search, `per_page` default), not response shaping as the issue's title suggested; the fix was scoped to what Sonar actually flagged rather than the issue's approximate description. Chose plain PHP traits over Laravel API Resources (`JsonResource`) for the data-shaping clusters (InventoryLocation, ItemVariant, Stock) specifically to avoid touching the response-wrapping mechanism (`ResponseEntity`) — the extraction is a pure copy-paste of the existing array-building code into a shared method, so the JSON shape risk is structurally eliminated rather than needing manual verification. Verified zero behavior change three ways: `php artisan route:list --path=api --json` diffed before/after (163 routes, byte-identical), the 62 Feature tests directly covering the 11 touched controllers (`InventoryLocationCrudTest`, `StockQueryTest`, `ClockEndpointsTest`, `ItemCrudTest`, `ItemVariantCrudTest`), and the full suite (1294 tests / 3852 assertions, all green).

### ✅ Migrations exclusion + InventoryLocation Request `rules()` overlap
- **Actual:** ~15m

**Justification:** Before accepting the issue's original "false positive" call on the `rules()` cluster, re-verified by reading `CreateInventoryLocationRequest`/`UpdateInventoryLocationRequest` directly and re-querying `/api/duplications/show` — this contradicted the original assessment: the two files are the *same* domain (not "different domains" as originally written), 6 of 8 rule entries are byte-identical, and `UpdateUnitOfMeasureRequest` no longer has any active duplication on `main` at all (resolved incidentally by another cluster). Corrected course from won't-fix to an actual extraction: `SharesInventoryLocationRules::sharedLocationFieldRules()` holds the 6 identical entries (`code`, `priority`, `is_primary`, `is_active`, `is_pickable`, `notes`); `name`/`type` stay inline in each class since their `required`/`nullable` modifier is the one real difference between Create and Update. Migrations cluster was a pure config change (`sonar.cpd.exclusions=database/migrations/**` in `sonar-project.properties`), zero code touched. Verified via `InventoryLocationCrudTest` (15/15 passed, including required-field and default-value validation) plus full suite (1294/1294 green).

---

## 🔗 References

- GitHub issue: [#282](https://github.com/pakodiazdev/sushigo/issues/282)
- SonarCloud duplications: https://sonarcloud.io/component_measures?id=pakodiazdev_sushigo-api&metric=duplicated_lines_density

---

## 📌 Multi-PR tracking note

This issue is deliberately split across 9 clusters/PRs (see Technical Tasks above). This task file stays in `doc/tasks/backlog/infrastructure/` and the GitHub issue stays open across all of them — it only moves to the monthly folder and gets closed once every cluster above is checked off (fixed or explicitly accepted/excluded with justification).
