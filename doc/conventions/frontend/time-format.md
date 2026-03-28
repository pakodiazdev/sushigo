# Time Display Format Convention

## Overview

The application supports two clock display formats, configurable per environment.
The API always returns times in **24-hour format** (`HH:mm`).
The frontend converts them to the configured display format before rendering.

## Configuration

Set in `.env` (and `.env.example`):

```env
# '12' = h:mm AM/PM  (default)
# '24' = HH:mm
VITE_TIME_FORMAT=12
```

| Value | Example output   | Use case                         |
|-------|-----------------|----------------------------------|
| `12`  | 1:00 PM, 9:30 AM | Default — Mexican restaurant ops |
| `24`  | 13:00, 09:30     | Preferred in some back-office UIs |

## Usage in Components

Import and call `formatTime` from `@/lib/time-format` whenever displaying a time string:

```tsx
import { formatTime } from '@/lib/time-format'

// Reads VITE_TIME_FORMAT automatically
<td>{formatTime(day.expected_start)}</td>   // → "1:00 PM" or "13:00"
<td>{formatTime(null)}</td>                 // → "—"

// One-off override (e.g., force 24hr in an input label)
<span>{formatTime(value, '24')}</span>
```

## Rules

1. **Never display raw API time strings** — always pass through `formatTime()`.
2. **`<input type="time">`** is exempt — HTML time inputs always use `HH:mm` as their
   internal value (browser-native); their *visual* display follows the OS locale
   automatically. Do not format their `value` prop.
3. **The API contract is always 24hr** — the backend returns `H:i` (`HH:mm`) and
   accepts `H:i` on input. Only the frontend layer applies the display conversion.
4. **`formatTime(null)` returns `"—"`** — use it directly without null guards.

## Where it Applies

- Schedule configuration table (Configuración tab)
- Weekly calendar projection (Vista semanal tab)
- Override list dialog (Excepciones — Día)
- Any future UI component that shows schedule or attendance times

## Adding `formatTime` to a New Component

```tsx
// 1. Import
import { formatTime } from '@/lib/time-format'

// 2. Replace raw time strings
// ❌ Before:  {record.check_in ?? '—'}
// ✅ After:   {formatTime(record.check_in)}
```

## Extending to Other Formats

If a future requirement needs a third format (e.g., locale-aware via `Intl`),
add it to `TimeFormat` in `src/lib/time-format.ts` and update `VITE_TIME_FORMAT`
in both env files and this document.
