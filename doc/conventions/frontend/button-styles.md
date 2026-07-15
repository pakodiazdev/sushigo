# Button Style Convention

> **Rule:** Use the `variant` prop on `Button` (`src/components/ui/button.tsx`) for every semantic style a button needs. Never bolt on ad-hoc contrast/palette `className` overrides (`border-*`, `text-*`, `bg-*`, and especially their `dark:` variants) to get contrast on a specific dialog or card. Layout-only classes (`w-full`, spacing, sizing) are fine on any variant.

## Why

`Button`'s `outline` variant is used across the webapp inside `bg-card` panels (dialogs, cards). Its border/background were not designed with dark-mode contrast in mind, which pushed consumers to hand-write one-off `dark:border-*` / `dark:text-*` overrides per component. Two examples both lived in `OvertimeDecisionDialog.tsx` before this convention existed:
- A "No pagar" (destructive) button needed its own inline red palette.
- A "Regresar" (neutral) button blended into the dialog's `bg-card` panel in dark mode, needing its own inline border-contrast fix.

Both are symptoms of the same gap: contrast belongs in the component, not in each consumer.

## Available variants

| Variant | Use for | Notes |
|---|---|---|
| `default` | Primary / main call to action | Solid `bg-primary` (brand color), safe in both themes by default |
| `secondary` | Secondary action using the brand secondary token | Solid `bg-secondary` |
| `outline` | Neutral action inside a card/dialog panel (e.g. "Regresar", "Cancelar" when not using `ghost`) | Dark-mode-safe border baked in — do not add your own `dark:border-*` |
| `outline-danger` | Destructive/negative action styled as outline (not a solid button) — e.g. "No pagar", "Marcar falta", "Delete" in inventory panels | Dark-mode-safe red palette baked in |
| `outline-warning` | Pending/attention action styled as outline — e.g. "Decidir horas extra" | Dark-mode-safe yellow palette baked in |
| `destructive` | Destructive action as a solid button, using the brand destructive token | Use when the action should read as more severe than `outline-danger`; also the default `confirmVariant` for `ConfirmDialog`'s `danger` variant |
| `neutral` | Solid gray "Cancelar" button in a modal footer (legacy blue/gray palette, not the brand `secondary` token) | Dark-mode-safe gray baked in — use instead of hardcoding `bg-gray-200`/`dark:bg-gray-700` |
| `neutral-dark` | Solid darker-gray action (e.g. "Deshabilitar" toggle) | One-off darker neutral tone, distinct from `neutral` |
| `info` | Solid blue "Guardar"/"Nueva X" action (legacy blue palette, not the brand `default` token) | Use instead of hardcoding `bg-blue-600` |
| `warning` | Solid amber confirm/attention action (e.g. "Dar de Baja", "Registrar ausencia") | Use instead of hardcoding `bg-amber-600` |
| `success` | Solid green positive/confirm action (e.g. "Abrir Sesión de Caja", "Habilitar", "Reingreso") | Use instead of hardcoding `bg-green-600`/`bg-emerald-600` |
| `ghost` | Lowest-emphasis action (e.g. "Cancelar" next to a stronger action) | No border, no fixed background |
| `ghost-danger` | Lowest-emphasis destructive/cancel action (e.g. an inline "Cancelar" link on a request card) | Dark-mode-safe red text baked in |
| `link` | Inline text-styled action | |

`info`/`neutral`/`warning`/`success` intentionally preserve a legacy blue/gray/amber/green palette that predates the brand tokens (`--primary` is red/pink, `--secondary` is navy) — they exist so pre-existing "Guardar"/"Cancelar" button colors don't visibly change while still being centralized. Prefer `default`/`secondary`/`destructive` for new brand-aligned UI; reach for `info`/`neutral`/`warning`/`success` only when matching this existing pattern.

## Rule

If a button needs a `className` override for `border-*`, `text-*`, `bg-*`, or any `dark:` variant of those, that is a signal the base `variant` is missing a semantic role — add or fix the variant in `button.tsx` instead of overriding it at the call site.

```tsx
// ❌ Wrong — ad-hoc override, breaks again the next time someone touches dark mode
<Button
  variant="outline"
  className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
>
  No pagar
</Button>

// ✅ Correct — semantic variant carries its own dark-mode contrast
<Button variant="outline-danger" className="w-full">
  No pagar
</Button>
```

## Reference migration

`OvertimeDecisionDialog.tsx` ("No pagar" → `outline-danger`, "Regresar" → `outline`) is the reference for migrating existing ad-hoc overrides to the centralized variants. `EmployeeAttendanceCard.tsx` ("Marcar falta" → `outline-danger`, "Decidir horas extra" → `outline-warning`) is a second migration of the same pattern.

As of issue #247, every `<Button>` usage in the webapp has been migrated off hardcoded palette `className` overrides, across `attendance/`, `cash/`, `employees/`, `inventory/`, `solicitudes/`, `dashboard/`, and `ui/confirm-dialog.tsx`. `ConfirmDialog`'s internal `variantStyles` map now resolves to a `Button` `variant` name (`confirmVariant`) instead of a raw className, so its own danger/warning/info confirm buttons go through the same system. See issue #247.
