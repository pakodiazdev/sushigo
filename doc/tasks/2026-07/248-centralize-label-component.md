# 🎨 Task #248: Centralize Form Label Component

**GitHub Issue:** [#248](https://github.com/pakodiazdev/sushigo/issues/248)

## 📖 Story

**English:**
As a frontend developer, I need a centralized `Label` component (styles + behavior baked in) so that form field labels never silently lose contrast in dark mode again, instead of every form hand-writing `<label className="text-sm font-medium">` with no explicit text color.

**Español:**
Como desarrollador frontend, necesito un componente `Label` centralizado (con sus estilos y comportamiento ya resueltos) para que las etiquetas de campos de formulario nunca vuelvan a perder contraste en modo oscuro en silencio, en vez de que cada formulario escriba a mano `<label className="text-sm font-medium">` sin color de texto explícito.

---

## 🧠 Context

The native `<dialog>` element ships a UA stylesheet that sets `color: CanvasText` directly on it (not `inherit`) — a system color that follows the OS/browser color scheme, not this app's manual `.dark` class toggle. Any descendant text node that doesn't set its own explicit `color`/Tailwind text color silently inherits that system value instead of the app's `--foreground` token, so it can render dark-on-dark regardless of the app's theme.

This just bit `src/components/attendance/OvertimeDecisionDialog.tsx`: the "Método", "Tarifa por hora" and "Factor..." `<label>` elements had no explicit color class (`className="text-sm font-medium"` only) and were unreadable in dark mode. Fixed on the spot by adding `text-foreground` on the `<dialog>` panel itself (root-cause fix, cascades to every unstyled descendant). Same root cause as the "Regresar" button contrast issue also fixed on this branch (#229) — that fix happened to work because the button already set `text-foreground` explicitly, unlike these labels.

A quick grep shows this same unstyled-label pattern (`text-sm font-medium` with no color) repeated across the webapp (`rehire-form.tsx`, `deactivate-form.tsx`, `bonus-config-section.tsx`, `register-wage-form.tsx`, etc.) — all currently working only because they don't happen to sit inside a native `<dialog>`, but latent to the same bug the moment they do.

This is the same class of problem as [#247](https://github.com/pakodiazdev/sushigo/issues/247) (button styles duplicated ad-hoc instead of centralized) — labels need the same treatment.

---

## ✅ Technical Tasks

- [ ] 🔍 Audit existing `<label className="...">` usages across the webapp for missing explicit text color
- [ ] 🔧 Create a centralized `Label` component (e.g. `src/components/ui/label.tsx`) with the standard `text-sm font-medium text-foreground` styling and `htmlFor`/`disabled` behavior baked in
- [ ] 🔁 Migrate `OvertimeDecisionDialog.tsx` labels ("Método", "Tarifa por hora", "Factor...") to the new component as the reference migration
- [ ] 📝 Document the `Label` usage in `doc/conventions/frontend/` alongside the button style guide from #247

---

## 🎯 Acceptance Criteria

- [ ] Centralized `Label` component exists with contrast-safe styling that doesn't depend on inheriting from a parent that might not propagate `--foreground` (e.g. native `<dialog>`)
- [ ] `OvertimeDecisionDialog.tsx` uses it instead of raw `<label>` + hand-written classes
- [ ] Style guide documented so future forms reuse the component instead of rewriting classes

---

## 🔗 References

- Discovered while fixing the "Método" label dark-mode contrast in #229 (`OvertimeDecisionDialog.tsx`, day-close overtime flow)
- Same centralization problem as [#247](https://github.com/pakodiazdev/sushigo/issues/247) (button styles)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `1h 4m`

### 📅 Sessions
```json
[
  { "date": "2026-07-18", "start": "17:39", "end": "17:46" },
  { "date": "2026-07-19", "start": "14:10", "end": "15:07" }
]
```

---

## 📊 Retrospective
- **Actual total:** 1h 4m (7 min + 57 min)
- **vs optimistic:** −56m
- **vs pessimistic:** −2h 56m

**Justification:**

The first session (7 min) built the `Label` component, migrated `OvertimeDecisionDialog.tsx`, and wrote the convention doc — fast because it followed the exact pattern already established by `Input`/`Button` in `src/components/ui/`, with no design decisions to make. The second session (57 min, next day) was not new feature work: it covered responding to a Copilot PR review comment (tried the suggested `interface` refactor, reverted it after confirming it breaks `@typescript-eslint/no-empty-object-type`, and replied with justification), then a `/sonar-review` cycle to fix a `typescript:S6853` false positive on the same file (investigate the rule, apply a `NOSONAR` comment, commit, push, and wait for CI + SonarCloud re-scan to confirm). Most of that second session was CI/SonarCloud wait time rather than coding time.
