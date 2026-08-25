import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { variantPriceApi } from '../api/pricing-api'
import type { VariantPrice } from '../types'

const variantPriceSchema = z
  .object({
    item_variant_id: z.string().min(1, 'Product Variant is required'),
    // decimal(15,4): kept as a string end-to-end so it round-trips exactly (see
    // StoreVariantPriceRequest's own comment on this column) — validated as a numeric string
    // here rather than coerced to a JS number, which would reintroduce float rounding.
    price: z
      .string()
      .min(1, 'Price is required')
      .regex(/^\d+(\.\d{1,4})?$/, 'Price must be a positive number with up to 4 decimal places'),
    effective_from: z.string().min(1, 'Effective from is required'),
    effective_to: z.string(),
    is_active: z.boolean(),
  })
  .refine((data) => !data.effective_to || data.effective_to >= data.effective_from, {
    message: 'Effective to must be on or after effective from',
    path: ['effective_to'],
  })

export type VariantPriceFormValues = z.infer<typeof variantPriceSchema>

export interface UseVariantPriceFormOptions {
  priceListId: string
  variantPrice?: VariantPrice | null
  onSuccess: (variantPrice: VariantPrice) => void
}

export function useVariantPriceForm({ priceListId, variantPrice, onSuccess }: Readonly<UseVariantPriceFormOptions>) {
  const isEditing = !!variantPrice

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VariantPriceFormValues>({
    resolver: zodResolver(variantPriceSchema),
    defaultValues: {
      item_variant_id: variantPrice?.item_variant_id || '',
      price: variantPrice?.price || '',
      effective_from: variantPrice?.effective_from || '',
      effective_to: variantPrice?.effective_to || '',
      is_active: variantPrice?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: VariantPriceFormValues) =>
      variantPriceApi.create(priceListId, {
        item_variant_id: data.item_variant_id,
        price: data.price,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        is_active: data.is_active,
      }),
    updateFn: (data: VariantPriceFormValues) =>
      variantPriceApi.update(priceListId, variantPrice!.id, {
        price: data.price,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        is_active: data.is_active,
      }),
    entityName: 'Variant Price',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    item_variant_id: errors.item_variant_id?.message || validationErrors.item_variant_id,
    price: errors.price?.message || validationErrors.price,
    // Overlap conflicts land on effective_from — see
    // VariantPriceService::guardNoOverlap — so no separate conflict banner is needed here,
    // unlike AssignmentForm's price_list_id-keyed conflict.
    effective_from: errors.effective_from?.message || validationErrors.effective_from,
    effective_to: errors.effective_to?.message || validationErrors.effective_to,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: VariantPriceFormValues) => {
    if (isSubmitting) return
    await execute(data)
  }

  const itemVariantId = watch('item_variant_id')
  const isActive = watch('is_active')

  return {
    isEditing,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    itemVariantId,
    isActive,
    isSubmitting,
  }
}
