# Avoiding SonarCloud Code Duplication (CPD)

Issues [#268](https://github.com/pakodiazdev/sushigo/issues/268), [#282](https://github.com/pakodiazdev/sushigo/issues/282), and [#289](https://github.com/pakodiazdev/sushigo/issues/289) spent significant time cleaning up SonarCloud duplication debt in `sushigo-api` — 883 duplicated lines down to 0. This doc captures the patterns that caused it, so new code doesn't reintroduce the same debt and require another cleanup pass.

## Why this matters: how SonarPHP's CPD actually works

SonarCloud's Copy-Paste Detector (CPD) normalizes **string and numeric literals** before comparing token sequences across files. This means:

```php
// File A
'branch_id' => 'required|integer|exists:branches,id',
'name'      => 'required|string|max:255',

// File B
'code'      => 'required|string|max:50|unique:cash_registers,code',
'provider'  => 'required|string|max:100',
```

These two snippets have **completely different field names and rules**, but to CPD they're the same normalized token shape (`STRING => STRING,` repeated), and will be flagged as duplicate if the run is long enough. **Content does not matter — code *shape* does.** Any two array literals (or method bodies) of similar structure and length will match, regardless of what they actually say.

This is the root cause behind two recurring patterns in this codebase:

## 1. FormRequest `messages()` arrays

Every `Store*Request`/`Update*Request` that defines custom Spanish validation messages writes a `'field.rule' => 'message'` array. Once there are more than two or three of these in a domain (e.g. `CashAdjustments/*`), they start matching each other via CPD — not because the messages are the same, but because the array shape is.

**Fix:** centralize the literal `'field.rule' => 'message'` pairs in one shared trait, and have each class select the subset it needs by key instead of repeating the literal array. See `App\Http\Requests\Concerns\SharesValidationMessages` (used by all CashAdjustments `Store`/`Update` requests):

```php
// Concerns/SharesValidationMessages.php
trait SharesValidationMessages
{
    private const MESSAGES = [
        'branch_id.required' => 'La sucursal es requerida',
        // ... one entry per unique field.rule/message pair, defined ONCE
    ];

    protected function sharedMessages(array $keys): array
    {
        return array_intersect_key(self::MESSAGES, array_flip($keys));
    }
}

// StoreCashRegisterRequest.php
public function messages(): array
{
    return $this->sharedMessages(['branch_id.required', 'code.required', ...]);
}
```

**Rules:**
- If the exact same `field.rule => message` pair is used in 2+ classes, it belongs in the shared `MESSAGES` const — not repeated.
- If two classes use the *same field name* for a *different meaning* (e.g. `type.in` means `EXTERNAL_IMPORT|CORRECTION` for `CashAdjustment` but `ON_PREMISE|DELIVERY|EVENT` for `CashRegister`), **do not** force them into the shared map under a colliding key. Keep those inline as a single-line override — a 1-line literal is too short to trigger CPD, so there's no real duplication cost to leaving it be.
- Never chase this by inventing indirection that changes displayed text or behavior (e.g. routing messages through `lang/*/validation.php` locale files) — this app has no established i18n infrastructure (`config('app.locale')` defaults to `en`, no `lang/` directory exists), so that would introduce a new runtime dependency for a cosmetic win. Prefer the trait approach above.

## 2. Seeder scenario data (near-identical array literals across two call sites)

When a seeder defines two instances of the same "kind" of scenario (e.g. two re-entry employees, two leave types, two oauth clients), it's tempting to write two literal arrays with identical keys and different values. CPD flags this exactly like the `messages()` case — the *shape* repeats even though every value differs.

**Fix:** extract the shared shape into one method that takes the varying values as parameters (not as a second copy of the array), and have both call sites go through it. See `EmployeeSeeder::seedFirstReingresoHire()` and `CoreTestSeeder::leaveTypeRow()` for two examples of this pattern.

**Watch the parameter count** — `php:S107` caps functions at 7 parameters. If the varying data has more than ~4-5 fields, group it into a single `array $data` parameter (with a documented shape in the docblock) instead of listing each field as its own parameter. See `EmployeeSeeder::createReingresoEmployee()`.

## 3. When two *different* fixes still collide with each other

Rarely, after centralizing literals per rule #1/#2 above, the surrounding **method structure** itself can still match between two otherwise-unrelated classes — e.g. two `messages()` methods that both do `return [...$this->sharedMessages([...]), 'extra' => '...'];` with a similar-length key list. This happened between `StoreCashAdjustmentRequest` and `StoreCashRegisterRequest` in #289 even after both were routed through the shared trait.

**Fix:** vary the code *shape* between the two colliding methods — e.g. one uses array-spread (`return [...$this->sharedMessages([...]), 'k' => 'v'];`), the other uses imperative assignment (`$messages = $this->sharedMessages([...]); $messages['k'] = 'v'; return $messages;`). Both produce identical output; the token sequence differs enough that CPD stops matching. This is a last resort — only reach for it when `/api/duplications/show` (see below) confirms two files are still paired after the literal-centralization fix, and don't touch `rules()` bodies to "fix" this (those differ in real business logic per endpoint and should never be abstracted away just to satisfy CPD).

## How to verify before/after a fix

Always check what SonarCloud actually flagged — never guess from a percentage alone:

```bash
# Rank files by duplicated lines (no token needed — public API for a public project)
curl -s "https://sonarcloud.io/api/measures/component_tree?component=pakodiazdev_sushigo-api&branch=main&metricKeys=duplicated_lines&qualifiers=FIL&ps=100&s=metric&metricSort=duplicated_lines&asc=false"

# Get the exact matched line ranges + which other file(s) a given file is paired with
curl -s "https://sonarcloud.io/api/duplications/show?key=pakodiazdev_sushigo-api:<path>&branch=main"
```

`duplications/show` is what revealed that a "3-file" cluster from `component_tree`'s line-count ranking was actually a 10-file web (#289) — the summary metric alone under-describes the real scope. After any fix, re-run it against the PR (`&pullRequest=<N>` instead of `&branch=main`) to confirm the match is actually gone, not just moved to a different pair of files.

## Writing new FormRequests: how to not add to this

- Before writing a new `Store*Request`/`Update*Request` `messages()` method in an existing domain (e.g. `CashAdjustments/*`), check `App\Http\Requests\Concerns\SharesValidationMessages::MESSAGES` first — the field/rule pair you need may already be there.
- If it's a new `field.rule` pair not yet covered, add it to the shared const rather than writing an inline array, even if this is the *first* class in the domain to need it — the second class that needs the same field will thank you.
- For a brand-new domain (not `CashAdjustments`), it's fine to start with an inline `messages()` array — don't preemptively build a shared-messages trait for a domain that only has one Request class. Centralize once a second class in that domain needs an overlapping message, following the pattern above.
