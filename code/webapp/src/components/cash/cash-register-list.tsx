import { useState } from 'react'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-select'
import { SearchInput } from '@/components/ui/search-input'
import { 
  CashRegisterTypeBadge, 
  formatDate 
} from './cash-utils'
import { useCashRegisters, useDeleteCashRegister } from '@/services/cash-hooks'
import type { CashRegister, CashRegisterFilters } from '@/types/cash'
import { CashRegisterType } from '@/types/cash'

interface CashRegisterListProps {
  onEdit: (register: CashRegister) => void
  onView: (register: CashRegister) => void
  onCreate: () => void
  branches: Array<{ id: number; name: string }>
}

export function CashRegisterList({ onEdit, onView, onCreate, branches }: CashRegisterListProps) {
  const [filters, setFilters] = useState<CashRegisterFilters>({
    per_page: 20,
    page: 1,
  })

  const { data, isLoading } = useCashRegisters(filters)
  const deleteMutation = useDeleteCashRegister()

  const handleDelete = async (register: CashRegister) => {
    if (!confirm(`¿Estás seguro de eliminar la caja "${register.name}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(register.id)
    } catch (error) {
      console.error('Error deleting register:', error)
    }
  }

  const columns: Column<CashRegister>[] = [
    {
      key: 'code',
      header: 'Código',
      width: '120px',
      render: (item) => (
        <span className="font-mono font-semibold">{item.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          {item.branch && (
            <div className="text-xs text-muted-foreground mt-1">
              {item.branch.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '120px',
      align: 'center',
      render: (item) => <CashRegisterTypeBadge type={item.type} />,
    },
    {
      key: 'operating_unit',
      header: 'Unidad Operativa',
      width: '180px',
      render: (item) => (
        <span className="text-sm">
          {item.operating_unit?.name || '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      width: '100px',
      align: 'center',
      render: (item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.is_active 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {item.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha Creación',
      width: '150px',
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(item.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '180px',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView(item)
            }}
            className="h-8 w-8 p-0"
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            className="h-8 w-8 p-0"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item)
            }}
            className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
            title="Eliminar"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <SearchInput
            placeholder="Buscar por código o nombre..."
            value={filters.search || ''}
            onChange={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
            className="w-full sm:w-64"
          />

          <FilterSelect
            label="Sucursal"
            value={filters.branch_id?.toString() || ''}
            onChange={(value) => 
              setFilters(prev => ({ 
                ...prev, 
                branch_id: value ? parseInt(value) : undefined,
                page: 1 
              }))
            }
            placeholder="Todas las sucursales"
            options={branches.map(b => ({ value: b.id.toString(), label: b.name }))}
            className="w-full sm:w-48"
          />

          <FilterSelect
            label="Tipo"
            value={filters.type || ''}
            onChange={(value) => 
              setFilters(prev => ({ 
                ...prev, 
                type: value as CashRegisterType | undefined,
                page: 1 
              }))
            }
            placeholder="Todos los tipos"
            options={[
              { value: CashRegisterType.ON_PREMISE, label: 'Local' },
              { value: CashRegisterType.DELIVERY, label: 'Delivery' },
              { value: CashRegisterType.EVENT, label: 'Evento' },
            ]}
            className="w-full sm:w-40"
          />

          <FilterSelect
            label="Estado"
            value={filters.is_active?.toString() || ''}
            onChange={(value) => 
              setFilters(prev => ({ 
                ...prev, 
                is_active: value ? value === 'true' : undefined,
                page: 1 
              }))
            }
            placeholder="Todos los estados"
            options={[
              { value: 'true', label: 'Activas' },
              { value: 'false', label: 'Inactivas' },
            ]}
            className="w-full sm:w-40"
          />
        </div>

        <Button
          onClick={onCreate}
          className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Caja
        </Button>
      </div>

      {/* Data Grid */}
      <DataGrid
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No se encontraron cajas registradoras"
        pagination={data?.meta ? {
          currentPage: data.meta.current_page,
          totalPages: data.meta.last_page,
          onPageChange: (page) => setFilters(prev => ({ ...prev, page })),
        } : undefined}
      />
    </div>
  )
}
