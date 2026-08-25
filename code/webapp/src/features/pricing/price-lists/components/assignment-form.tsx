import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CanAccess } from '@/components/auth'
import type { PriceListAssignment } from '../types'
import { BranchContextPicker } from './branch-context-picker'
import { useAssignmentForm } from '../hooks/use-assignment-form'

interface AssignmentFormProps {
  priceListId: string
  assignment?: PriceListAssignment | null
  onSuccess: (assignment: PriceListAssignment) => void
  onCancel: () => void
  /** Called after a successful delete — required whenever an existing Assignment is passed in,
   *  since that's the only mode the Delete button renders in. */
  onDeleted?: () => void
}

/**
 * Assign / edit a Price List's Branch (or Operating Unit) context and effective range. Branch
 * is read-only once an Assignment exists — reassigning it is a new authorization decision, not
 * an update (delete + recreate instead, via the Delete button below), mirroring
 * UpdatePriceListAssignmentRequest's own restriction.
 */
export function AssignmentForm({
  priceListId,
  assignment,
  onSuccess,
  onCancel,
  onDeleted,
}: Readonly<AssignmentFormProps>) {
  const isEditing = !!assignment
  const {
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    conflictError,
    branchId,
    operatingUnitId,
    isActive,
    isSubmitting,
    handleDelete,
    isDeleting,
  } = useAssignmentForm({ priceListId, assignment, onSuccess, onDeleted })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        {conflictError && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{conflictError}</span>
          </div>
        )}

        <BranchContextPicker
          branchId={branchId || null}
          onBranchChange={(value) => setValue('branch_id', value ?? 0)}
          operatingUnitId={operatingUnitId}
          onOperatingUnitChange={(value) => setValue('operating_unit_id', value)}
          branchError={allErrors.branch_id}
          operatingUnitError={allErrors.operating_unit_id}
          branchDisabled={isEditing}
        />

        <FormField label="Effective From" required error={allErrors.effective_from}>
          <Input type="date" {...register('effective_from')} error={!!allErrors.effective_from} />
        </FormField>

        <FormField label="Effective To" error={allErrors.effective_to} hint="Optional — leave blank for no end date">
          <Input type="date" {...register('effective_to')} error={!!allErrors.effective_to} />
        </FormField>

        <Checkbox
          id="assignment-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Active"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <CanAccess permission="price_list_assignments.delete">
              <Button
                type="button"
                variant="outline-danger"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </CanAccess>
          ) : (
            <span />
          )}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isDeleting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Assignment
            </Button>
          </div>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
