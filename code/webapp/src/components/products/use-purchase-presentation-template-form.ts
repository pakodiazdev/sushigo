import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { useSuggestedCodeField } from '@/hooks/use-suggested-code-field'
import { isApiError } from '@/lib/api-error'
import { purchasePresentationTemplateApi } from '@/services/inventory-api'
import type { PurchasePresentationPackageType, PurchasePresentationTemplate, UnitOfMeasure } from '@/types/inventory'

type UomOption = Pick<UnitOfMeasure, 'id' | 'name' | 'symbol'>

export const PACKAGE_TYPE_OPTIONS: { value: PurchasePresentationPackageType; label: string }[] = [
  { value: 'UNIT', label: 'Unidad' },
  { value: 'PACK', label: 'Paquete' },
  { value: 'BOX', label: 'Caja' },
  { value: 'TRAY', label: 'Charola' },
]

// Package type / base quantity / compatible UOM become immutable server-side once a template
// has any assignment history (see UpdatePurchasePresentationTemplateRequest on the backend) —
// the form doesn't need to know that state up front, a resend of the current, unchanged value
// is always accepted, and any real attempt to change a locked field simply surfaces as a normal
// 422 field error (allErrors below), same as the duplicate/UOM-mismatch handling on the
// assignment form.
const templateSchema = z.object({
  code: z.string().trim().min(1, 'El código es requerido').max(50, 'El código no puede exceder 50 caracteres'),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  package_type: z.string().min(1, 'El tipo de empaque es requerido'),
  base_unit_quantity: z.string().trim().min(1, 'La cantidad base es requerida'),
  compatible_dimension_uom_id: z.string().min(1, 'La unidad compatible es requerida'),
  is_active: z.boolean(),
})

export type PurchasePresentationTemplateFormValues = z.infer<typeof templateSchema>

export interface UsePurchasePresentationTemplateFormOptions {
  template?: PurchasePresentationTemplate | null
  onSuccess: (template: PurchasePresentationTemplate) => void
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

export function usePurchasePresentationTemplateForm({
  template,
  onSuccess,
}: Readonly<UsePurchasePresentationTemplateFormOptions>) {
  const isEditing = !!template

  const { data: uoms = [], isLoading: isUomsLoading } = useUnitsOfMeasureSelect()

  // useUnitsOfMeasureSelect only returns active UOMs. Editing a template whose compatible UOM
  // has since been deactivated must still show it as the selected option — otherwise the
  // required select renders with no matching value, and any update to the template (rename,
  // deactivate, ...) fails client-side with "Compatible unit is required" even though that
  // field isn't actually changing. Mirrors use-variant-form.ts's identical fix for a Variant's
  // own inactive current UOM. Only ever appends the template's current UOM — never widens the
  // list of *selectable new* units.
  const uomOptions: UomOption[] = useMemo(() => {
    if (!template?.compatible_dimension_uom || uoms.some((uom) => uom.id === template.compatible_dimension_uom!.id)) {
      return uoms
    }
    return [...uoms, template.compatible_dimension_uom]
  }, [uoms, template])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchasePresentationTemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      code: template?.code || '',
      name: template?.name || '',
      package_type: template?.package_type || '',
      base_unit_quantity: template?.base_unit_quantity != null ? String(template.base_unit_quantity) : '',
      compatible_dimension_uom_id: template?.compatible_dimension_uom?.id
        ? String(template.compatible_dimension_uom.id)
        : '',
      is_active: template?.is_active ?? true,
    },
  })

  const packageType = watch('package_type')
  const baseQuantity = watch('base_unit_quantity')
  const compatibleUomId = watch('compatible_dimension_uom_id')
  const numericQuantity = Number(baseQuantity)
  const hasSuggestionContext = !isEditing
    && PACKAGE_TYPE_OPTIONS.some((option) => option.value === packageType)
    && Number.isFinite(numericQuantity)
    && numericQuantity > 0
    && compatibleUomId.length > 0
  const debouncedBaseQuantity = useDebouncedValue(baseQuantity, 400)
  const debouncedNumericQuantity = Number(debouncedBaseQuantity)
  const hasSettledSuggestionContext = hasSuggestionContext && baseQuantity === debouncedBaseQuantity

  const suggestion = useSuggestedCode(
    ['purchase-presentation-templates', 'suggest-code', packageType, debouncedBaseQuantity, compatibleUomId],
    async () => {
      const response = await purchasePresentationTemplateApi.suggestCode({
        package_type: packageType as PurchasePresentationPackageType,
        base_unit_quantity: debouncedNumericQuantity,
        compatible_dimension_uom_id: compatibleUomId,
      })
      return { code: response.data.code, prefix: '' }
    },
    hasSettledSuggestionContext,
  )

  const codeField = register('code')
  const writeCode = useCallback(
    (code: string, shouldValidate: boolean) => setValue('code', code, { shouldValidate }),
    [setValue],
  )
  const suggestedCodeField = useSuggestedCodeField({
    isEditing,
    contextKey: `${packageType}\u0000${baseQuantity}\u0000${compatibleUomId}`,
    canPrefill: hasSettledSuggestionContext,
    suggestion,
    codeField,
    writeCode,
  })

  const { mutation, validationErrors, clearValidationErrors, isPending } = useFormMutation({
    mutationFn: (data: PurchasePresentationTemplateFormValues) => {
      const payload = {
        code: data.code,
        name: data.name,
        package_type: data.package_type as PurchasePresentationPackageType,
        base_unit_quantity: Number(data.base_unit_quantity),
        compatible_dimension_uom_id: data.compatible_dimension_uom_id,
        is_active: data.is_active,
      }
      return isEditing
        ? purchasePresentationTemplateApi.update(template!.id, payload)
        : purchasePresentationTemplateApi.create(payload)
    },
    successMessage: isEditing ? 'Plantilla actualizada' : 'Plantilla creada',
    errorMessageFallback: 'No fue posible guardar la plantilla',
    shouldSuppressErrorToast: (error) => Boolean(collisionResponse(error)),
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    package_type: errors.package_type?.message || validationErrors.package_type,
    base_unit_quantity: errors.base_unit_quantity?.message || validationErrors.base_unit_quantity,
    compatible_dimension_uom_id:
      errors.compatible_dimension_uom_id?.message || validationErrors.compatible_dimension_uom_id,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: PurchasePresentationTemplateFormValues) => {
    if (isSubmitting) return
    clearValidationErrors()
    try {
      await mutation.mutateAsync(data)
      suggestedCodeField.clearSuggestionState()
    } catch (error) {
      const body = collisionResponse(error)
      if (!body) return

      const next = {
        rejectedCode: body.rejected_code ?? data.code.toUpperCase(),
        suggestedCode: body.suggested_code,
      }
      suggestedCodeField.acceptCollision(next, clearValidationErrors)
    }
  }

  const applySuggestedCode = () => {
    suggestedCodeField.applySuggestedCode(clearValidationErrors)
  }

  const isActive = watch('is_active')

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
    isSubmitting,
    currentCode: watch('code'),
    canSuggestCode: hasSuggestionContext,
    isCodeSuggested: !isEditing
      && !suggestedCodeField.codeManuallyEdited
      && Boolean(suggestedCodeField.prefillCode),
    isSuggestionLoading: suggestion.isLoading,
    isRefreshingCode: suggestion.isRefreshing,
    suggestionFailed: suggestion.isError,
    handleRefreshCode: suggestedCodeField.handleRefreshCode,
    collision: suggestedCodeField.collision,
    canApplySuggestedCode: suggestedCodeField.collision !== null && suggestedCodeField.codeManuallyEdited,
    applySuggestedCode,
  }
}
