import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateManualOvertimeMovement } from '@/services/overtime-bank-hooks'

const schema = z
  .object({
    date: z.string().min(1, 'La fecha es requerida'),
    movement_type: z.enum(['USED', 'ADJUSTMENT']),
    minutes: z.number().int('Debe ser un número entero'),
    reason: z.string().min(1, 'El motivo es requerido').max(500, 'Máximo 500 caracteres'),
  })
  .refine((data) => data.movement_type !== 'USED' || data.minutes > 0, {
    message: 'Los minutos deben ser mayores a 0 para un movimiento de uso',
    path: ['minutes'],
  })
  .refine((data) => data.movement_type !== 'ADJUSTMENT' || data.minutes !== 0, {
    message: 'El ajuste no puede ser 0',
    path: ['minutes'],
  })

export type ManualOvertimeMovementFormValues = z.infer<typeof schema>

export interface ManualOvertimeMovementEmployee {
  id: string
  first_name: string
  last_name: string
}

export interface UseManualOvertimeMovementDialogProps {
  employee: ManualOvertimeMovementEmployee | null
  onSuccess: () => void
}

export interface UseManualOvertimeMovementDialogResult {
  form: UseFormReturn<ManualOvertimeMovementFormValues>
  isPending: boolean
  handleSubmit: () => void
  handleClose: () => void
}

export function useManualOvertimeMovementDialog({
  employee,
  onSuccess,
}: UseManualOvertimeMovementDialogProps): UseManualOvertimeMovementDialogResult {
  const mutation = useCreateManualOvertimeMovement(employee?.id ?? '')

  const today = new Date().toISOString().slice(0, 10)

  const form = useForm<ManualOvertimeMovementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      movement_type: 'USED',
      minutes: 0,
      reason: '',
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (!employee) return

    mutation.mutate(values, {
      onSuccess: () => {
        form.reset()
        onSuccess()
      },
    })
  })

  const handleClose = () => {
    form.reset()
  }

  return {
    form,
    isPending: mutation.isPending,
    handleSubmit,
    handleClose,
  }
}
