# 🔨 Task #321: Heading elements should have accessible content (typescript:S6850)

## 📖 Story

**English:**
As a developer, I need `CardTitle` in the shared UI kit to expose accessible heading content explicitly, so SonarCloud's static analysis (and assistive technology) can verify the rendered `<h3>` always has meaningful, non-empty content instead of relying on an opaque `...props` spread.

**Español:**
Como desarrollador, necesito que `CardTitle` en el kit de UI compartido exponga explícitamente el contenido accesible del encabezado, para que el análisis estático de SonarCloud (y la tecnología asistiva) pueda verificar que el `<h3>` renderizado siempre tiene contenido significativo y no vacío, en lugar de depender de un `...props` spread opaco.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line |
|---|---|---|---|---|
| `typescript:S6850` | Maintainability | MAJOR | `src/components/ui/card.tsx` | 31 |

**Message:** Heading elements (`<h1>`–`<h6>`) should have accessible, non-empty text content.

## ✅ Technical Tasks

- [x] 🔍 Inspect `card.tsx` — `CardTitle` renders `<h3 {...props} />`, so content only flows through a generic props spread that Sonar's static analyzer can't verify as non-empty
- [x] 🔍 Audit all real usages (`WeeklySummaryDialog`, `Dashboard`, `login`, `reset-password`, `forgot-password`) — all pass meaningful text/icon+text children, confirming this is a static-analysis false positive rather than a real a11y bug
- [x] 🔨 Make `children` explicit and required on `CardTitleProps`, rendering `{children}` inside `<h3>` instead of relying solely on `{...props}`
- [x] ✅ Confirm existing `CardTitle` tests in `card.test.tsx` still pass unchanged

## 🎯 Acceptance Criteria

- [x] `CardTitle` requires `children` at the TypeScript level and renders them explicitly inside the `<h3>`
- [x] No behavior change for existing consumers — all already pass text children
- [x] SonarCloud `typescript:S6850` finding at `card.tsx:31` is resolved

## 🚫 Explicitly Out of Scope

- No changes to `CardDescription`, `CardHeader`, `CardContent`, `CardFooter` — the Sonar finding is specific to the heading element (`CardTitle`) only

---

## 🔗 References

- SonarCloud project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6850
- Rule: `typescript:S6850`
- Issue: https://github.com/pakodiazdev/sushigo/issues/321

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `1h` · **Tracked:** `5m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "01:45", "end": "01:48" }
]
```

## 📊 Retrospective
- **Actual total:** 3m (5m rounded)
- **vs optimistic:** −12m
- **vs pessimistic:** −57m

**Justification:**

The fix was a single, well-understood change: make `CardTitle`'s `children` prop required and render it explicitly inside the `<h3>` instead of via `...props` spread. All 7 real usages already passed meaningful text children, so no callers needed changes — confirmed by a clean `tsc --noEmit`. No unplanned rework or scope discovery occurred.
