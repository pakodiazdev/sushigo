import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-fields'
import type { ReplenishmentPolicyPayload } from '../types'

const schema = z
  .object({
    min_stock: z.number().min(0, 'Reorder point cannot be negative'),
    max_stock: z.number().min(0, 'Ceiling cannot be negative'),
    notes: z.string().max(500, 'Notes are too long').optional(),
  })
  .refine((data) => data.max_stock >= data.min_stock, {
    message: 'Ceiling must be greater than or equal to the reorder point',
    path: ['max_stock'],
  })

export type ReplenishmentPolicyFormValues = z.infer<typeof schema>

interface ReplenishmentPolicyFormProps {
  readonly defaultValues: ReplenishmentPolicyFormValues
  readonly onSubmit: (values: ReplenishmentPolicyPayload) => void
  readonly onCancel: () => void
  readonly isSaving: boolean
}

export function ReplenishmentPolicyForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSaving,
}: ReplenishmentPolicyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReplenishmentPolicyFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form
      className="flex flex-wrap items-start gap-3"
      onSubmit={handleSubmit((values) =>
        onSubmit({ min_stock: values.min_stock, max_stock: values.max_stock, notes: values.notes || null })
      )}
    >
      <FormField label="Reorder point" error={errors.min_stock?.message}>
        <Input
          type="number"
          min="0"
          step="0.01"
          className="w-28"
          {...register('min_stock', { valueAsNumber: true })}
          error={!!errors.min_stock}
        />
      </FormField>
      <FormField label="Ceiling" error={errors.max_stock?.message}>
        <Input
          type="number"
          min="0"
          step="0.01"
          className="w-28"
          {...register('max_stock', { valueAsNumber: true })}
          error={!!errors.max_stock}
        />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Input className="w-56" placeholder="Optional" {...register('notes')} error={!!errors.notes} />
      </FormField>
      <div className="flex gap-2 pt-6">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
