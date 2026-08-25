import { Building2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CanAccess } from '@/components/auth'
import { useCanAccess } from '@/hooks/use-can-access'
import { useAuthStore } from '@/stores/auth.store'
import { useOperatingUnitsSelect } from '@/hooks/use-inventory-queries'
import type { PriceListAssignment } from '../types'

interface AssignmentsSectionProps {
  assignments: PriceListAssignment[]
  isLoading: boolean
  isError: boolean
  onNewAssignment: () => void
  onAssignmentClick: (assignment: PriceListAssignment) => void
}

/**
 * The embedded Assignments list shown inline in a Price List's detail view — sibling to
 * VariantPricesSection, both direct children of the Price List (not nested under each other,
 * see doc/architecture/pricing/pricing-architecture.en.md §1). Mirrors ProductVariants'
 * embedded-card pattern: selecting a row, or "+ New Assignment", takes the whole SlidePanel
 * over with a nested screen (see use-price-list-assignments.ts).
 */
export function AssignmentsSection({
  assignments,
  isLoading,
  isError,
  onNewAssignment,
  onAssignmentClick,
}: Readonly<AssignmentsSectionProps>) {
  const { availableBranches } = useAuthStore()
  const { data: operatingUnits = [] } = useOperatingUnitsSelect()
  const canEditAssignment = useCanAccess({ permission: 'price_list_assignments.update' })

  const branchName = (branchId: number) =>
    availableBranches.find((branch) => branch.id === branchId)?.name ?? `Branch #${branchId}`

  const operatingUnitName = (operatingUnitId: number | null) =>
    operatingUnitId == null
      ? null
      : (operatingUnits.find((unit) => unit.id === operatingUnitId)?.name ?? `Unit #${operatingUnitId}`)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Assignments</p>
            <p className="text-lg font-semibold text-foreground">
              {isLoading || isError ? '—' : assignments.length}
            </p>
          </div>
        </div>
        <CanAccess permission="price_list_assignments.create">
          <Button type="button" variant="outline" size="sm" onClick={onNewAssignment} className="gap-1">
            <Plus className="h-4 w-4" />
            New Assignment
          </Button>
        </CanAccess>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-muted-foreground">Failed to load assignments. Please try again.</p>
      )}

      {!isLoading && !isError && assignments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No assignments yet. Assign this list to a branch to make it resolvable.
        </p>
      )}

      {!isLoading && !isError && assignments.length > 0 && (
        <ul className="space-y-2">
          {assignments.map((assignment) => {
            const rowContent = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {branchName(assignment.branch_id)}
                    {operatingUnitName(assignment.operating_unit_id) && (
                      <span className="text-muted-foreground"> — {operatingUnitName(assignment.operating_unit_id)}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {assignment.effective_from} → {assignment.effective_to ?? 'no end date'}
                  </p>
                </div>
                <span
                  className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${assignment.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                    }`}
                >
                  {assignment.is_active ? 'Active' : 'Inactive'}
                </span>
              </>
            )

            return (
              <li key={assignment.id}>
                {canEditAssignment ? (
                  <button
                    type="button"
                    onClick={() => onAssignmentClick(assignment)}
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left">
                    {rowContent}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
