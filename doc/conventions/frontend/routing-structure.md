# Frontend Routing Structure Convention

The application uses TanStack Router with file-based route discovery. This convention defines the
routing boundary; feature ownership is governed by the mandatory
[Frontend Domain-Oriented Structure Convention](domain-oriented-structure.md).

## Route files are adapters

Every route is declared under `src/pages/` with `createFileRoute()`. Route files MUST be thin
framework adapters, not self-contained business pages.

```tsx
// src/pages/inventario/proveedores.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/purchasing/suppliers'

export const Route = createFileRoute('/inventario/proveedores')({
  component: SuppliersPage,
})
```

A route adapter may own:

- Route declaration and metadata.
- Route/search parameter validation.
- Access guards.
- Loaders required by the routing lifecycle.
- Redirects and rendering of the feature page.

It MUST NOT own business forms, API mutations, query orchestration, substantial page markup,
table-column definitions, or feature state machines. Those responsibilities belong under
`src/features/<domain>/<feature>/`.

## Frontend paths use Spanish

Browser-visible routes are part of the user interface. While SushiGo targets Mexico and has no
internationalization layer, route segments MUST be written in Spanish:

```text
/inventario/proveedores
/inventario/productos
/inventario/ubicaciones
/caja/cuentas-bancarias
```

Use lowercase, omit diacritics, and separate compound segments with hyphens. Visible search
parameters SHOULD use Spanish vocabulary as well:

```text
/inventario/proveedores?estado=activo&pagina=2
```

This localization applies only to the browser-facing frontend contract. Code identifiers remain
English, including dynamic parameter names:

```text
File/route: /inventario/proveedores/$supplierId
Variable:   supplierId
Component:  SupplierDetails
Permission: suppliers.view
API:        /api/v1/inventory/suppliers/{supplierId}
```

API routes, resource names, payload fields, query keys, permissions, models, functions, and types
MUST remain English.

## File naming

Because TanStack Router derives the public route from the filesystem, directories and files that
represent static URL segments use the Spanish URL vocabulary (`inventario/proveedores.tsx`). This
is the routing contract, not a translation of programming identifiers. Non-route source files use
English kebab-case according to project code conventions.

Use TanStack Router's standard names:

- `__root.tsx` for the application root layout.
- `index.tsx` for an index route.
- `$parameterName.tsx` for dynamic parameters; parameter names stay English.
- A leading `-` for route-excluded colocated files only when the router convention requires it.

## Navigation and redirects

- Sidebar links, breadcrumbs, redirects, and programmatic navigation MUST use the canonical Spanish
  path.
- Do not duplicate route strings when typed TanStack navigation can be used.
- When replacing a released English frontend URL, preserve a redirect to the canonical Spanish path
  if bookmarks, messages, or external links may reference it.
- Redirect-only legacy files are transitional and MUST NOT import or duplicate feature UI.

## Lazy route chunks

A route whose page implementation is non-trivial MUST split its heavy `component` into a sibling
`*.lazy.tsx` file instead of bundling it into the application's initial entry chunk (#577). This is
the router-vite-plugin's own file-based split convention — no manual `React.lazy()`/`Suspense`
wiring, no per-route config beyond the file split itself:

```tsx
// src/pages/inventario/proveedores.tsx — critical path: route registration + guards
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/proveedores')({
  beforeLoad: requirePermission('suppliers.view'),
})
```

```tsx
// src/pages/inventario/proveedores.lazy.tsx — the heavy page, code-split into its own chunk
import { createLazyFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/purchasing/suppliers'

export const Route = createLazyFileRoute('/inventario/proveedores')({
  component: SuppliersPage,
})
```

Rules:

- `beforeLoad`, `validateSearch`, `loader`, and any other routing-lifecycle option stay on the
  `createFileRoute` file, never on the `.lazy.tsx` one. TanStack Router always resolves `beforeLoad`
  before it requests the lazy chunk, so a permission redirect never triggers the chunk download —
  the acceptance criterion that made this split safe to apply to authenticated pages in the first
  place.
- The `.lazy.tsx` file owns exactly what the plain-object `createLazyFileRoute(...)` argument is
  allowed to carry — `component` (and, if a route ever needs one, its own `pendingComponent`/
  `errorComponent`) — plus whatever private helpers/types that component alone needs. Anything a
  test or another module needs to import moves with the code that defines it: update the import path
  to `'../<route>.lazy'` rather than re-exporting it from the non-lazy file.
- Regenerate `src/routeTree.gen.ts` (`npm run generate`, or let `vite dev`/`vite build` do it) after
  adding or removing a `.lazy.tsx` sibling — the generator is what wires the dynamic `import()` for
  the split chunk into the route tree.
- Apply the split to a route as soon as its page pulls in enough feature code to matter (a data
  grid, a multi-panel CRUD flow, a dashboard) — a one-line adapter that already just re-exports a
  feature's page component (see the example above) is the common case and costs nothing extra to
  split. A trivial redirect-only stub (no `component` at all) has nothing to split.
- One router-wide loading/failure boundary covers every lazy route chunk — `defaultPendingComponent`
  and `defaultErrorComponent` on the `createRouter(...)` call in `App.tsx`, backed by
  `src/components/routing/route-fallbacks.tsx`. Do not add a per-route `pendingComponent`/
  `errorComponent` unless that specific route needs different copy or behavior than the shared
  fallback. The error fallback treats a failed chunk `import()` (`src/lib/route-chunk-error.ts`'s
  `isChunkLoadError`) specially: `reset()` alone just re-runs the same failing dynamic import, so
  that one case offers a full-page reload instead — the real fix once a new deploy has invalidated
  the client's old chunk hashes.

## Generated route tree

TanStack Router generates `src/routeTree.gen.ts`. Do not edit this file manually. It is updated by
the router tooling after route changes and remains a generated integration artifact, not a domain
module.

## Review checklist

- [ ] The route path is browser-facing Spanish.
- [ ] Programming and API identifiers remain English.
- [ ] The route file contains only routing concerns.
- [ ] The rendered page comes from a feature public facade.
- [ ] Navigation and breadcrumbs use the canonical path.
- [ ] Existing released links have a redirect when required.
- [ ] A non-trivial page component is split into a `*.lazy.tsx` sibling (see "Lazy route chunks").
- [ ] `routeTree.gen.ts` was not edited manually.
