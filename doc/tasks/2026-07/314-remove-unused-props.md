# 🔨 Task #314: Unused React typed props should be removed (typescript:S6767)

## 📖 Story

**English:**
As a developer, I need to remove unused typed props flagged by SonarCloud in `sushigo-webapp`, so the component interfaces accurately reflect what's actually consumed and the project's maintainability debt stays clean.

**Español:**
Como desarrollador, necesito eliminar las props tipadas no utilizadas reportadas por SonarCloud en `sushigo-webapp`, para que las interfaces de los componentes reflejen fielmente lo que realmente se consume y se mantenga limpia la deuda de mantenibilidad del proyecto.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line |
|---|---|---|---|---|
| `typescript:S6767` | Maintainability | MINOR | `src/components/inventory/variant-details.tsx` | 22 |
| `typescript:S6767` | Maintainability | MINOR | `src/components/ui/logo.tsx` | 7 |

**Message:** "Remove this unused prop" — prop declared in the component's type/interface but never read inside the component body.

## ✅ Technical Tasks

- [x] 🔍 Inspect `variant-details.tsx:22` — confirmed `onClose` is declared in `VariantDetailsProps` but `VariantDetails` only destructures `variant`, `onEdit`, `onDelete`. The panel's own `SlidePanel` wrapper (in `item-variants.tsx`) already owns closing behavior — `VariantDetails`'s `onClose` was dead.
- [x] 🔍 Inspect `logo.tsx:7` — confirmed `showText` is declared in `LogoProps` but `Logo` only destructures `className`, `collapsed`. No call site anywhere passes `showText`.
- [x] 🔧 Remove `onClose` from `VariantDetailsProps` in `variant-details.tsx`
- [x] 🔧 Remove the now-invalid `onClose={...}` prop passed to `<VariantDetails>` in `item-variants.tsx`
- [x] 🔧 Remove `onClose={mockOnClose}` from all render calls and the unused `mockOnClose` mock in `variant-details.test.tsx`
- [x] 🔧 Remove `showText` from `LogoProps` in `logo.tsx`
- [x] 🧪 Run Vitest suite for `variant-details.test.tsx` — confirm still green
- [x] 🎨 Run ESLint + TypeScript check — 0 errors

## 🎯 Acceptance Criteria

- [x] `onClose` removed from `VariantDetailsProps`, no call site passes it
- [x] `showText` removed from `LogoProps`
- [x] No behavior change — existing tests pass unmodified in intent (only the invalid prop dropped)
- [x] ESLint + TypeScript pass with 0 errors

## 🚫 Explicitly Out of Scope

- No new tests added — this is a pure dead-prop removal with no behavior change, nothing new to cover

---

## 🔗 References

- GitHub issue: [#314](https://github.com/pakodiazdev/sushigo/issues/314)
- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6767)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `0.75h` · **Tracked:** `2m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "20:22", "end": "20:24" }
]
```

## 📊 Retrospective
- **Actual total:** 2m (2m)
- **vs optimistic:** −13m
- **vs pessimistic:** −43m

**Justification:**

Both flagged locations were confirmed dead on inspection (`VariantDetails`'s `onClose` was shadowed by the owning `SlidePanel`'s own close handler; `Logo`'s `showText` had zero call sites anywhere in the codebase), so the fix was a pure prop removal with no design ambiguity: 4 one-line deletions plus dropping the corresponding call-site prop and unused test mock. Vitest, ESLint, and `tsc --noEmit` all passed on the first run.
