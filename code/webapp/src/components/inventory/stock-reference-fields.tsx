import { FormField, Select } from '@/components/ui/form-fields'
import type { ItemVariant, UnitOfMeasure } from '@/types/inventory'

interface VariantSelectFieldProps {
  value: string
  error?: string
  hint: string
  variants: ItemVariant[]
  onChange: (value: string) => void
  /** Field label. Defaults to English; pass a localized string per call site. */
  label?: string
  /** Empty-option text. Defaults to English. */
  placeholder?: string
}

export function VariantSelectField({
  value,
  error,
  hint,
  variants,
  onChange,
  label = 'Item Variant',
  placeholder = 'Select variant...',
}: Readonly<VariantSelectFieldProps>) {
  return (
    <FormField label={label} required error={error} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value)} error={!!error}>
        <option value="">{placeholder}</option>
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
  /** Field label. Defaults to English; pass a localized string per call site. */
  label?: string
  /** Empty-option text. Defaults to English. */
  placeholder?: string
  /** Helper text under the field. Defaults to English. */
  hint?: string
}

export function UnitOfMeasureSelectField({
  value,
  error,
  units,
  onChange,
  label = 'Unit of Measure',
  placeholder = 'Select unit...',
  hint = "Auto-filled from variant's default UoM",
}: Readonly<UnitOfMeasureSelectFieldProps>) {
  return (
    <FormField label={label} required error={error} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value)} error={!!error}>
        <option value="">{placeholder}</option>
        {units.map((uom) => (
          <option key={uom.id} value={uom.id}>
            {uom.name} ({uom.symbol}) - {uom.type}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
