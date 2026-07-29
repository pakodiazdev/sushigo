# 🔨 Task #311: Cognitive Complexity of functions should not be too high (typescript:S3776)

## 📖 Story

**English:**
As a developer, I need the three functions SonarCloud flagged for excessive cognitive complexity broken into smaller named helpers, so that the maintainability quality gate stays clean and the logic is easier to read and test in isolation.

**Español:**
Como desarrollador, necesito que las tres funciones marcadas por SonarCloud por complejidad cognitiva excesiva se dividan en helpers más pequeños, para que el gate de mantenibilidad se mantenga limpio y la lógica sea más fácil de leer y probar de forma aislada.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line (at issue creation) |
|---|---|---|---|---|
| `typescript:S3776` | Maintainability | CRITICAL | `src/components/dev/DevDebugger.tsx` | 33 |
| `typescript:S3776` | Maintainability | CRITICAL | `src/components/inventory/product-wizard.tsx` | 310 |
| `typescript:S3776` | Maintainability | CRITICAL | `src/components/inventory/stock-out-form.tsx` | 48 |

**Message:** Cognitive Complexity of functions should not be too high.

Two of the three files were modified by unrelated commits after this issue was filed (`#309`, `#306`), so the reported line numbers drifted. Verified against the pre-drift file versions:
- `DevDebugger.tsx:33` → the `DevDebugger()` component itself (unchanged since issue creation). Main contributors: the "Dev Login" section (search + role-filter pills + permission autocomplete + user list, ~5 levels of nested `&&`/ternary) and the "Roles y Permisos" section's nested ternaries for roles/permissions display.
- `product-wizard.tsx:310` (now line 316 after `#309`'s unrelated key-tracking additions) → `handleNext`, an if/else-if chain over 3 wizard steps, each with a nested `if` + `try/catch`.
- `stock-out-form.tsx:48` (unchanged since issue creation) → the `StockOutForm()` component itself. Main contributors: two blocks of nested ternaries used purely to pick Tailwind classes (stock-level badge, profit/loss panel).

## ✅ Technical Tasks

- [x] 🔨 `DevDebugger.tsx`: extract `DevLoginSection` (owns `permissionInputFocused` state internally) and `RolesPermissionsSection` into standalone presentational components; extract the minimized-state JSX into `MinimizedDebugger`
- [x] 🔨 `product-wizard.tsx`: split `handleNext` into `advanceFromStep1`/`advanceFromStep2`/`advanceFromStep3`, dispatched via a lookup keyed by `currentStep`
- [x] 🔨 `stock-out-form.tsx`: extract `StockInfoPanel` and `ProfitAnalysisPanel` into standalone presentational components
- [x] 🔍 Confirm existing test suites (`DevDebugger.test.tsx`, `product-wizard.test.tsx`, `stock-out-form.test.tsx`) pass unmodified — they already cover every branch being moved

## 🎯 Acceptance Criteria

- [x] None of the 3 flagged functions trigger `typescript:S3776` after the refactor
- [x] No visual/behavioral regression in any of the 3 components
- [x] Existing tests pass unmodified
- [x] Lint + typecheck clean

## 🚫 Explicitly Out of Scope

- No other SonarCloud findings in these 3 files are addressed beyond the S3776 finding this issue reports
- No visual/UX changes — extractions are structural only

---

## 🔗 References

- SonarCloud project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S3776
- GitHub Issue: [#311](https://github.com/pakodiazdev/sushigo/issues/311)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `13m`

### 📅 Sessions
```json
[
  { "date": "2026-07-28", "start": "19:45", "end": "19:58" }
]
```

## 📊 Retrospective
- **Actual total:** 13m (13m tracked in Sessions above)
- **vs optimistic:** −47m
- **vs pessimistic:** −1h47m

**Justification:**

All 3 line numbers had already drifted from the ones SonarCloud reported, since two of the three files were touched by unrelated commits (#309, #306) after this issue was filed — verifying the actual flagged functions against the pre-drift file versions (via `git show <commit>~1:<path>`) took longer than the refactor itself. Once the 3 target functions were confirmed (`handleNext`, `StockOutForm()`, `DevDebugger()`), the fix was a mechanical extraction exactly matching the pattern from task #315: pull deeply-nested JSX/branches into small named components/functions. All 3 components already had thorough existing test coverage (every branch being moved was already exercised), so no new tests were needed and the full webapp suite (242 files / 3543 tests) passed unmodified on the first run.

**Follow-up (not separately session-tracked):** the PR-level SonarCloud gate check (`/sonar-review`, run against PR #349 before merge) caught that the gate failed on `new_coverage` (50.8%, threshold 80%) — extracting existing JSX/logic into new named components made previously-exempt old code count as new, uncovered code. Added 7 targeted tests across `DevDebugger.test.tsx` (mobile-minimized view, unauthenticated roles section, permission-filter autocomplete) and `stock-out-form.test.tsx` (StockInfoPanel/ProfitAnalysisPanel rendering). While writing the latter, found and fixed a real latent bug in the test mocks: `useInventoryLocationsSelect`/`useItemVariantsSelect`/`useUnitsOfMeasureSelect` returned fresh array/object literals on every call instead of stable references (unlike real react-query), which caused `StockOutForm`'s variant-lookup `useEffect` to loop forever (worker OOM) once a test finally selected a variant — no prior test had exercised that path. Re-scan after the fix: `new_coverage` 94.7%, gate green. This follow-up ran under `/sonar-review`, which doesn't open a task-file session, so its time isn't reflected in the `Tracked` figure above.
