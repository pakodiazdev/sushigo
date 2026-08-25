# Frontend Domain-Oriented Structure Convention

This convention is **mandatory for all new frontend business features** and for existing features
when they are deliberately migrated. It implements [TD-04](../../decisions/td-04-domain-oriented-frontend-structure.md).
See the [Domain-Oriented Frontend Architecture](../../architecture/frontend/domain-oriented-frontend-architecture.en.md)
for rationale, diagrams, and the complete Suppliers example.

## 1. Core rule

Business code MUST be organized by domain and feature:

```text
src/features/<domain>/<feature>/
```

Do not place new feature-specific code directly in global technical folders such as
`src/components/`, `src/hooks/`, `src/services/`, or a catch-all shared types file.

Use English for domain names, feature names, directories, filenames, components, hooks, functions,
variables, types, permissions, API resources, and API fields. The only filename/directory exception
is the `src/pages/` filesystem segment that directly defines a Spanish browser URL, as described in
section 5.

## 2. Standard feature shape

Use only the folders needed by the feature:

```text
src/features/<domain>/<feature>/
├── api/          # Resource requests and query-key factories
├── components/   # Feature-specific rendering
├── hooks/        # Orchestration, forms, queries, mutations, UI state
├── pages/        # Route-independent page compositions
├── types/        # Feature-owned contracts and view models
├── __tests__/    # Focused feature tests when not colocated
└── index.ts      # Public feature facade
```

Empty placeholder folders MUST NOT be created.

## 3. Public feature facade

Every feature consumed from outside its own directory MUST expose a root `index.ts`.

Outside consumers MUST import the public facade:

```ts
import { SuppliersPage } from '@/features/purchasing/suppliers'
```

They MUST NOT deep-import feature internals:

```ts
// Forbidden outside the Suppliers feature
import { SuppliersPage } from '@/features/purchasing/suppliers/pages/suppliers-page'
```

The facade MUST export only supported integration points. Internal forms, helper hooks, schemas,
and implementation types SHOULD remain private unless another feature has a justified dependency.

## 4. Dependency direction

Allowed dependencies:

```text
route adapter -> feature public facade
feature       -> shared UI and domain-neutral utilities
feature       -> platform infrastructure (API client, auth, stores)
feature       -> another feature's public facade, when justified and acyclic
```

Forbidden dependencies:

```text
shared code   -> business feature
feature       -> another feature's internal files
feature A     -> feature B -> feature A
```

Code MUST NOT be promoted to shared merely because it has two callers. It belongs in shared only
when its behavior and vocabulary are domain-neutral and its ownership is stable. Otherwise, keep
it with the owning domain and expose a narrow public contract.

## 5. Route adapters and frontend language

TanStack Router files remain under `src/pages/`, but they MUST be thin adapters. A route adapter may
declare:

- `createFileRoute` configuration.
- Search-parameter parsing and route parameters.
- Access guards and route-specific loaders.
- Route metadata.
- Rendering of a page exported by a feature.

It MUST NOT own feature form schemas, API mutations, query orchestration, substantial UI,
table-column definitions, or business workflows.

Frontend URLs are user-facing UI and MUST be in Spanish while the product targets Mexico without
internationalization:

```text
/inventario/proveedores
/inventario/ubicaciones
/caja/cuentas-bancarias
```

Route segments MUST use lowercase Spanish words, omit diacritics, and use kebab-case for compound
segments. Visible query-string vocabulary SHOULD also be Spanish when exposed to users.

Programming identifiers inside route files remain English:

```tsx
// src/pages/inventario/proveedores.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/purchasing/suppliers'

export const Route = createFileRoute('/inventario/proveedores')({
  component: SuppliersPage,
})
```

Dynamic parameter identifiers remain English (`$supplierId`). API URLs and fields MUST NOT be
translated (`/api/v1/inventory/suppliers`, `supplier_id`). Permissions and query keys also remain
English (`suppliers.view`, `['suppliers', 'list']`).

When changing a frontend URL that may already be bookmarked or linked, provide a redirect from the
released old path unless the change is explicitly documented as breaking.

## 6. Components and hooks

Feature-specific components MUST live inside their feature. A component using business terms such
as Supplier, Payroll, Purchase, Stock, or Dish is presumed feature-specific unless proven otherwise.

Generic visual primitives remain under `src/components/ui/`. Shared layout elements may remain in
their existing platform-level location.

The existing mandatory Custom Hook Convention continues to apply. API calls, mutations, form
schemas, normalization, and non-trivial state MUST live in a `use<Component>` or feature
orchestration hook rather than in a rendering component.

## 7. API adapters, query keys, and types

- A feature MUST own the API adapter for its primary resources.
- Query keys MUST be centralized in the owning feature rather than repeated as array literals.
- Feature request/response/form/view-model types SHOULD live in the feature.
- Generic transport types MAY remain shared.
- API resource names and payload fields MUST remain English.
- A migration MAY temporarily consume a legacy global service or type. The dependency must remain
  explicit and must not be copied into a second implementation.

## 8. Tests

Focused tests SHOULD live with the feature they verify. When moving a feature, move its focused
tests in the same refactor unless doing so would expand the PR into an unrelated test redesign.

Route tests SHOULD verify route-only responsibilities. Business behavior MUST be tested through the
feature page, component, or hook that owns it rather than through the thin adapter.

## 9. Incremental migration rules

Legacy code is not required to move solely because this convention was adopted. It MUST be migrated
incrementally under either:

- A dedicated domain-refactor issue; or
- Substantial feature work whose accepted scope includes the migration.

A migration MUST:

1. Select one cohesive feature boundary.
2. Inventory its code and consumers before moving it.
3. Preserve behavior unless a behavior change is explicitly in scope.
4. Update consumers to use the feature's public facade.
5. Document any temporary legacy dependencies.
6. Remove obsolete files and avoid parallel implementations.
7. Avoid opportunistically reorganizing unrelated domains in the same PR.

## 10. Review checklist

- [ ] New business code is under `src/features/<domain>/<feature>/`.
- [ ] The feature exports a narrow public facade.
- [ ] Consumers do not deep-import another feature.
- [ ] Shared code does not depend on a feature.
- [ ] Route adapters are thin.
- [ ] Frontend paths and visible URL vocabulary are Spanish.
- [ ] Code identifiers, permissions, and API contracts remain English.
- [ ] Stateful component behavior follows the Custom Hook Convention.
- [ ] Temporary legacy dependencies are explicit and bounded.
- [ ] Migrated code has one authoritative location.
