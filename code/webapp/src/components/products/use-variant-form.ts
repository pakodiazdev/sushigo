import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { useSuggestedCodeField } from '@/hooks/use-suggested-code-field'
import { isApiError } from '@/lib/api-error'
import { productVariantApi } from '@/services/inventory-api'
import type { ProductVariant, UnitOfMeasure } from '@/types/inventory'

type UomOption = Pick<UnitOfMeasure, 'id' | 'name' | 'symbol'>

// Catalog-identity-only contract (#424) — never asks for cost, sale price, min/max stock
// or opening balance. See doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
// No Product/Item selector — the parent Product is fixed by `productId`, never user-editable.
const variantSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  code: z.string().trim().min(1, 'El SKU es requerido').max(100, 'El SKU no puede exceder 100 caracteres'),
  barcode: z.string(),
  uom_id: z.string().min(1, 'La unidad base es requerida'),
  description: z.string(),
  track_lot: z.boolean(),
  track_serial: z.boolean(),
  is_active: z.boolean(),
})

export type VariantFormValues = z.infer<typeof variantSchema>

export interface UseVariantFormOptions {
  productId: string
  variant?: ProductVariant | null
  onSuccess: (variant: ProductVariant) => void
}

interface CodeCollisionResponse {
  rejected_code?: string
  suggested_code: string
}

function collisionResponse(error: unknown): CodeCollisionResponse | undefined {
  if (!isApiError(error)) return undefined
  const body = error.response?.data as CodeCollisionResponse | undefined

  return body?.suggested_code ? body : undefined
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

  const variantName = watch('name')
  const uomId = watch('uom_id')
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const hasSuggestionContext = !isEditing && variantName.trim().length > 0 && uomId.length > 0
  const debouncedVariantName = useDebouncedValue(variantName, 400)
  const hasSettledSuggestionContext = hasSuggestionContext && variantName === debouncedVariantName
  const suggestion = useSuggestedCode(
    ['product-variants', productId, 'suggest-code', debouncedVariantName, uomId],
    async () => {
      const response = await productVariantApi.suggestCode(productId, {
        name: debouncedVariantName,
        uom_id: uomId,
      })
      return response.data
    },
    hasSettledSuggestionContext && !codeManuallyEdited,
  )
  const codeField = register('code')
  const writeCode = useCallback(
    (code: string, shouldValidate: boolean) => setValue('code', code, { shouldValidate }),
    [setValue],
  )
  const suggestedCodeField = useSuggestedCodeField({
    isEditing,
    contextKey: `${productId}\u0000${variantName}\u0000${uomId}`,
    canPrefill: hasSettledSuggestionContext,
    suggestion,
    codeField,
    writeCode,
    onManualEditChange: setCodeManuallyEdited,
    clearValidationOnManualCollision: true,
  })

  const { mutation, validationErrors, clearValidationErrors, isPending } = useFormMutation({
    mutationFn: (data: VariantFormValues) => {
      const payload = {
        name: data.name,
        code: data.code,
        barcode: data.barcode || null,
        uom_id: data.uom_id,
        description: data.description || null,
        track_lot: data.track_lot,
        track_serial: data.track_serial,
        is_active: data.is_active,
      }
      return isEditing
        ? productVariantApi.update(productId, variant!.id, payload)
        : productVariantApi.create(productId, payload)
    },
    successMessage: isEditing ? 'Variante actualizada' : 'Variante creada',
    errorMessageFallback: 'No fue posible guardar la variante',
    shouldSuppressErrorToast: (error) => Boolean(collisionResponse(error)),
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    name: errors.name?.message || validationErrors.name,
    code: errors.code?.message || validationErrors.code,
    barcode: errors.barcode?.message || validationErrors.barcode,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
  }

  const isSubmitting = isPending
  const isSubmitDisabled = isSubmitting || (
    hasSuggestionContext
    && !codeManuallyEdited
    && !suggestedCodeField.prefillCode
  )

  const onSubmit = async (data: VariantFormValues) => {
    if (isSubmitting) return
    clearValidationErrors()
    try {
      await mutation.mutateAsync(data)
      suggestedCodeField.clearSuggestionState()
    } catch (error) {
      const body = collisionResponse(error)
      if (!body) return
      suggestedCodeField.acceptCollision({
        rejectedCode: body.rejected_code ?? data.code.toUpperCase(),
        suggestedCode: body.suggested_code,
      }, clearValidationErrors)
    }
  }

  const applySuggestedCode = () => suggestedCodeField.applySuggestedCode(clearValidationErrors)

  const isActive = watch('is_active')
  const trackLot = watch('track_lot')
  const trackSerial = watch('track_serial')

  return {
    isEditing,
    uoms: uomOptions,
    isUomsLoading,
    register,
    codeField,
    onCodeChange: suggestedCodeField.onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    trackLot,
    trackSerial,
    isSubmitting,
    isSubmitDisabled,
    currentCode: watch('code'),
    canSuggestCode: hasSuggestionContext,
    isCodeSuggested: !isEditing && !suggestedCodeField.codeManuallyEdited && Boolean(suggestedCodeField.prefillCode),
    isSuggestionLoading: suggestion.isLoading,
    isRefreshingCode: suggestion.isRefreshing,
    suggestionFailed: suggestion.isError,
    handleRefreshCode: suggestedCodeField.handleRefreshCode,
    collision: suggestedCodeField.collision,
    canApplySuggestedCode: suggestedCodeField.collision !== null && suggestedCodeField.codeManuallyEdited,
    applySuggestedCode,
  }
}
