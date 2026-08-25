# TD-04 · Frontend code is organized by business domain through incremental migration

## Decision

The web application adopts a **domain-oriented, feature-first structure**. New business
functionality must live under `src/features/<domain>/<feature>/` instead of being distributed by
technical type across the global `components/`, `hooks/`, `services/`, and `types/` directories.

Each feature owns its API adapter, query keys, business-facing components, hooks, feature types,
and tests. It exposes a small public API through its root `index.ts`. Route files under
`src/pages/` become thin TanStack Router adapters: they declare the public URL and render a page
exported by a feature, but do not own feature state, mutations, or substantial UI.

The first application of this decision is the Suppliers feature, whose target location is:

```text
src/features/purchasing/suppliers/
```

The internal domain and code vocabulary remain English. Frontend URL segments and user-visible
copy are Spanish because the current product is intended for Mexico and does not yet provide
internationalization. API paths, resource names, model names, permissions, variables, functions,
and libraries remain English. For example:

```text
Frontend URL:  /inventario/proveedores
Feature code:  features/purchasing/suppliers
API resource:  /api/v1/inventory/suppliers
Permission:    suppliers.view
```

This is an **incremental migration**, not a repository-wide move. Existing technical-layer code
may remain where it is until its domain is deliberately refactored. New features must follow the
target structure. Existing features should migrate when they receive substantial work or when a
dedicated refactor issue is scheduled. A feature migration must be cohesive and must not leave two
competing implementations or ambiguous ownership.

The normative rules are defined in
[Frontend Domain-Oriented Structure Convention](../conventions/frontend/domain-oriented-structure.md).
The full target model, dependency diagram, examples, and migration guide are documented in
[Domain-Oriented Frontend Architecture](../architecture/frontend/domain-oriented-frontend-architecture.en.md).

## Justification

**Why change from global technical folders?** As the application grows, one feature is currently
spread across several distant directories: UI under `components/`, page orchestration under
`pages/`, API calls under `services/`, and contracts under a large shared `types` file. Finding or
changing a complete business capability requires navigating the whole frontend, and technical
folders accumulate unrelated code with no explicit ownership boundary.

Grouping by domain makes a feature's change surface visible. A developer working on Suppliers can
find its forms, orchestration, API adapter, contracts, and focused tests in one subtree. This lowers
navigation cost, makes dependencies reviewable, and gives growing domains a place to evolve
without turning shared folders into implicit global namespaces.

**Why `purchasing/suppliers` if the current navigation says Inventory?** Internal ownership follows
business responsibility, not the menu's current visual grouping. Suppliers and their purchase
offerings describe procurement relationships. The public URL may remain under
`/inventario/proveedores` while the product navigation evolves; URL taxonomy and code ownership
are related but are not required to have identical names.

**Why keep route files outside features?** TanStack Router discovers files under `src/pages/` and
generates the typed route tree. Keeping a thin adapter there preserves framework conventions while
preventing the routing mechanism from becoming the owner of business behavior. The feature stays
portable and can be rendered from another route, dialog, or workflow without importing a route
module.

**Why not reorganize the whole frontend now?** A big-bang move would produce a wide, conflict-prone
diff, obscure behavior changes, and consume review effort without delivering equivalent value for
every legacy area. Incremental migration lets each domain boundary be validated in real work and
keeps ongoing feature delivery possible.

**Why Spanish frontend routes but English code?** URLs are visible product language: users read,
share, bookmark, and receive them in support instructions. Code and API contracts serve a different
audience and already use English consistently. Separating those concerns keeps the Mexican user
experience coherent without introducing translated identifiers into models, permissions, or
integration contracts.

## When to revisit

Revisit the URL-language rule when the product adopts internationalization or supports markets
whose users require different route languages. At that point, evaluate locale-prefixed routes,
stable language-neutral canonical URLs, and redirects as one explicit migration rather than mixing
languages ad hoc.

Revisit feature boundaries when multiple domains repeatedly depend on the same business behavior.
Do not move code to `shared` after a single reuse; first determine whether one domain should expose
a public capability, whether a new bounded context exists, or whether the code is genuinely
domain-neutral infrastructure.

Revisit the incremental strategy if legacy placement begins causing frequent circular dependencies
or blocks delivery. In that case, schedule bounded domain migrations rather than a single global
reorganization.
