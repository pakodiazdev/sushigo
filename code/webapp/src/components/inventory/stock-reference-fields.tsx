import { FormField, Select } from '@/components/ui/form-fields'
import type { ItemVariant, UnitOfMeasure } from '@/types/inventory'

interface VariantSelectFieldProps {
  value: string
  error?: string
  hint: string
  variants: ItemVariant[]
  onChange: (value: string) => void
}

export function VariantSelectField({
  value,
  error,
  hint,
  variants,
  onChange,
}: Readonly<VariantSelectFieldProps>) {
  return (
    <FormField label="Item Variant" required error={error} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select variant...</option>
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.code} - {variant.name}
            {variant.item?.sku && ` (${variant.item.sku})`}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

interface UnitOfMeasureSelectFieldProps {
  value: string
  error?: string
  units: UnitOfMeasure[]
  onChange: (value: string) => void
}

export function UnitOfMeasureSelectField({
  value,
  error,
  units,
  onChange,
}: Readonly<UnitOfMeasureSelectFieldProps>) {
  return (
    <FormField
      label="Unit of Measure"
      required
      error={error}
      hint="Auto-filled from variant's default UoM"
    >
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select unit...</option>
        {units.map((uom) => (
          <option key={uom.id} value={uom.id}>
            {uom.name} ({uom.symbol}) - {uom.type}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
