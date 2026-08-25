import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUpdateMutation, useFormMutation } from '@/hooks/use-form-mutation'
import { priceListAssignmentApi } from '../api/pricing-api'
import type { PriceListAssignment } from '../types'

const assignmentSchema = z
  .object({
    branch_id: z.number({ message: 'Branch is required' }).min(1, 'Branch is required'),
    operating_unit_id: z.number().nullable(),
    effective_from: z.string().min(1, 'Effective from is required'),
    effective_to: z.string(),
    is_active: z.boolean(),
  })
  .refine((data) => !data.effective_to || data.effective_to >= data.effective_from, {
    message: 'Effective to must be on or after effective from',
    path: ['effective_to'],
  })

export type AssignmentFormValues = z.infer<typeof assignmentSchema>

export interface UseAssignmentFormOptions {
  priceListId: string
  assignment?: PriceListAssignment | null
  onSuccess: (assignment: PriceListAssignment) => void
  /** Called after a successful delete — the documented recourse for a wrong-branch
   *  Assignment (branch is read-only once created, see the delete-and-recreate note above). */
  onDeleted?: () => void
}

export function useAssignmentForm({
  priceListId,
  assignment,
  onSuccess,
  onDeleted,
}: Readonly<UseAssignmentFormOptions>) {
  const isEditing = !!assignment

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      branch_id: assignment?.branch_id ?? 0,
      operating_unit_id: assignment?.operating_unit_id ?? null,
      effective_from: assignment?.effective_from || '',
      effective_to: assignment?.effective_to || '',
      is_active: assignment?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: AssignmentFormValues) =>
      priceListAssignmentApi.create({
        price_list_id: priceListId,
        branch_id: data.branch_id,
        operating_unit_id: data.operating_unit_id,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        is_active: data.is_active,
      }),
    updateFn: (data: AssignmentFormValues) =>
      priceListAssignmentApi.update(assignment!.id, {
        operating_unit_id: data.operating_unit_id,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        is_active: data.is_active,
      }),
    entityName: 'Assignment',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  // Conflict/tie validation errors don't land on a visible field — see
  // PriceListAssignmentService::guardNoPriorityTie/guardOperatingUnitBelongsToBranch — surface
  // them via a top-of-form banner instead of silently dropping them (Acceptance Criterion:
  // "Conflicting ranges are visible and cannot be silently saved").
  const conflictError = validationErrors.price_list_id || validationErrors.priority

  const allErrors = {
    branch_id: errors.branch_id?.message || validationErrors.branch_id,
    operating_unit_id: errors.operating_unit_id?.message || validationErrors.operating_unit_id,
    effective_from: errors.effective_from?.message || validationErrors.effective_from,
    effective_to: errors.effective_to?.message || validationErrors.effective_to,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: AssignmentFormValues) => {
    if (isSubmitting) return
    await execute(data)
  }

  const { execute: executeDelete, isPending: isDeleting } = useFormMutation({
    mutationFn: () => priceListAssignmentApi.delete(assignment!.id),
    successMessage: 'Assignment deleted successfully',
    successTitle: 'Assignment Deleted',
    errorMessageFallback: 'Failed to delete assignment',
    errorTitle: 'Delete Error',
    onSuccess: () => onDeleted?.(),
  })

  const handleDelete = () => {
    if (!assignment) return
    if (confirm('¿Estás seguro de eliminar esta asignación?')) {
      void executeDelete(undefined)
    }
  }

  const branchId = watch('branch_id')
  const operatingUnitId = watch('operating_unit_id')
  const isActive = watch('is_active')

  return {
    isEditing,
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
  }
}
