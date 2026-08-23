import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { ProductVariantUomRef, VariantPurchasePresentation } from '@/types/inventory'
import { usePurchasePresentationForm } from './use-purchase-presentation-form'

interface PurchasePresentationFormProps {
  productId: string
  variantId: string
  variantUom: ProductVariantUomRef | null
  presentation?: VariantPurchasePresentation | null
  assignedTemplateIds: string[]
  onSuccess: (presentation: VariantPurchasePresentation) => void
  onCancel: () => void
}

/**
 * Assign / edit / deactivate / reactivate a Variant Purchase Presentation — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.1/§5.2
 * (PresentationAssign state). Reused for both the "+ Assign template" (create) and an
 * existing assignment's edit screen: in edit mode the template is read-only (immutable once
 * assigned — see UpdateVariantPurchasePresentationRequest on the backend) and an Active
 * checkbox becomes the deactivate/reactivate control, matching VariantForm's own precedent.
 */
export function PurchasePresentationForm({
  productId,
  variantId,
  variantUom,
  presentation,
  assignedTemplateIds,
  onSuccess,
  onCancel,
}: Readonly<PurchasePresentationFormProps>) {
  const {
    isEditing,
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
  } = usePurchasePresentationForm({ productId, variantId, variantUom, presentation, assignedTemplateIds, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        {isEditing ? (
          <FormField label="Template">
            <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground">
              {presentation?.template?.name ?? 'Unknown template'}
              {presentation?.template && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {presentation.template.package_type} · ×{presentation.template.base_unit_quantity}
                </span>
              )}
            </p>
          </FormField>
        ) : (
          <FormField label="Template" required error={allErrors.template_id}>
            <Select
              {...register('template_id')}
              error={!!allErrors.template_id}
              disabled={isTemplatesLoading}
            >
              <option value="">Select a template…</option>
              {assignableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.package_type} · ×{template.base_unit_quantity})
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {normalizationHint && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {normalizationHint}
          </p>
        )}

        {isUomMismatch && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              This template&apos;s compatible unit ({selectedTemplate?.compatible_dimension_uom?.symbol}) doesn&apos;t
              match this Variant&apos;s base unit ({variantUom?.symbol}). Choose a compatible template instead.
            </span>
          </div>
        )}

        <FormField label="Package Barcode" error={allErrors.package_barcode}>
          <Input
            {...register('package_barcode')}
            placeholder="Optional — separate from the Variant's own unit barcode"
            error={!!allErrors.package_barcode}
          />
        </FormField>

        <Checkbox
          id="presentation-is-default"
          checked={isDefault}
          onChange={(e) => setValue('is_default', e.target.checked)}
          label="Default presentation for this Variant"
        />

        {isEditing && (
          <Checkbox
            id="presentation-is-active"
            checked={isActive}
            onChange={(e) => setValue('is_active', e.target.checked)}
            label="Active"
          />
        )}
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isUomMismatch}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save' : 'Assign'} Presentation
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
