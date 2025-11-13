import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataGridProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
  pagination?: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }
  selectedId?: string | number
  getRowId?: (item: T) => string | number
}

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading,
  emptyMessage = 'No data available',
  className,
  pagination,
  selectedId,
  getRowId = (item) => item.id,
}: DataGridProps<T>) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-border shadow sm:rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      style={{ width: column.width }}
                      className={cn(
                        'px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        !column.align && 'text-left'
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.map((item) => {
                  const rowId = getRowId(item)
                  const isSelected = selectedId === rowId

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'whitespace-nowrap px-6 py-4 text-sm',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            !column.align && 'text-left'
                          )}
                        >
                          {column.render
                            ? column.render(item)
                            : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-4 flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{pagination.currentPage}</span>{' '}
                of <span className="font-medium text-foreground">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  onClick={() =>
                    pagination.onPageChange(pagination.currentPage - 1)
                  }
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-input hover:bg-accent hover:text-accent-foreground focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    pagination.onPageChange(pagination.currentPage + 1)
                  }
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-input hover:bg-accent hover:text-accent-foreground focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
