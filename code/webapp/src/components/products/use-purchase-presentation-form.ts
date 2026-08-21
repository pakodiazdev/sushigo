import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePurchasePresentationTemplatesSelect } from '@/hooks/use-inventory-queries'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { variantPurchasePresentationApi } from '@/services/inventory-api'
import type {
  ProductVariantUomRef,
  PurchasePresentationTemplate,
  VariantPurchasePresentation,
} from '@/types/inventory'

// template_id is immutable once assigned (see UpdateVariantPurchasePresentationRequest on the
// backend) — kept in the schema so the field can still be displayed/validated uniformly across
// assign and edit modes, but never sent on update (see submitPayload below).
const presentationSchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  package_barcode: z.string(),
  is_default: z.boolean(),
  is_active: z.boolean(),
})

export type PurchasePresentationFormValues = z.infer<typeof presentationSchema>

export interface UsePurchasePresentationFormOptions {
  productId: number
  variantId: number
  /** The Variant's own base UOM — a template can only be assigned if its
   *  compatible_dimension_uom matches this (see §3.3 of the product-catalog architecture doc). */
  variantUom: ProductVariantUomRef | null
  presentation?: VariantPurchasePresentation | null
  /** Template ids already assigned to this Variant (any status) — excluded from the
   *  assignable options so a duplicate assignment is unreachable from the UI, not just
   *  rejected after submit. The backend's own 422 is still the source of truth for the
   *  residual race (see allErrors.template_id below). */
  assignedTemplateIds: string[]
  onSuccess: (presentation: VariantPurchasePresentation) => void
}

export function usePurchasePresentationForm({
  productId,
  variantId,
  variantUom,
  presentation,
  assignedTemplateIds,
  onSuccess,
}: Readonly<UsePurchasePresentationFormOptions>) {
  const isEditing = !!presentation

  const { data: templates = [], isLoading: isTemplatesLoading } = usePurchasePresentationTemplatesSelect()

  const assignableTemplates: PurchasePresentationTemplate[] = useMemo(
    () => templates.filter((template) => !assignedTemplateIds.includes(template.id)),
    [templates, assignedTemplateIds]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchasePresentationFormValues>({
    resolver: zodResolver(presentationSchema),
    defaultValues: {
      template_id: presentation?.template?.id || '',
      package_barcode: presentation?.package_barcode || '',
      is_default: presentation?.is_default ?? false,
      is_active: presentation?.is_active ?? true,
    },
  })

  const selectedTemplateId = watch('template_id')

  const selectedTemplate: PurchasePresentationTemplate | null = useMemo(() => {
    if (!selectedTemplateId) return null
    return templates.find((template) => template.id === selectedTemplateId) ?? null
  }, [templates, selectedTemplateId])

  // Editing an existing assignment always has a known-compatible template (enforced at
  // creation time), so this only ever matters while assigning a new one.
  const isUomMismatch = !isEditing
    && !!selectedTemplate?.compatible_dimension_uom
    && !!variantUom
    && selectedTemplate.compatible_dimension_uom.id !== variantUom.id

  const normalizationHint = selectedTemplate && variantUom
    ? `1 ${selectedTemplate.name} = ${selectedTemplate.base_unit_quantity} ${variantUom.symbol}`
    : null

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: PurchasePresentationFormValues) =>
      variantPurchasePresentationApi.create(productId, variantId, {
        template_id: data.template_id,
        package_barcode: data.package_barcode || null,
        is_default: data.is_default,
      }),
    updateFn: (data: PurchasePresentationFormValues) =>
      variantPurchasePresentationApi.update(productId, variantId, presentation!.id, {
        package_barcode: data.package_barcode || null,
        is_default: data.is_default,
        is_active: data.is_active,
      }),
    entityName: 'Purchase Presentation',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    template_id: errors.template_id?.message || validationErrors.template_id,
    package_barcode: errors.package_barcode?.message || validationErrors.package_barcode,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: PurchasePresentationFormValues) => {
    if (isSubmitting || isUomMismatch) return
    await execute(data)
  }

  const isDefault = watch('is_default')
  const isActive = watch('is_active')

  return {
    isEditing,
    templates,
    assignableTemplates,
    isTemplatesLoading,
    selectedTemplate,
    isUomMismatch,
    normalizationHint,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isDefault,
    isActive,
    isSubmitting,
  }
}
