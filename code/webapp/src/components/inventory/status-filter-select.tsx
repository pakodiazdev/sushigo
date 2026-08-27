import { FilterSelect } from '@/components/ui/filter-select'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

/** The active/inactive "Estado" filter shared by the Inventory list screens. */
export function StatusFilterSelect({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return <FilterSelect label="Estado" value={value} onChange={onChange} options={STATUS_OPTIONS} />
}
