import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { PurchasePresentationTemplate } from '@/types/inventory'
import { PACKAGE_TYPE_OPTIONS, usePurchasePresentationTemplateForm } from './use-purchase-presentation-template-form'

interface PurchasePresentationTemplateFormProps {
  template?: PurchasePresentationTemplate | null
  onSuccess: (template: PurchasePresentationTemplate) => void
  onCancel: () => void
}

export function PurchasePresentationTemplateForm({
  template,
  onSuccess,
  onCancel,
}: Readonly<PurchasePresentationTemplateFormProps>) {
  const isEditing = !!template
  const {
    uoms,
    isUomsLoading,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
  } = usePurchasePresentationTemplateForm({ template, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Code" required error={allErrors.code}>
          <Input {...register('code')} placeholder="e.g., BOX_24" error={!!allErrors.code} />
        </FormField>

        <FormField label="Name" required error={allErrors.name}>
          <Input {...register('name')} placeholder="e.g., Box x24" error={!!allErrors.name} />
        </FormField>

        <FormField label="Package Type" required error={allErrors.package_type}>
          <Select {...register('package_type')} error={!!allErrors.package_type}>
            <option value="">Select a package type…</option>
            {PACKAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Base Unit Quantity"
          required
          error={allErrors.base_unit_quantity}
          hint="How many of the compatible unit one of this package contains — e.g. 24 for a Box x24 of kg-based items."
        >
          <Input
            {...register('base_unit_quantity')}
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="e.g., 24"
            error={!!allErrors.base_unit_quantity}
          />
        </FormField>

        <FormField label="Compatible Unit" required error={allErrors.compatible_dimension_uom_id}>
          <Select
            {...register('compatible_dimension_uom_id')}
            error={!!allErrors.compatible_dimension_uom_id}
            disabled={isUomsLoading}
          >
            <option value="">Select a unit…</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name} ({uom.symbol})
              </option>
            ))}
          </Select>
        </FormField>

        <Checkbox
          id="template-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Active"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Template
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
