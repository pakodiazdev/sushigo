import { useId } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type SortDirection = 'asc' | 'desc'
export interface SortSpec { key: string; direction: SortDirection }

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T) => React.ReactNode
  sortKey?: string
  hideBelow?: Breakpoint
  skeleton?: () => React.ReactNode
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
  sorting?: SortSpec[]
  onSortChange?: (sorts: SortSpec[]) => void
  perPage?: number
  perPageOptions?: number[]
  onPerPageChange?: (perPage: number) => void
  totalResults?: number
  skeletonRows?: number
}

const HIDE_BELOW_CLASSES: Record<Breakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
}

function getPageNumbers(current: number, total: number, maxVisible: number): (number | 'ellipsis')[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []
  // Always include first page
  pages.push(1)

  // How many slots remain after first and last
  const slots = maxVisible - 2
  const halfSlots = Math.floor(slots / 2)

  if (current <= halfSlots + 2) {
    // Near the start: show [1, 2, ..., maxVisible-1, '...', total]
    for (let i = 2; i <= maxVisible - 1; i++) pages.push(i)
    pages.push('ellipsis')
  } else if (current >= total - halfSlots - 1) {
    // Near the end: show [1, '...', total-maxVisible+2, ..., total]
    pages.push('ellipsis')
    for (let i = total - maxVisible + 2; i <= total - 1; i++) pages.push(i)
  } else {
    // Middle: show [1, '...', current-halfSlots+1 .. current+halfSlots-1, '...', total]
    pages.push('ellipsis')
    const sideCount = Math.floor((slots - 1) / 2)
    for (let i = current - sideCount; i <= current + sideCount; i++) pages.push(i)
    pages.push('ellipsis')
  }

  // Always include last page
  pages.push(total)
  return pages
}

const defaultSkeleton = () => (
  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
)

const PAGE_BTN_BASE = 'relative inline-flex items-center px-3 py-2 text-sm ring-1 ring-inset ring-input focus:z-20'
const PAGE_BTN_INACTIVE = 'text-foreground hover:bg-accent hover:text-accent-foreground'
const PAGE_BTN_ACTIVE = 'bg-primary text-primary-foreground font-semibold z-10'
const NAV_BTN = 'relative inline-flex items-center px-2 py-2 text-muted-foreground ring-1 ring-inset ring-input hover:bg-accent hover:text-accent-foreground focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed'

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  loading,
  emptyMessage = 'No data available',
  className,
  pagination,
  selectedId,
  getRowId = (item) => item.id,
  sorting = [],
  onSortChange,
  perPage,
  perPageOptions = [10, 20, 50, 100],
  onPerPageChange,
  totalResults,
  skeletonRows = 5,
}: Readonly<DataGridProps<T>>) {
  const perPageId = useId()

  function handleSortClick(sortKey: string) {
    if (!onSortChange) return
    const idx = sorting.findIndex(s => s.key === sortKey)
    if (idx === -1) {
      onSortChange([...sorting, { key: sortKey, direction: 'asc' }])
    } else if (sorting[idx]!.direction === 'asc') {
      const next = [...sorting]
      next[idx] = { key: sortKey, direction: 'desc' }
      onSortChange(next)
    } else {
      onSortChange(sorting.filter((_, i) => i !== idx))
    }
  }

  function getSortIcon(sortKey: string) {
    const spec = sorting.find(s => s.key === sortKey)
    if (!spec) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    if (spec.direction === 'asc') return <ArrowUp className="h-3.5 w-3.5" />
    return <ArrowDown className="h-3.5 w-3.5" />
  }

  function getSortBadge(sortKey: string) {
    if (sorting.length <= 1) return null
    const idx = sorting.findIndex(s => s.key === sortKey)
    if (idx === -1) return null
    return (
      <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
        {idx + 1}
      </span>
    )
  }

  const hasSkeleton = columns.some(col => col.skeleton)

  // Legacy loading: no columns define skeleton → show spinner
  if (loading && !hasSkeleton) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!loading && (!data || data.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  function renderEdgeButton(Icon: LucideIcon, iconCls: string, onClick: () => void, disabled: boolean, roundedCls: string | undefined, key: string) {
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={roundedCls ? cn(NAV_BTN, roundedCls) : NAV_BTN}
      >
        <Icon className={iconCls} />
      </button>
    )
  }

  function renderLeadingEdges(pag: NonNullable<DataGridProps<T>['pagination']>, iconCls: string) {
    return [
      renderEdgeButton(ChevronsLeft, iconCls, () => pag.onPageChange(1), pag.currentPage === 1, 'rounded-l-md', 'first'),
      renderEdgeButton(ChevronLeft, iconCls, () => pag.onPageChange(pag.currentPage - 1), pag.currentPage === 1, undefined, 'prev'),
    ]
  }

  function renderTrailingEdges(pag: NonNullable<DataGridProps<T>['pagination']>, iconCls: string) {
    return [
      renderEdgeButton(ChevronRight, iconCls, () => pag.onPageChange(pag.currentPage + 1), pag.currentPage === pag.totalPages, undefined, 'next'),
      renderEdgeButton(ChevronsRight, iconCls, () => pag.onPageChange(pag.totalPages), pag.currentPage === pag.totalPages, 'rounded-r-md', 'last'),
    ]
  }

  function renderPaginationNav(pag: NonNullable<DataGridProps<T>['pagination']>, maxVisible: number, iconCls: string) {
    const leading = renderLeadingEdges(pag, iconCls)
    const trailing = renderTrailingEdges(pag, iconCls)
    return (
      <>
        {leading}
        {renderPageNav(getPageNumbers(pag.currentPage, pag.totalPages, maxVisible), pag)}
        {trailing}
      </>
    )
  }

  function renderPageNav(pages: (number | 'ellipsis')[], pag: NonNullable<DataGridProps<T>['pagination']>) {
    return pages.map((page, i) => {
      if (page === 'ellipsis') {
        return (
          <span key={`ellipsis-${pages[i - 1]}`} className={cn(PAGE_BTN_BASE, 'cursor-default text-muted-foreground')}>
            &hellip;
          </span>
        )
      }
      const isActive = page === pag.currentPage
      return (
        <button
          type="button"
          key={page}
          onClick={() => pag.onPageChange(page)}
          className={cn(PAGE_BTN_BASE, isActive ? PAGE_BTN_ACTIVE : PAGE_BTN_INACTIVE)}
          aria-current={isActive ? 'page' : undefined}
        >
          {page}
        </button>
      )
    })
  }

  const showFooter = pagination || (totalResults != null) || onPerPageChange

  let resultsInfo: React.ReactNode = null
  if (totalResults != null && pagination && perPage) {
    resultsInfo = (
      <p className="text-sm text-muted-foreground">
        Mostrando{' '}
        <span className="font-medium text-foreground">
          {(pagination.currentPage - 1) * perPage + 1}
        </span>
        {' '}-{' '}
        <span className="font-medium text-foreground">
          {Math.min(pagination.currentPage * perPage, totalResults)}
        </span>
        {' '}de{' '}
        <span className="font-medium text-foreground">{totalResults}</span>
        {' '}resultados
      </p>
    )
  } else if (pagination) {
    resultsInfo = (
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{pagination.currentPage}</span>{' '}
        of <span className="font-medium text-foreground">{pagination.totalPages}</span>
      </p>
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
                  {columns.map((column) => {
                    const isSortable = !!column.sortKey && !!onSortChange
                    const hideClass = column.hideBelow ? HIDE_BELOW_CLASSES[column.hideBelow] : ''

                    return (
                      <th
                        key={column.key}
                        scope="col"
                        style={{ width: column.width }}
                        onClick={isSortable ? () => handleSortClick(column.sortKey!) : undefined}
                        className={cn(
                          'px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          !column.align && 'text-left',
                          isSortable && 'cursor-pointer select-none hover:text-foreground',
                          hideClass,
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {column.header}
                          {isSortable && getSortIcon(column.sortKey!)}
                          {isSortable && getSortBadge(column.sortKey!)}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {loading ? (
                <tbody className="divide-y divide-border bg-card opacity-60">
                  {Array.from({ length: skeletonRows }, (_, rowIdx) => (
                    <tr key={`skeleton-${rowIdx}`}>
                      {columns.map((column) => {
                        const hideClass = column.hideBelow ? HIDE_BELOW_CLASSES[column.hideBelow] : ''
                        return (
                          <td
                            key={column.key}
                            className={cn(
                              'whitespace-nowrap px-6 py-4 text-sm',
                              column.align === 'center' && 'text-center',
                              column.align === 'right' && 'text-right',
                              !column.align && 'text-left',
                              hideClass,
                            )}
                          >
                            {(column.skeleton || defaultSkeleton)()}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              ) : (
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
                        {columns.map((column) => {
                          const hideClass = column.hideBelow ? HIDE_BELOW_CLASSES[column.hideBelow] : ''

                          return (
                            <td
                              key={column.key}
                              className={cn(
                                'whitespace-nowrap px-6 py-4 text-sm',
                                column.align === 'center' && 'text-center',
                                column.align === 'right' && 'text-right',
                                !column.align && 'text-left',
                                hideClass,
                              )}
                            >
                              {column.render
                                ? column.render(item)
                                : ((item as Record<string, unknown>)[column.key] as React.ReactNode)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Footer: Info + Per-Page + Pagination */}
      {showFooter && (
        <div className="mt-4 flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
          {/* Mobile: compact pagination */}
          {pagination && (
            <div className="flex flex-1 items-center justify-center gap-1 sm:hidden">
              {renderLeadingEdges(pagination, 'h-4 w-4')}
              <span className="px-3 py-2 text-sm text-muted-foreground">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              {renderTrailingEdges(pagination, 'h-4 w-4')}
            </div>
          )}

          {/* Desktop footer */}
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            {/* Left: results info */}
            <div>
              {resultsInfo}
            </div>

            {/* Right: per-page + pagination nav */}
            <div className="flex items-center gap-4">
              {onPerPageChange && perPage && (
                <div className="flex items-center gap-2">
                  <label htmlFor={perPageId} className="text-sm text-muted-foreground">Por pagina:</label>
                  <select
                    id={perPageId}
                    value={perPage}
                    onChange={(e) => onPerPageChange(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    {perPageOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}

              {pagination && pagination.totalPages > 1 && (
                <>
                  {/* sm to md: 5 page buttons */}
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm md:hidden">
                    {renderPaginationNav(pagination, 5, 'h-5 w-5')}
                  </nav>

                  {/* md to lg: 7 page buttons */}
                  <nav className="isolate hidden -space-x-px rounded-md shadow-sm md:inline-flex lg:hidden">
                    {renderPaginationNav(pagination, 7, 'h-5 w-5')}
                  </nav>

                  {/* lg+: 10 page buttons */}
                  <nav className="isolate hidden -space-x-px rounded-md shadow-sm lg:inline-flex">
                    {renderPaginationNav(pagination, 10, 'h-5 w-5')}
                  </nav>
                </>
              )}

              {/* Fallback: single page — no nav needed */}
              {pagination && pagination.totalPages <= 1 && null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
