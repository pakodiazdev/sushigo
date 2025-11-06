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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-gray-200 shadow sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      style={{ width: column.width }}
                      className={cn(
                        'px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500',
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
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((item) => {
                  const rowId = getRowId(item)
                  const isSelected = selectedId === rowId

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-gray-50',
                        isSelected && 'bg-indigo-50'
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
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{pagination.currentPage}</span>{' '}
                of <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  onClick={() =>
                    pagination.onPageChange(pagination.currentPage - 1)
                  }
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    pagination.onPageChange(pagination.currentPage + 1)
                  }
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
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
