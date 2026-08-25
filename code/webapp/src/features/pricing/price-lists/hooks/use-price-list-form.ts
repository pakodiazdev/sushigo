import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { priceListApi } from '../api/pricing-api'
import type { PriceList } from '../types'

const priceListSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50, 'Code must be at most 50 characters'),
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  description: z.string(),
  priority: z.number().int('Priority must be a whole number'),
  is_active: z.boolean(),
})

export type PriceListFormValues = z.infer<typeof priceListSchema>

export interface UsePriceListFormOptions {
  priceList?: PriceList | null
  onSuccess: (priceList: PriceList) => void
}

export function usePriceListForm({ priceList, onSuccess }: Readonly<UsePriceListFormOptions>) {
  const isEditing = !!priceList

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      code: priceList?.code || '',
      name: priceList?.name || '',
      description: priceList?.description || '',
      priority: priceList?.priority ?? 0,
      is_active: priceList?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: PriceListFormValues) =>
      priceListApi.create({
        code: data.code,
        name: data.name,
        description: data.description || null,
        priority: data.priority,
        is_active: data.is_active,
      }),
    updateFn: (data: PriceListFormValues) =>
      priceListApi.update(priceList!.id, {
        code: data.code,
        name: data.name,
        description: data.description || null,
        priority: data.priority,
        is_active: data.is_active,
      }),
    entityName: 'Price List',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    priority: errors.priority?.message || validationErrors.priority,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: PriceListFormValues) => {
    if (isSubmitting) return
    await execute(data)
  }

  const isActive = watch('is_active')

  return {
    isEditing,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
  }
}
