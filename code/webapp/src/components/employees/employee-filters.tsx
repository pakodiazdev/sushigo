import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'

const roleOptions = Object.entries(EMPLOYEE_POSITION_ROLES).map(([value, label]) => ({
  value,
  label,
}))

const statusOptions = [
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'baja', label: 'Baja' },
]

interface EmployeeFiltersProps {
  search: string
  role: string
  status?: string
  onFilterChange: (key: string, value: any) => void
  onNew: () => void
}

export function EmployeeFilters({
  search,
  role,
  status,
  onFilterChange,
  onNew,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={search}
        onChange={(value) => onFilterChange('search', value)}
        placeholder="Buscar por nombre o codigo..."
        className="flex-1 min-w-[200px] max-w-sm"
      />

      <FilterSelect
        label="Puesto"
        value={role}
        onChange={(value) => onFilterChange('role', value)}
        options={roleOptions}
        placeholder="Todos los puestos"
        showIcon={false}
      />

      <FilterSelect
        label="Estado"
        value={status || ''}
        onChange={(value) => {
          onFilterChange('status', value || undefined)
        }}
        options={statusOptions}
        placeholder="Todos"
        showIcon={false}
      />

      <div className="flex-1" />
      <Button
        onClick={onNew}
        className="bg-blue-600 text-white hover:bg-blue-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Empleado
      </Button>
    </div>
  )
}
