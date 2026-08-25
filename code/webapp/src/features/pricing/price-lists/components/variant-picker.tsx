import { useEffect } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { FormField, Select } from '@/components/ui/form-fields'
import { useVariantSearch } from '../hooks/use-variant-search'

interface VariantPickerProps {
  value: string
  onChange: (itemVariantId: string) => void
  error?: string
  disabled?: boolean
}

/**
 * Search + select a Product Variant across the whole catalog — used by VariantPriceForm
 * (assigning a price) and ResolvedPricePreview (previewing one). A plain unfiltered <select>
 * isn't practical across every Variant in the system, so this narrows the option list via
 * `useVariantSearch`'s debounced free-text search (see that hook for why `/item-variants` is
 * the right endpoint to reuse here).
 */
export function VariantPicker({ value, onChange, error, disabled }: Readonly<VariantPickerProps>) {
  const { search, setSearch, variants, isLoading } = useVariantSearch()

  // A refined search can drop the currently selected Variant from the latest results, leaving
  // the <select> showing a blank option while `value` still holds the stale id. Clear it once
  // the fetch settles so the form never submits a Variant the UI no longer shows as selected.
  useEffect(() => {
    if (!value || isLoading) return
    if (!variants.some((variant) => String(variant.id) === value)) {
      onChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants, isLoading])

  return (
    <FormField label="Product Variant" required error={error}>
      <div className="space-y-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or code…" />
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          disabled={disabled || isLoading}
        >
          <option value="">
            {isLoading ? 'Searching…' : 'Select a Product Variant…'}
          </option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.item?.name ? `${variant.item.name} — ` : ''}
              {variant.name} ({variant.code})
            </option>
          ))}
        </Select>
      </div>
    </FormField>
  )
}
