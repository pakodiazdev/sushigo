# 🔨 Task #289: Eliminate remaining 0.3% SonarCloud duplication in sushigo-api (messages() arrays + EmployeeSeeder)

## 📖 Story

**English:**
As a developer, following up on #282, I need to eliminate the last 0.3% of SonarCloud code duplication in sushigo-api, so the project reaches a clean 0% duplication baseline instead of leaving a documented-but-unresolved remainder.

**Español:**
Como desarrollador, dando seguimiento a #282, necesito eliminar el último 0.3% de duplicación de código que reporta SonarCloud en sushigo-api, para que el proyecto llegue a un baseline limpio de 0% en vez de dejar un remanente documentado pero sin resolver.

---

## ✅ Technical Tasks

- [x] 🔨 Extract `App\Http\Requests\Concerns\SharesValidationMessages` with a single `MESSAGES` map, used by 10 CashAdjustments FormRequest classes' `messages()` instead of each repeating its own `'field.rule' => 'Spanish text'` array
- [x] 🔍 Keep the 2 genuinely different `type.in` messages (CashAdjustment vs CashRegister domains) inline as 1-line entries — too small to trigger CPD, not worth centralizing
- [x] 🔨 Extract `EmployeeSeeder::seedFirstReingresoHire()`, consolidating the shared "skip-if-exists + compute dates + create + close first period" sequence from `seedDosReingresos()`/`seedReingresoTres()`, staying under the `php:S107` 7-parameter threshold
- [x] 🔍 Discover and fix a residual CPD match between `StoreCashAdjustmentRequest` and `StoreCashRegisterRequest` — after both were routed through the shared trait, their `messages()` methods still shared an identical *code shape* (array-spread + inline override) that CPD matched regardless of content. Fixed by rewriting one of the two using imperative assignment instead of array-spread — same output, different token sequence.
- [x] ✅ Verify all 10 `messages()` outputs are byte-identical to the originals via a standalone comparison script (not just visual review), both before and after the shape-breaking fix
- [x] 🧪 Full PHPUnit suite green + Pint clean after each commit
- [x] 🔍 Re-check SonarCloud duplication density reaches 0%
- [x] 📚 Document the CPD literal-normalization pitfall and the fix patterns in `doc/conventions/backend/avoiding-sonarcloud-duplication.md`, referenced from `CLAUDE.md` and `seeder-system.md`, so future FormRequest/seeder work doesn't reintroduce this debt

---

## 🎯 Acceptance Criteria

- [x] SonarCloud duplication density reaches 0% (confirmed via PR #290 analysis: `duplicated_lines: 0`, `duplicated_blocks: 0`, `duplicated_files: 0`, all `bestValue: true`)
- [x] No behavior change — every validation message, error field path, and seeded record byte-identical to before
- [x] Full PHPUnit suite passes, Pint clean
- [x] Convention doc added so the pattern doesn't recur

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` (mechanical centralization of already-catalogued literals)
- **Pessimistic:** `2.5h` (residual CPD matches may require iteration against the actual SonarCloud scan, as happened in #282)
- **Tracked:** `1.3h`

### 📅 Sessions
```json
[
  { "date": "2026-07-23", "start": "15:40", "end": "16:48" },
  { "date": "2026-07-23", "start": "20:15", "end": "20:25" }
]
```

---

## 📊 Retrospective
- **Actual total:** 1h 18m (68m + 10m)
- **vs optimistic:** +18m over the `1h` optimistic estimate
- **vs pessimistic:** −1h 12m under the `2.5h` pessimistic estimate

**Justification:**

Close to the optimistic estimate. The `messages()` centralization was fully mechanical and verified byte-for-byte with a standalone script before ever touching PHPUnit, which avoided any back-and-forth there. The one real surprise — and the reason this wasn't a flat 45-minute mechanical task — was discovering that SonarPHP's CPD doesn't just match literal arrays, it matches **code shape** generally: after centralizing all the message literals, `StoreCashAdjustmentRequest` and `StoreCashRegisterRequest` still collided because both `messages()` methods used the identical `[...$this->sharedMessages([...]), 'k' => 'v']` spread-plus-override pattern, regardless of the (completely different) `rules()` content each class validates. This required one extra push/CI/SonarCloud round-trip to catch (the fix isn't visible from reading the code — only the actual scan reveals it), rewriting one method to use imperative assignment instead of spread to break the token match without changing behavior. This confirms the project's established practice of verifying every duplication claim against the real SonarCloud API rather than reasoning about it in the abstract — paid off again here.

---

## 🔗 References

- GitHub issue: [#289](https://github.com/pakodiazdev/sushigo/issues/289)
- Follow-up to: [#282](https://github.com/pakodiazdev/sushigo/issues/282)
- PR: [#290](https://github.com/pakodiazdev/sushigo/pull/290)
- Convention doc added: `doc/conventions/backend/avoiding-sonarcloud-duplication.md`
- SonarCloud duplications: https://sonarcloud.io/component_measures?id=pakodiazdev_sushigo-api&metric=duplicated_lines_density
