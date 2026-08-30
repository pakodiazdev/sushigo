import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useItemsSelect, useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { useSuggestedCodeField } from '@/hooks/use-suggested-code-field'
import { isApiError } from '@/lib/api-error'
import { itemVariantApi } from '@/services/inventory-api'
import type { ItemVariant } from '@/types/inventory'

export const legacyVariantSchema = z.object({
  item_id: z.string().min(1, 'El artículo es requerido'),
  code: z.string().trim().min(2, 'El SKU debe tener al menos 2 caracteres').max(100),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  uom_id: z.string().min(1, 'La unidad base es requerida'),
  is_active: z.boolean(),
})

export type LegacyVariantFormValues = z.infer<typeof legacyVariantSchema>

interface UseLegacyVariantFormOptions {
  variant?: ItemVariant | null
  onSuccess: () => void
  preselectedItemId?: string | number
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

export function useLegacyVariantForm({
  variant,
  onSuccess,
  preselectedItemId,
}: Readonly<UseLegacyVariantFormOptions>) {
  const isEditing = Boolean(variant)
  const { data: items = [] } = useItemsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LegacyVariantFormValues>({
    resolver: zodResolver(legacyVariantSchema),
    defaultValues: {
      item_id: String(variant?.item_id || preselectedItemId || ''),
      code: variant?.code || '',
      name: variant?.name || '',
      uom_id: String(variant?.uom_id || ''),
      is_active: variant?.is_active ?? true,
    },
  })

  const itemId = watch('item_id')
  const variantName = watch('name')
  const uomId = watch('uom_id')
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const hasSuggestionContext = !isEditing && itemId.length > 0 && variantName.trim().length > 0 && uomId.length > 0
  const debouncedName = useDebouncedValue(variantName, 400)
  const hasSettledSuggestionContext = hasSuggestionContext && variantName === debouncedName
  const suggestion = useSuggestedCode(
    ['legacy-item-variants', 'suggest-code', itemId, debouncedName, uomId],
    async () => {
      const response = await itemVariantApi.suggestCode({ item_id: itemId, name: debouncedName, uom_id: uomId })
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
    contextKey: `${itemId}\u0000${variantName}\u0000${uomId}`,
    canPrefill: hasSettledSuggestionContext,
    suggestion,
    codeField,
    writeCode,
    normalizeCode: (code) => code.toUpperCase(),
    onManualEditChange: setCodeManuallyEdited,
    clearValidationOnManualCollision: true,
  })

  const { mutation, validationErrors, clearValidationErrors, isPending } = useFormMutation({
    mutationFn: (data: LegacyVariantFormValues) => isEditing
      ? itemVariantApi.update(variant!.id, data)
      : itemVariantApi.create(data),
    successMessage: isEditing ? 'Variante actualizada' : 'Variante creada',
    errorMessageFallback: 'No fue posible guardar la variante',
    shouldSuppressErrorToast: (error) => Boolean(collisionResponse(error)),
    onSuccess,
  })

  const onSubmit = async (data: LegacyVariantFormValues) => {
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

  return {
    isEditing,
    items,
    units,
    register,
    codeField,
    onCodeChange: suggestedCodeField.onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors: {
      item_id: errors.item_id?.message || validationErrors.item_id,
      code: errors.code?.message || validationErrors.code,
      name: errors.name?.message || validationErrors.name,
      uom_id: errors.uom_id?.message || validationErrors.uom_id,
    },
    itemId,
    uomId,
    isActive: watch('is_active'),
    isPending,
    isSubmitDisabled: isPending || (
      hasSuggestionContext
      && !codeManuallyEdited
      && !suggestedCodeField.prefillCode
    ),
    currentCode: watch('code'),
    canSuggestCode: hasSuggestionContext,
    isCodeSuggested: !isEditing && !suggestedCodeField.codeManuallyEdited && Boolean(suggestedCodeField.prefillCode),
    isSuggestionLoading: suggestion.isLoading,
    isRefreshingCode: suggestion.isRefreshing,
    suggestionFailed: suggestion.isError,
    handleRefreshCode: suggestedCodeField.handleRefreshCode,
    collision: suggestedCodeField.collision,
    canApplySuggestedCode: suggestedCodeField.collision !== null && suggestedCodeField.codeManuallyEdited,
    applySuggestedCode: () => suggestedCodeField.applySuggestedCode(clearValidationErrors),
  }
}
