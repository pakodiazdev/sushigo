# Label Style Convention

> **Rule:** Use `Label` (`src/components/ui/label.tsx`) for every form field label. Never hand-write `<label className="text-sm font-medium">` (or similar) with no explicit text color — it silently inherits whatever `color` the nearest ancestor sets, which is not always the app's `--foreground` token.

## Why

The native `<dialog>` element ships a UA stylesheet that sets `color: CanvasText` directly on it (not `inherit`) — a system color that follows the OS/browser color scheme, not this app's manual `.dark` class toggle. Any descendant text node that doesn't set its own explicit `color`/Tailwind text color silently inherits that system value instead of `--foreground`, so it can render dark-on-dark regardless of the app's theme.

This bit `OvertimeDecisionDialog.tsx`: its "Método", "Tarifa por hora" and "Factor..." `<label>` elements had no explicit color class (`className="text-sm font-medium"` only) and were unreadable in dark mode. Centralizing the styling in one component — instead of every form hand-writing the same classes — means a fix like `text-foreground` only needs to be baked in once, and can never be silently omitted at a new call site.

Same root cause and same class of problem as [#247](https://github.com/pakodiazdev/sushigo/issues/247) (button styles duplicated ad-hoc instead of centralized).

## Usage

`Label` wraps a native `<label>` with contrast-safe defaults and forwards a ref, same pattern as `Input`/`Button`:

```tsx
import { Label } from '@/components/ui/label'

<Label htmlFor="agreed_rate">Tarifa por hora</Label>
```

It accepts every native `React.LabelHTMLAttributes<HTMLLabelElement>` prop (`htmlFor`, `id`, `data-*`, etc.) plus an optional `className` that is merged (not replaced) with the base styles via `cn()`. There is no `variant` prop — a label has no meaningful semantic variants the way a button does; contrast is baked in unconditionally.

## Rule

If a label needs a `className` with `text-*` color classes to stay readable, that is a signal it should be using `Label` instead of a raw `<label>` element.

```tsx
// ❌ Wrong — no explicit color, silently inherits from the nearest ancestor
<label htmlFor="valuation_method" className="text-sm font-medium">Método</label>

// ✅ Correct — contrast-safe by default, no matter what it's nested inside
<Label htmlFor="valuation_method">Método</Label>
```

## Reference migration

`OvertimeDecisionDialog.tsx` ("Método", "Tarifa por hora", "Factor...") is the reference migration for issue #248.

The following files still use the same unstyled `<label>` pattern and are candidates for a follow-up migration (not in scope for #248):

- `src/components/employees/rehire-form.tsx`
- `src/components/employees/deactivate-form.tsx`
- `src/components/employees/bonus-config-section.tsx`
- `src/components/employees/register-wage-form.tsx`
- `src/components/attendance/AttendanceTimeDialog.tsx`
- `src/components/attendance/ExtraDayNegotiationDialog.tsx`
- `src/components/employees/create-schedule-form.tsx`
- `src/components/employees/override-scope-dialog.tsx`
- `src/components/employees/vacation-policy-override.tsx`
- `src/components/settings/vacation-policy-section.tsx`
- `src/components/solicitudes/pending-requests/leave-review-content.tsx`
- `src/components/solicitudes/pending-requests/review-request-dialog.tsx`
- `src/components/solicitudes/pending-requests/vacation-review-content.tsx`
- `src/components/ui/filter-select.tsx`
- `src/components/ui/form-fields.tsx` (`FormField` and `Checkbox` both inline their own label markup)
- `src/pages/attendance/audit.tsx`
- `src/pages/attendance/config/holidays.tsx`
- `src/pages/attendance/payroll/$periodId.tsx`
- `src/pages/attendance/payroll/close.tsx` and `src/pages/attendance/payroll/index.tsx` (use hardcoded `text-gray-700` instead of `text-foreground` — worth flagging separately, doesn't follow theme tokens at all)
- `src/pages/attendance/punctuality-config-shared.tsx`
- `src/pages/forgot-password.tsx`, `src/pages/login.tsx`, `src/pages/reset-password.tsx`

See issue #248.
