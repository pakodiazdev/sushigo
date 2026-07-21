# 272 - Migrate remaining raw &lt;button&gt; usages to the centralized Button component

## 📖 Story

**English:** As a frontend developer, I want every button in the webapp to use the centralized `Button` component (`src/components/ui/button.tsx`, established in #247) instead of a raw `<button className="...">`, so that styling, dark-mode contrast, and the `type` attribute are resolved once in the component instead of being hand-written (and sometimes forgotten, like #266) at every call site.

**Español:** Como desarrollador frontend, quiero que todos los botones del webapp usen el componente centralizado `Button` (`src/components/ui/button.tsx`, establecido en #247) en vez de un `<button className="...">` crudo, para que el estilo, el contraste en modo oscuro y el atributo `type` se resuelvan una sola vez en el componente en lugar de escribirse a mano (y a veces olvidarse, como en #266) en cada sitio de uso.

---

## 🧠 Context

#266 fixed 13 SonarCloud `typescript:S9011` findings (missing `type="button"`) by adding the attribute directly to raw `<button>` elements in `schedule-dialog.tsx`, `DevDebugger.tsx`, `ClockDebugPanel.tsx`, and `close.tsx`. That was the correct minimal fix for the SonarCloud gate, but it repeated the same root problem #247 already solved for styling: consumers hand-writing button markup instead of going through the centralized component.

A first grep (`grep -rln "<button" src --include="*.tsx"`) found raw `<button>` usages in ~50 files. Not all of them are in scope — this needs to be triaged during the audit:

- **In scope (likely):** feature components/pages using ad-hoc `<button className="...">` for actions that a styled `Button` variant already covers (dialogs, forms, cards, list rows) — the same class of file #247 already migrated for styling; these should also stop needing hand-written `type="button"`.
- **Needs a decision during the audit:** `components/dev/DevDebugger.tsx`, `components/devtools/ClockDebugPanel.tsx`, `components/devtools/ClockBadge.tsx` — dev-only tooling using a fixed hardcoded dark palette (`bg-gray-900`, `bg-blue-600`, etc.), not the app's `--primary`/`--foreground` theme tokens `Button` is built on. Migrating them may not be a good fit; if not, they should be explicitly excluded with a reason, not silently skipped.
- **Out of scope:** the design-system primitives themselves (`components/ui/button.tsx`, `tabs.tsx`, `dropdown-menu.tsx`, `toggle-switch.tsx`, `calendar-picker.tsx`, `data-grid.tsx`, `multi-date-calendar.tsx`, `search-input.tsx`, `slide-panel.tsx`, `toast.tsx`) — these implement the design system rather than consume it. Test files (`__tests__/`) are also out of scope.

As a companion fix, consider making `Button` default `type="button"` when no `type` prop is passed (explicit `type="submit"` still works for real form-submit buttons). That would prevent this exact SonarCloud rule from recurring for every future `Button` consumer, the same way the centralized variants already prevent ad-hoc dark-mode overrides.

---

## ✅ Technical Tasks

- [ ] 🔍 Full audit of raw `<button>` usages across `src/` (excluding `components/ui/*` primitives and `__tests__/`), classifying each as: migrate to `Button`, exclude with reason (e.g. dev-tooling with its own palette), or already-fine (e.g. a `Button`-wrapped native element)
- [ ] 🔧 Consider defaulting `Button`'s `type` prop to `"button"` when not explicitly passed, so new consumers get the SonarCloud-safe behavior for free
- [ ] 🔁 Migrate the in-scope files found in the audit to `Button` with the appropriate `variant` (see `doc/conventions/frontend/button-styles.md`)
- [ ] 📝 Update `doc/conventions/frontend/button-styles.md` if the audit surfaces a new pattern (e.g. explicit guidance for dev-tooling exclusions)
- [ ] 🧪 Update/add tests for any migrated component whose rendered markup changes in a way tests assert on

---

## 🎯 Acceptance Criteria

- [ ] Every in-scope raw `<button>` in `src/` (per the audit's classification) is migrated to the centralized `Button` component
- [ ] Excluded files are explicitly listed with a reason in this issue or the convention doc, not just silently left alone
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] SonarCloud New Code shows 0 new issues for sushigo-webapp

---

## 🔗 References

- GitHub issue: [#272](https://github.com/pakodiazdev/sushigo/issues/272)
- Triggered by review feedback on #266 (PR #269) — the 13 buttons fixed there are raw `<button>` elements that should eventually go through `Button` instead
- Same centralization pattern as [#247](../2026-07/247-centralize-button-components.md) (Button variants) and [#248](../2026-07/248-centralize-label-component.md) (Label component)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `22m`

### 📅 Sessions
```json
[
  { "date": "2026-07-21", "start": "16:45", "end": "17:07" }
]
```

## 📊 Retrospective
- **Actual total:** 22m (22 min)
- **vs optimistic:** −2h 38m
- **vs pessimistic:** −5h 38m

**Justification:**

The audit was the bulk of the estimated scope, and it resolved much smaller than expected: of the ~50 files with raw `<button>` usages, only 4 buttons across 2 files actually matched `Button`'s semantics (solid, labeled action buttons). The remaining ~90 occurrences turned out to be structurally different components — dialog backdrop click-catchers, inline icon-only utility controls, tab/step/disclosure controls, clickable card/list-row containers, and dev-only tooling with its own hardcoded palette — which were correctly excluded with documented reasons rather than migrated. That meant no risky refactor across dozens of files, keeping the session well under both estimates.
