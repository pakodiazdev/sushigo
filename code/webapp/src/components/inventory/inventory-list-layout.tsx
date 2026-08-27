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
}: Readonly<InventoryListLayoutProps<T>>) {
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
        pagination={{ currentPage, totalPages, onPageChange }}
      />
    </>
  )
}
