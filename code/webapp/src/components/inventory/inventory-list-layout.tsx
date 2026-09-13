import type { ReactNode } from 'react'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SearchInput } from '@/components/ui/search-input'
import { StatusFilterSelect } from './status-filter-select'

interface InventoryListLayoutProps<T extends { id: string | number }> {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Extra filter controls rendered between the search box and the Estado filter. */
  filters?: ReactNode
  statusValue: string
  onStatusChange: (value: string) => void
  rows: T[]
  columns: Column<T>[]
  onRowClick: (row: T) => void
  loading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** The list query failed — renders DataGrid's retry-offering state instead of the grid. */
  error?: boolean
  /** 403 — blocks the grid unconditionally, even with cached rows, unlike plain `error`. */
  forbidden?: boolean
  onRetry?: () => void
  /** True while filters/search are active — used to pick the empty-state copy below. */
  hasActiveFilters?: boolean
  /** Empty-state copy for the *unfiltered* case (no rows exist at all) — ignored while filtered. */
  emptyTitle?: string
  emptyDescription?: string
  /** Empty-state copy for the *filtered* case (a search/filter matched nothing) — each has its
   *  own generic Spanish default, so most callers never need to pass these. */
  emptyFilteredTitle?: string
  emptyFilteredDescription?: string
  /** Only rendered when rows are empty AND no filter is active (e.g. a permission-gated "create the first one" CTA). */
  emptyAction?: ReactNode
  /** Resets every filter this screen owns (search, status, and any extra `filters` control) — powers the "Limpiar filtros" empty-state action. */
  onClearFilters?: () => void
  /** Background refetch (e.g. after a filter change) while previous rows are still shown. */
  isRefetching?: boolean
}

/**
 * The search + filter bar and paginated `DataGrid` shared by the simple
 * Inventory list screens (Insumos, Variantes, Ubicaciones). Screens keep their
 * own query, columns and row-click behaviour; only the identical toolbar/grid
 * shell lives here.
 */
export function InventoryListLayout<T extends { id: string | number }>({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  statusValue,
  onStatusChange,
  rows,
  columns,
  onRowClick,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  error = false,
  forbidden = false,
  onRetry,
  hasActiveFilters,
  emptyTitle,
  emptyDescription,
  emptyFilteredTitle,
  emptyFilteredDescription,
  emptyAction,
  onClearFilters,
  isRefetching = false,
}: Readonly<InventoryListLayoutProps<T>>) {
  // Every screen using this layout at least owns search + status; extra `filters`
  // (e.g. a Tipo select) are the caller's own state, so a caller with one should
  // pass `hasActiveFilters` explicitly rather than rely on this default.
  const filtersActive = hasActiveFilters ?? Boolean(searchValue || statusValue)
  const isFilteredEmpty = !error && !forbidden && rows.length === 0 && filtersActive

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="flex-1"
        />
        {filters}
        <StatusFilterSelect value={statusValue} onChange={onStatusChange} />
      </div>

      <DataGrid
        data={rows}
        columns={columns}
        onRowClick={onRowClick}
        loading={loading}
        error={error}
        forbidden={forbidden}
        onRetry={onRetry}
        isRefetching={isRefetching}
        emptyTitle={
          isFilteredEmpty
            ? (emptyFilteredTitle ?? 'Sin resultados que coincidan con los filtros')
            : (emptyTitle ?? 'Aún no hay registros')
        }
        emptyDescription={
          isFilteredEmpty
            ? (emptyFilteredDescription ?? 'Intenta con otros filtros o términos de búsqueda.')
            : emptyDescription
        }
        emptyAction={
          isFilteredEmpty
            ? (onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-sm font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            ))
            : emptyAction
        }
        pagination={{ currentPage, totalPages, onPageChange }}
      />
    </>
  )
}
