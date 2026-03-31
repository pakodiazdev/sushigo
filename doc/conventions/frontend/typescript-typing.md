# TypeScript Strict Typing Convention

> **Rule:** Never use `any` in TypeScript code. Always use specific types or `unknown`.

This document provides detailed patterns for avoiding `any` across the codebase.

## Why No `any`?

- `any` disables TypeScript's type checking, defeating the purpose of using TypeScript
- It hides bugs that would otherwise be caught at compile time
- It makes refactoring dangerous — you don't know what will break
- ESLint rule `@typescript-eslint/no-explicit-any` enforces this

---

## Common Patterns

### 1. Error Handlers (catch blocks, onError callbacks)

The most common source of `any` is error handling. Use `unknown` and the utilities from `@/lib/api-error.ts`.

```tsx
// ❌ Wrong
onError: (error: any) => {
  setError(error.response?.data?.message || 'Failed')
}

// ✅ Correct
import { getApiErrorMessage, getApiValidationErrors, hasApiValidationErrors } from '@/lib/api-error'

onError: (error: unknown) => {
  if (hasApiValidationErrors(error)) {
    setErrors(getApiValidationErrors(error))
  }
  showError(getApiErrorMessage(error, 'Operation failed'))
}
```

**Available utilities:**

| Function | Returns | Use case |
|----------|---------|----------|
| `getApiErrorMessage(error, default)` | `string` | Extract error message for toast/alert |
| `getApiValidationErrors(error)` | `Record<string, string>` | Map field names to first error |
| `hasApiValidationErrors(error)` | `boolean` | Check if error has validation errors |
| `isApiError(error)` | type guard | Check if error is AxiosError |
| `getApiFieldError(error, field, default)` | `string` | Get specific field's error |

### 2. Array Callbacks (map, forEach, filter, find)

Import the actual type from `@/types/` and use it in callbacks.

```tsx
// ❌ Wrong
locations.map((loc: any) => <option key={loc.id}>{loc.name}</option>)

// ✅ Correct
import type { InventoryLocation } from '@/types/inventory'

locations.map((loc: InventoryLocation) => <option key={loc.id}>{loc.name}</option>)
```

If the array is already typed, you don't need to annotate the callback parameter:

```tsx
// Array is already typed as InventoryLocation[]
const locations: InventoryLocation[] = data
locations.map((loc) => loc.name) // loc is inferred as InventoryLocation
```

### 3. Event Handler Values

For input change handlers, use specific types:

```tsx
// ❌ Wrong
const handleChange = (field: string, value: any) => { ... }

// ✅ Correct — use union type
const handleChange = (field: string, value: string | number | boolean) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

// ✅ Or be more specific for the actual fields
type FormField = keyof typeof formData
const handleChange = <K extends FormField>(field: K, value: typeof formData[K]) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}
```

For select/input events:

```tsx
// ✅ Use React's event types
onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value)}
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
```

### 4. API Response Data

Define interfaces in `@/types/` and type the response.

```tsx
// ❌ Wrong
const { data } = useQuery({
  queryKey: ['items'],
  queryFn: async () => {
    const response = await apiClient.get('/items')
    return response.data as any[]  // ❌
  }
})

// ✅ Correct
import type { Item } from '@/types/inventory'
import type { PaginatedResponse } from '@/types/api'

const { data } = useQuery({
  queryKey: ['items'],
  queryFn: async (): Promise<PaginatedResponse<Item>> => {
    const response = await apiClient.get<PaginatedResponse<Item>>('/items')
    return response.data
  }
})
```

### 5. Dynamic Objects / JSON Fields

For truly dynamic data (like metadata fields), use `Record<string, unknown>`:

```tsx
// ❌ Wrong
interface User {
  id: number
  meta: any
}

// ✅ Correct
interface User {
  id: number
  meta: Record<string, unknown>
}

// When accessing meta, narrow the type:
const userName = typeof user.meta.displayName === 'string' ? user.meta.displayName : 'Unknown'
```

### 6. Third-Party Library Types

When library types are incomplete, prefer type assertion over `any`:

```tsx
// ❌ Wrong
const result = someLibraryFunction() as any

// ✅ Better — define expected shape
interface ExpectedResult {
  data: string[]
  count: number
}
const result = someLibraryFunction() as ExpectedResult

// ✅ Or use unknown and narrow
const result: unknown = someLibraryFunction()
if (isExpectedResult(result)) {
  // result is typed here
}
```

---

## Type Definition Best Practices

### Location of Types

```
src/types/
├── api.ts          # Generic API response types (PaginatedResponse, etc.)
├── auth.ts         # Auth/user types
├── inventory.ts    # Inventory domain types
├── cash.ts         # Cash management types
└── employee.ts     # Employee types
```

### Naming Conventions

- Interfaces: PascalCase (`InventoryLocation`, `StockMovement`)
- Type aliases: PascalCase (`ApiError`, `FormValues`)
- Props interfaces: `<ComponentName>Props`

### Exporting Types

```tsx
// In type definition file
export interface Item { ... }
export type ItemStatus = 'active' | 'inactive'

// In component file
import type { Item, ItemStatus } from '@/types/inventory'
```

---

## ESLint Configuration

The rule is enforced by:

```js
// eslint.config.js
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn'
  }
}
```

Run before committing:

```bash
npm run lint        # Shows any warnings
npm run typecheck   # Ensures types are valid
```

---

## Exceptions (rare)

The only acceptable uses of `any` are:

1. **Type definition files** for external libraries without types (create `.d.ts`)
2. **Gradual migration** from JavaScript (must be tracked and fixed)
3. **Test mocks** where full typing is impractical (use sparingly)

Even in these cases, prefer `unknown` with type guards over `any`.

---

## PR Review Checklist

- [ ] No `any` in new or modified code
- [ ] Error handlers use `unknown` + `@/lib/api-error.ts` utilities
- [ ] Array callbacks use imported types from `@/types/`
- [ ] New interfaces added to appropriate `@/types/*.ts` file
- [ ] `npm run lint` passes with no `no-explicit-any` warnings
