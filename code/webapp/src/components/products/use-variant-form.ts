import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { productVariantApi } from '@/services/inventory-api'
import type { ProductVariant, UnitOfMeasure } from '@/types/inventory'

type UomOption = Pick<UnitOfMeasure, 'id' | 'name' | 'symbol'>

// Catalog-identity-only contract (#424) — never asks for cost, sale price, min/max stock
// or opening balance. See doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
// No Product/Item selector — the parent Product is fixed by `productId`, never user-editable.
const variantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().min(1, 'SKU is required'),
  barcode: z.string(),
  uom_id: z.string().min(1, 'Base unit is required'),
  description: z.string(),
  track_lot: z.boolean(),
  track_serial: z.boolean(),
  is_active: z.boolean(),
})

export type VariantFormValues = z.infer<typeof variantSchema>

export interface UseVariantFormOptions {
  productId: number
  variant?: ProductVariant | null
  onSuccess: (variant: ProductVariant) => void
}

export function useVariantForm({ productId, variant, onSuccess }: Readonly<UseVariantFormOptions>) {
  const isEditing = !!variant

  const { data: uoms = [], isLoading: isUomsLoading } = useUnitsOfMeasureSelect()

  // useUnitsOfMeasureSelect only returns active UOMs — correct for the stock-movement forms
  // it's shared with, where offering an inactive unit as a new choice would be wrong. But
  // editing a Variant whose UOM has since been deactivated must still show it as the selected
  // option; otherwise the required select renders empty (option list has no matching value),
  // and since the backend also forbids changing a variant's UOM once it has stock/movement
  // history, that variant becomes impossible to edit or deactivate at all. Only ever appends
  // the variant's own current UOM — never widens the list of *selectable new* units.
  const uomOptions: UomOption[] = useMemo(() => {
    if (!variant?.uom || uoms.some((uom) => uom.id === variant.uom!.id)) {
      return uoms
    }
    return [...uoms, variant.uom]
  }, [uoms, variant])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: variant?.name || '',
      code: variant?.code || '',
      barcode: variant?.barcode || '',
      uom_id: variant?.uom?.id ? String(variant.uom.id) : '',
      description: variant?.description || '',
      track_lot: variant?.track_lot ?? false,
      track_serial: variant?.track_serial ?? false,
      is_active: variant?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: VariantFormValues) =>
      productVariantApi.create(productId, {
        name: data.name,
        code: data.code,
        barcode: data.barcode || null,
        uom_id: Number(data.uom_id),
        description: data.description || null,
        track_lot: data.track_lot,
        track_serial: data.track_serial,
        is_active: data.is_active,
      }),
    updateFn: (data: VariantFormValues) =>
      productVariantApi.update(productId, variant!.id, {
        name: data.name,
        code: data.code,
        barcode: data.barcode || null,
        uom_id: Number(data.uom_id),
        description: data.description || null,
        track_lot: data.track_lot,
        track_serial: data.track_serial,
        is_active: data.is_active,
      }),
    entityName: 'Variant',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    name: errors.name?.message || validationErrors.name,
    code: errors.code?.message || validationErrors.code,
    barcode: errors.barcode?.message || validationErrors.barcode,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: VariantFormValues) => {
    if (isSubmitting) return
    await execute(data)
  }

  const isActive = watch('is_active')
  const trackLot = watch('track_lot')
  const trackSerial = watch('track_serial')

  return {
    isEditing,
    uoms: uomOptions,
    isUomsLoading,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    trackLot,
    trackSerial,
    isSubmitting,
  }
}
