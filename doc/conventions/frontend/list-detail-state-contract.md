# List/Detail State Contract

> **Rule:** Every list screen renders through `DataGrid`'s built-in loading/empty/error/forbidden
> states (plus, for the shared Inventory list shell, `InventoryListLayout`'s empty-filtered vs.
> empty-unfiltered copy) instead of a hand-rolled `emptyMessage={isError ? '...' : undefined}`
> ternary. Every nested detail/sub-list section (a Product's Variants, a Price List's Assignments,
> a Supplier's offerings, …) uses `DetailStatus` (`src/components/ui/detail-status.tsx`) the same
> way, instead of a bare `{isLoading && <p>Cargando…</p>}` paragraph with no error branch.

## Why

Before #576, most Inventory list screens shared the same latent bug: a failed fetch and a
genuinely empty result rendered identically, either as `DataGrid`'s bare English default
(`emptyMessage` left `undefined` whenever the query wasn't in its `isError` branch) or as a
domain-specific empty-state card with no way to tell "nothing here" from "couldn't load this."
Existencias's own empty-assortment card went further and showed a **misleading** call-to-action
("Sin surtido configurado") on a real outage, because nothing distinguished the two cases. Nested
sections (`ProductVariants`, `PurchasePresentations`, `AssignmentsSection`, …) had loading and error
text hand-copied per component, with no retry action anywhere.

Centralizing this in `DataGrid`/`DetailStatus` means the fix — a retry button, a11y roles, a
background-refetch indicator that never wipes visible rows — only has to be written once, and a new
screen gets it by construction instead of by remembering to copy the right ternary.

## Usage — `DataGrid`

```tsx
const { data, isLoading, isError, isRefetching, refetch } = useQuery({
  queryKey: [...],
  queryFn: () => api.list(params),
  placeholderData: keepPreviousData, // keeps rows visible during a filter/page-change refetch
})

<DataGrid
  data={rows}
  columns={columns}
  loading={isLoading}
  error={isError}
  onRetry={() => refetch()}
  isRefetching={isRefetching}
  emptyTitle={hasActiveFilters ? 'Sin resultados que coincidan con los filtros' : 'Aún no hay <cosas>'}
  emptyDescription={hasActiveFilters ? 'Intenta con otros filtros o términos de búsqueda.' : 'Registra un <cosa> para verlo aquí.'}
  emptyAction={
    hasActiveFilters
      ? <button onClick={clearFilters}>Limpiar filtros</button>
      : <CanAccess permission="...create"><Button onClick={openCreate}>Crear el primero</Button></CanAccess>
  }
/>
```

- `error`/`forbidden` are mutually distinct: `forbidden` (403, via `lib/api-error.ts`'s
  `isForbiddenError()`) always renders its own fixed "No tienes permiso…" copy — a caller's
  `errorTitle` never leaks into it, since retrying a 403 can't help.
- `emptyAction` is only ever rendered when the user is actually permitted to act on it — a
  permission-gated `<CanAccess>` (or an equivalent check) around the action, never bare.
- The three Inventory screens that share `InventoryListLayout` (Insumos, Variantes, Ubicaciones)
  get the empty-filtered/unfiltered split for free via that component's own
  `hasActiveFilters`/`onClearFilters` props — see `src/components/inventory/inventory-list-layout.tsx`.

## Usage — `DetailStatus`

```tsx
{isLoading && <DetailStatus kind="loading" title="Cargando variantes…" />}
{!isLoading && isError && (
  <DetailStatus
    kind="error"
    title="No se pudieron cargar las variantes"
    description="Ocurrió un problema al obtenerlas. Intenta de nuevo."
    onRetry={onRetry}
  />
)}
```

`kind` is one of `loading | error | forbidden | not-found`; only `error` renders a retry button even
when `onRetry` is passed to another kind (same non-overridable-forbidden principle as `DataGrid`).

## Reference migration

Issue #576 (Sprint 8) migrated every canonical `/inventario/*` screen and their nested detail
sections onto this contract: Productos, Insumos, Variantes, Ubicaciones, Existencias, Proveedores,
Recepciones de Compra, Listas de Precios, Transferencias, and Movimientos (which already had the
best pre-existing loading/error split and became the reference pattern for `hasActiveFilters`).

Cypress specs stay happy-path only per `doc/conventions/testing/testing-strategy.md` — the
loading/empty/error/permission/retry states themselves are covered by the Vitest suite (`DataGrid`'s
and `DetailStatus`'s own unit tests, plus one hook-level test per screen for `isError`/`refetch`/
`hasActiveFilters`), not by new Cypress assertions.
