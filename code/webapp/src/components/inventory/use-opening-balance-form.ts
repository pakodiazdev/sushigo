import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  useInventoryLocationsSelect,
  useItemVariantsSelect,
  useUnitsOfMeasureSelect,
} from '@/hooks/use-inventory-queries'
import { stockMovementApi } from '@/services/inventory-api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { ItemVariant, OpeningBalancePreview } from '@/types/inventory'
import { variantAssignmentQueryKeys } from '@/features/inventory/assignments'
import { replenishmentQueryKeys } from '@/features/inventory/replenishment'

const openingBalanceSchema = z.object({
  inventory_location_id: z.string().min(1, 'Selecciona una ubicación'),
  item_variant_id: z.string().min(1, 'Selecciona una variante'),
  quantity: z.number().gt(0, 'La cantidad debe ser mayor que 0'),
  uom_id: z.string().min(1, 'Selecciona una unidad de medida'),
  // Optional: a cleared field registers as `undefined` (see the form's
  // `setValueAs`), which the API accepts as "skip the weighted-average blend".
  // An explicit numeric 0 (free stock) is preserved and still blends.
  unit_cost: z.number().min(0, 'El costo no puede ser negativo').optional(),
  notes: z.string(),
})

export type OpeningBalanceFormValues = z.infer<typeof openingBalanceSchema>

interface UseOpeningBalanceFormArgs {
  onSuccess: () => void
  preselectedLocationId?: string
  preselectedVariantId?: string
}

/**
 * Owns every non-presentational concern of the Opening Balance form (#570):
 * the reference selects, react-hook-form wiring, the debounced backend
 * conversion/valuation preview, the posting mutation, and the canonical
 * query invalidation that refreshes Existencias without a reload.
 */
export function useOpeningBalanceForm({
  onSuccess,
  preselectedLocationId,
  preselectedVariantId,
}: UseOpeningBalanceFormArgs) {
  const queryClient = useQueryClient()
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)

  const { data: locations = [] } = useInventoryLocationsSelect()
  const { data: variants = [] } = useItemVariantsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OpeningBalanceFormValues>({
    resolver: zodResolver(openingBalanceSchema),
    defaultValues: {
      inventory_location_id: preselectedLocationId || '',
      item_variant_id: preselectedVariantId || '',
      quantity: 0,
      uom_id: '',
      unit_cost: undefined,
      notes: '',
    },
  })

  const inventoryLocationId = watch('inventory_location_id')
  const itemVariantId = watch('item_variant_id')
  const uomId = watch('uom_id')
  const quantity = watch('quantity')
  const rawUnitCost = watch('unit_cost')

  // The cost is optional: a cleared field is `undefined` (via the form's
  // `setValueAs`), meaning "omit it" — the API skips the blend. Guard against a
  // stray NaN too (it would keep the preview permanently stale, NaN !== NaN);
  // an explicit numeric 0 (free stock) passes through and still blends.
  const unitCost =
    typeof rawUnitCost === 'number' && !Number.isNaN(rawUnitCost) ? rawUnitCost : undefined

  // Auto-fill the entry UoM from the variant's own base unit when the variant
  // changes (an operator can still override it to an alternate entry unit).
  useEffect(() => {
    if (itemVariantId && variants.length > 0) {
      const variant = variants.find((v: ItemVariant) => v.id === itemVariantId)
      if (variant) {
        setSelectedVariant(variant)
        setValue('uom_id', variant.uom?.id ?? '')
      }
    } else {
      setSelectedVariant(null)
    }
  }, [itemVariantId, variants, setValue])

  // Debounce the numeric inputs so a keystroke doesn't fire a preview request
  // per character.
  const debouncedQuantity = useDebouncedValue(quantity, 400)
  const debouncedUnitCost = useDebouncedValue(unitCost, 400)

  // The preview lags the live form values by up to the debounce window, but a
  // submit uses the live react-hook-form values immediately. Treat the loaded
  // preview as stale whenever the live numbers have moved ahead of what it was
  // computed for, so the operator can never confirm a total for the previous
  // input while posting the new amount (#570).
  const previewIsStale = quantity !== debouncedQuantity || unitCost !== debouncedUnitCost

  const previewEnabled =
    inventoryLocationId.length > 0 &&
    itemVariantId.length > 0 &&
    uomId.length > 0 &&
    debouncedQuantity > 0

  const previewQuery = useQuery<OpeningBalancePreview, unknown>({
    queryKey: [
      'opening-balance-preview',
      inventoryLocationId,
      itemVariantId,
      uomId,
      debouncedQuantity,
      debouncedUnitCost,
    ],
    enabled: previewEnabled,
    retry: false,
    queryFn: async () => {
      const response = await stockMovementApi.openingBalancePreview({
        inventory_location_id: inventoryLocationId,
        item_variant_id: itemVariantId,
        quantity: debouncedQuantity,
        uom_id: uomId,
        // Forward the cost verbatim — an explicit 0 is a real cost that still
        // blends into Stock.weighted_avg_cost (the backend distinguishes 0 from
        // an omitted null); collapsing 0 to undefined would make the preview
        // report "Sin costo" and diverge from what the posting records (#570).
        unit_cost: debouncedUnitCost,
      })
      return response.data.data
    },
  })

  const invalidateExistenciasQueries = () => {
    // Stock list + valuation + low-stock all derive from this single query in
    // the Existencias dashboard.
    queryClient.invalidateQueries({ queryKey: ['stock-all'] })
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] })
    queryClient.invalidateQueries({ queryKey: ['stock-by-variant'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-locations-dashboard'] })
    queryClient.invalidateQueries({ queryKey: variantAssignmentQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: replenishmentQueryKeys.all })
  }

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (data: OpeningBalanceFormValues) =>
      stockMovementApi.openingBalance({
        inventory_location_id: data.inventory_location_id,
        item_variant_id: data.item_variant_id,
        quantity: data.quantity,
        uom_id: data.uom_id,
        // An explicit 0 is a real cost that blends 0 into the weighted average;
        // the untouched optional field remains undefined and skips the blend.
        unit_cost: data.unit_cost,
        notes: data.notes || undefined,
      }),
    successMessage: 'Saldo inicial registrado correctamente',
    successTitle: 'Existencias actualizadas',
    errorMessageFallback: 'No se pudo registrar el saldo inicial',
    onSuccess: () => {
      invalidateExistenciasQueries()
      onSuccess()
    },
  })

  const allErrors = {
    inventory_location_id:
      errors.inventory_location_id?.message || validationErrors.inventory_location_id,
    item_variant_id: errors.item_variant_id?.message || validationErrors.item_variant_id,
    quantity: errors.quantity?.message || validationErrors.quantity,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
    unit_cost: errors.unit_cost?.message || validationErrors.unit_cost,
    notes: errors.notes?.message || validationErrors.notes,
  }

  const previewErrorMessage =
    previewQuery.isError && !previewIsStale
      ? getApiErrorMessage(previewQuery.error, 'No se pudo calcular la conversión para esta unidad')
      : undefined

  const onSubmit = async (data: OpeningBalanceFormValues) => {
    await execute(data)
  }

  return {
    register,
    handleSubmit,
    onSubmit,
    setFieldValue: setValue,
    values: { inventoryLocationId, itemVariantId, uomId, quantity, unitCost },
    errors: allErrors,
    locations,
    variants,
    units,
    selectedVariant,
    // Never expose a preview computed for superseded input.
    preview: previewIsStale ? undefined : previewQuery.data,
    previewLoading: previewEnabled && (previewQuery.isFetching || previewIsStale),
    previewErrorMessage,
    isPending,
  }
}
