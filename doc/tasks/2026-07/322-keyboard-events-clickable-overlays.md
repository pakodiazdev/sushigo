# 🐛 Task #322: Mouse events should have corresponding keyboard events (typescript:S1082)

## 📖 Story

**English:**
As a developer, I need clickable backdrop overlays to also support keyboard interaction, so that SonarCloud's reliability gate stays clean and keyboard-only users can dismiss dialogs/dropdowns/sidebars.

**Español:**
Como desarrollador, necesito que los overlays de fondo clicables también soporten interacción por teclado, para que el gate de confiabilidad de SonarCloud se mantenga limpio y los usuarios que navegan solo con teclado puedan cerrar diálogos/dropdowns/sidebars.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line |
|---|---|---|---|---|
| `typescript:S1082` | Reliability | MINOR | `src/components/ui/confirm-dialog.tsx` | 139 |
| `typescript:S1082` | Reliability | MINOR | `src/components/auth/BranchSwitcher.tsx` | 51 |
| `typescript:S1082` | Reliability | MINOR | `src/components/layout/Sidebar.tsx` | 272 |

**Message:** Visible, non-interactive elements (`<div>`) with an `onClick` handler have no corresponding keyboard event handler.

Overlaps with the S6848 maintainability finding for the same elements — fixed together per file.

## ✅ Technical Tasks

- [x] 🔍 Confirmed all 3 locations are invisible/semi-transparent "backdrop" overlays used to close a dialog/dropdown/sidebar on outside click
- [x] 🔍 Found an existing native-`<button>` idiom already used for this exact pattern in `src/components/employees/dialog-frame.tsx` (and reused in `ExtraDayNegotiationDialog.tsx`, `OvertimeDecisionDialog.tsx`, `RegisterLeaveDialog.tsx`, `extra-day-section.tsx`) — gets keyboard support for free, no visual change
- [x] 🔨 Replace the backdrop `<div onClick>` with `<button type="button" aria-label="..." className="... cursor-default appearance-none border-none p-0">` in `confirm-dialog.tsx`
- [x] 🔨 Same replacement in `BranchSwitcher.tsx`
- [x] 🔨 Same replacement in `Sidebar.tsx`
- [x] 🔍 Verified no test selects these backdrops by tag name (`BranchSwitcher.test.tsx` selects by `.fixed.inset-0` class only, which still matches after the tag change)

## 🎯 Acceptance Criteria

- [x] All 3 flagged locations no longer trigger `typescript:S1082`
- [x] No visual/behavioral regression — backdrop still closes the dialog/dropdown/sidebar on click
- [x] Existing tests pass unmodified
- [x] Lint + typecheck clean

## 🚫 Explicitly Out of Scope

- `src/components/ui/slide-panel.tsx:178` has the same underlying pattern but was **not** one of the 3 SonarCloud-flagged locations for this issue — left untouched, per explicit decision to stay scoped to the reported findings.

---

## 🔗 References

- SonarCloud project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S1082
- GitHub Issue: [#322](https://github.com/pakodiazdev/sushigo/issues/322)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1.5h` · **Tracked:** `12m`

### 📅 Sessions
```json
[
  { "date": "2026-07-26", "start": "19:07", "end": "19:19" }
]
```

## 📊 Retrospective
- **Actual total:** 12m (12m)
- **vs optimistic:** −18m
- **vs pessimistic:** −1h18m

**Justification:**

The fix was a mechanical, well-scoped change: three near-identical backdrop `<div onClick>` elements converted to `<button>`, reusing an idiom already established elsewhere in the codebase (`dialog-frame.tsx`). No new behavior, no ambiguity in the approach, and existing tests already covered the affected components (confirmed passing without modification), so there was no back-and-forth or rework.
