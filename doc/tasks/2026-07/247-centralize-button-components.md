# 🎨 Task #247: Centralize Button Style Components

**GitHub Issue:** [#247](https://github.com/pakodiazdev/sushigo/issues/247)

## 📖 Story

**English:**
As a frontend developer, I need centralized styled button components (e.g. `ButtonPrimary`, `ButtonSecondary`, `ButtonDanger`) with light/dark contrast already baked in, so that I don't have to hand-write ad-hoc Tailwind overrides (including `dark:` variants) in every dialog that needs a visually distinct button.

**Español:**
Como desarrollador frontend, necesito componentes de botón con estilos centralizados (ej. `ButtonPrimary`, `ButtonSecondary`, `ButtonDanger`) con el contraste claro/oscuro ya resuelto, para no tener que reescribir overrides de Tailwind ad-hoc (incluyendo variantes `dark:`) en cada diálogo que necesite un botón visualmente distinto.

---

## 🧠 Context

`src/components/ui/button.tsx` only defines generic variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) via plain Tailwind class strings, with no dark-mode-aware contrast guarantees. This pushes consumers to bolt on inline `dark:` overrides per component instead of getting correct contrast for free.

Two concrete examples in the same file, `src/components/attendance/OvertimeDecisionDialog.tsx`:
- The "No pagar" button already needed inline overrides: `border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30`.
- The "Regresar" button (`variant="outline"`) blended into the dialog's `bg-card` panel in dark mode because `border-input`/`bg-background` are too close in lightness to `--card` in the dark palette. Fixed on the #229 branch with another one-off override (`border-muted-foreground/40 text-foreground hover:bg-accent hover:text-accent-foreground dark:border-muted-foreground/50 dark:hover:bg-muted/60`) — the same class of problem, duplicated again.

Both are symptoms of the same gap: button contrast/semantics are not centralized, so every new dialog re-derives (and sometimes re-breaks) them.

---

## ✅ Technical Tasks

- [x] 🔍 Audit existing ad-hoc `dark:` overrides on `Button` usages across the webapp (`grep -rn 'variant="outline"\|variant="ghost"' src | grep dark:`) — extended to a full-app scan of every `<Button>` for hardcoded palette classes, not just `dark:` ones
- [x] 🎨 Design contrast-checked light/dark styles per semantic role (primary, secondary, destructive, ghost) in `src/components/ui/button.tsx`
- [x] 🔧 Expose them as dedicated `variant` values with the styles baked in (`outline-danger`, `outline-warning`, `neutral`, `neutral-dark`, `info`, `warning`, `success`, `ghost-danger`) instead of separate `ButtonPrimary`/`ButtonSecondary` components
- [x] 🔁 Migrate `OvertimeDecisionDialog.tsx` ("No pagar" and "Regresar" buttons) to the new components as the reference migration
- [x] 📝 Document the button style guide in `doc/conventions/frontend/`

---

## 🎯 Acceptance Criteria

- [x] Centralized button components cover at least primary/secondary/destructive semantics with dark-mode contrast built in — no consumer needs to add its own `dark:border-*` / `dark:text-*` just to be visible
- [x] `OvertimeDecisionDialog.tsx` uses the new components instead of inline overrides
- [x] Style guide documented so future dialogs reuse the components instead of rewriting classes

---

## 🔗 References

- Discovered while fixing the "Regresar" button dark-mode contrast in #229 (`OvertimeDecisionDialog.tsx`, day-close overtime flow)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `~6h39m`

### 📅 Sessions
```json
[
  { "date": "2026-07-15", "start": "10:21", "end": "11:02" },
  { "date": "2026-07-15", "start": "11:02", "end": "13:24" },
  { "date": "2026-07-15", "start": "13:24", "end": "13:48" },
  { "date": "2026-07-15", "start": "13:48", "end": "15:51" },
  { "date": "2026-07-15", "start": "15:51", "end": "17:00" }
]
```

---

## 📊 Retrospective
- **Actual total:** 6h 39m (41m + 2h22m + 24m + 2h3m + 1h9m)
- **vs optimistic:** +3h 39m
- **vs pessimistic:** +39m (over)

**Justification:**
The original scope (per the issue's acceptance criteria) was a reference migration limited to the two `OvertimeDecisionDialog.tsx` buttons plus a style guide — that alone landed within the optimistic estimate (session 1, 41m). Four unplanned expansions drove the rest of the time:
1. A follow-up self-audit ("busca más botones") found the same anti-pattern repeated on `EmployeeAttendanceCard.tsx` (session 2) and, on a second, more thorough pass, across the *entire* webapp — 37 `<Button>` usages in 15 additional files using a hardcoded legacy blue/gray/amber/green palette instead of any variant at all (session 3). Migrating all of them (correctly, preserving exact existing colors per user direction) required designing 6 new variants and refactoring `ConfirmDialog`'s internal styling map.
2. Two PR review cycles (Copilot) needed doc wording fixes.
3. The expanded diff tripped SonarCloud's quality gate (coverage dropped to 75% via an untested ternary branch; duplication rose to 4.7% from two forms sharing a now-identical Cancel/Guardar block) — fixing it required extracting a new shared `CashFormFooter` component and adding two targeted tests (session 4).
4. A final external review pass (pasted Sonar/AI feedback) caught one more missed button (`SessionCard`, a sub-component inside `Dashboard.tsx`, missed by the earlier automated audit) plus an undeclared visual change (`ConfirmDialog`'s danger button silently moved from a hardcoded red to the theme's `destructive` token, affecting 10+ call sites) that needed to be fixed and disclosed in the PR description (session 5).

None of this was scope creep for its own sake — it was requested explicitly at each step (find more buttons → migrate them → pass the quality gate → address final review feedback) — but the task's true scope (full app-wide button centralization, verified to zero remaining instances) was always going to exceed a "reference migration" estimate. The 39m overrun on the pessimistic estimate reflects that gap between the original story's scope and what was actually delivered, not inefficiency within any single session.
