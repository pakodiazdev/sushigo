import { AlertTriangle, Loader2, PackageCheck, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocationVariantAssignments } from '../hooks/use-location-variant-assignments'
import type { VariantAssignmentState } from '../types'

interface VariantAssignmentsPanelProps {
  readonly locationId: string
}

const STATE_TABS: readonly { value: VariantAssignmentState; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'all', label: 'All' },
]

/**
 * Focused Variant-assignment panel for the Inventory Location workflow (#569),
 * deliberately separate from the replenishment-threshold editor. Lets a user
 * with `stock.manage` declare which Variants are managed at this Location
 * without receiving any quantity; unassigning is blocked by the API while
 * on-hand or reserved Stock remains and the reason is shown in a toast.
 */
export function VariantAssignmentsPanel({ locationId }: VariantAssignmentsPanelProps) {
  const {
    canManage,
    search,
    setSearch,
    state,
    setState,
    rows,
    total,
    isLoading,
    isError,
    hasMore,
    isLoadingMore,
    loadMore,
    assign,
    unassign,
    pendingVariantId,
  } = useLocationVariantAssignments(locationId)

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4" data-testid="variant-assignments-panel">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <PackageCheck className="h-4 w-4" />
        Managed variants
      </h3>
      <p className="text-xs text-muted-foreground">
        Variants managed at this location, independent of stock on hand and of replenishment thresholds.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {STATE_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={state === tab.value ? 'default' : 'outline'}
            aria-pressed={state === tab.value}
            onClick={() => setState(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Search variants</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-8"
          placeholder="Search by code, name or barcode"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading variants…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> Could not load variant assignments.
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {state === 'assigned'
            ? 'No variants are managed at this location yet.'
            : 'No matching variants.'}
        </p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
        <ul className="space-y-2">
          {rows.map((row) => {
            const isPending = pendingVariantId === row.item_variant_id
            return (
              <li
                key={row.item_variant_id}
                className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3"
                data-testid={`variant-assignment-row-${row.item_variant_code}`}
              >
                <div className="min-w-0">
                  <div className="font-medium">{row.item_variant_code}</div>
                  <div className="truncate text-sm text-muted-foreground">{row.item_variant_name}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      row.assigned
                        ? 'inline-flex items-center gap-1 text-green-700'
                        : 'text-muted-foreground'
                    }
                  >
                    {row.assigned ? 'Managed here' : 'Not managed'}
                  </span>
                  {canManage &&
                    (row.assigned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => unassign(row.item_variant_id)}
                      >
                        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        Unassign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => assign(row.item_variant_id)}
                      >
                        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        Assign
                      </Button>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>
        {hasMore && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isLoadingMore}
            onClick={() => loadMore()}
          >
            {isLoadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        )}
        </>
      )}
    </div>
  )
}
