import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { ProductVariant } from '@/types/inventory'
import { useVariantForm } from './use-variant-form'

interface VariantFormProps {
  productId: number
  variant?: ProductVariant | null
  onSuccess: (variant: ProductVariant) => void
  onCancel: () => void
}

export function VariantForm({ productId, variant, onSuccess, onCancel }: Readonly<VariantFormProps>) {
  const isEditing = !!variant
  const {
    uoms,
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
  } = useVariantForm({ productId, variant, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Variant Name" required error={allErrors.name}>
          <Input
            {...register('name')}
            placeholder="e.g., Arroz Premium 1kg"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField label="SKU" required error={allErrors.code}>
          <Input {...register('code')} placeholder="e.g., ARR-KG" error={!!allErrors.code} />
        </FormField>

        <FormField label="Barcode" error={allErrors.barcode}>
          <Input {...register('barcode')} placeholder="Optional" error={!!allErrors.barcode} />
        </FormField>

        <FormField label="Base Unit" required error={allErrors.uom_id}>
          <Select {...register('uom_id')} error={!!allErrors.uom_id} disabled={isUomsLoading}>
            <option value="">Select a base unit…</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name} ({uom.symbol})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Description">
          <Textarea {...register('description')} rows={3} placeholder="Optional notes…" />
        </FormField>

        <Checkbox
          id="variant-track-lot"
          checked={trackLot}
          onChange={(e) => setValue('track_lot', e.target.checked)}
          label="Track lot numbers"
        />

        <Checkbox
          id="variant-track-serial"
          checked={trackSerial}
          onChange={(e) => setValue('track_serial', e.target.checked)}
          label="Track serial numbers"
        />

        <Checkbox
          id="variant-is-active"
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
            {isEditing ? 'Update' : 'Create'} Variant
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
