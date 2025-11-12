import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { useToast } from '@/components/ui/toast-provider'
import { inventoryLocationApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'
import { LocationForm, LocationDetails } from '@/components/inventory'

export const Route = createFileRoute('/inventory/locations')({
  component: InventoryLocationsPage,
})

export function InventoryLocationsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch locations with filters
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-locations', currentPage, searchQuery, typeFilter, statusFilter],
    queryFn: () =>
      inventoryLocationApi.list({
        per_page: 15,
        search: searchQuery || undefined,
        type: typeFilter || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryLocationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] })
      setIsDetailsPanelOpen(false)
      setSelectedLocation(null)
      showSuccess('Location deleted successfully', 'Location Deleted')
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || 'Failed to delete location. It may have existing stock.',
        'Delete Error'
      )
    },
  })

  const columns: Column<InventoryLocation>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (location) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{location.name}</span>
          </div>
          {location.code && (
            <span className="text-xs text-muted-foreground ml-6">Code: {location.code}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (location) => {
        const typeColors: Record<string, string> = {
          MAIN: 'bg-blue-50 text-blue-700 ring-blue-700/10',
          DISPLAY: 'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
          KITCHEN: 'bg-purple-50 text-purple-700 ring-purple-700/10',
          BAR: 'bg-pink-50 text-pink-700 ring-pink-700/10',
          TEMP: 'bg-gray-50 text-gray-700 ring-gray-700/10',
          RETURN: 'bg-orange-50 text-orange-700 ring-orange-700/10',
          WASTE: 'bg-red-50 text-red-700 ring-red-700/10',
        }
        const typeLabels: Record<string, string> = {
          MAIN: 'Almacén',
          DISPLAY: 'Exhibición',
          KITCHEN: 'Cocina',
          BAR: 'Bar',
          TEMP: 'Temporal',
          RETURN: 'Devoluciones',
          WASTE: 'Desperdicios',
        }
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${typeColors[location.type] || typeColors.MAIN}`}>
            {typeLabels[location.type] || location.type}
          </span>
        )
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (location) => (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{location.priority}</span>
          {location.priority >= 900 && <span className="text-xs text-green-600">●</span>}
          {location.priority >= 500 && location.priority < 900 && <span className="text-xs text-yellow-600">●</span>}
          {location.priority < 500 && <span className="text-xs text-gray-400">●</span>}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (location) => (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${location.is_active
                ? 'bg-green-50 text-green-700 ring-green-600/20'
                : 'bg-gray-50 text-gray-600 ring-gray-500/10'
              }`}
          >
            {location.is_active ? 'Activa' : 'Inactiva'}
          </span>
          {!location.is_pickable && (
            <span className="text-xs text-orange-600">No pickable</span>
          )}
        </div>
      ),
    },
  ]

  const handleRowClick = (location: InventoryLocation) => {
    setSelectedLocation(location)
    setIsDetailsPanelOpen(true)
  }

  const handleNewLocation = () => {
    setSelectedLocation(null)
    setIsFormPanelOpen(true)
  }

  const handleEdit = (location: InventoryLocation) => {
    setSelectedLocation(location)
    setIsDetailsPanelOpen(false)
    setIsFormPanelOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta ubicación?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-locations'] })
    setIsFormPanelOpen(false)
    setSelectedLocation(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ubicaciones de Inventario"
        description="Gestiona las ubicaciones de almacenamiento"
        action={
          <Button onClick={handleNewLocation} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Ubicación
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar ubicaciones..."
          className="flex-1"
        />

        <FilterSelect
          label="Tipo"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'MAIN', label: 'Almacén Principal' },
            { value: 'DISPLAY', label: 'Mesa Exhibición' },
            { value: 'KITCHEN', label: 'Cocina' },
            { value: 'BAR', label: 'Bar' },
            { value: 'TEMP', label: 'Temporal' },
            { value: 'RETURN', label: 'Devoluciones' },
            { value: 'WASTE', label: 'Desperdicios' },
          ]}
        />

        <FilterSelect
          label="Estado"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ]}
        />
      </div>

      <DataGrid
        data={data?.data.data || []}
        columns={columns}
        onRowClick={handleRowClick}
        loading={isLoading}
        pagination={{
          currentPage,
          totalPages: data?.data.meta.last_page || 1,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Details Panel */}
      <SlidePanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false)
          setSelectedLocation(null)
        }}
        title="Detalle de Ubicación"
      >
        {selectedLocation && (
          <LocationDetails
            location={selectedLocation}
            onEdit={() => handleEdit(selectedLocation)}
            onDelete={() => handleDelete(selectedLocation.id)}
          />
        )}
      </SlidePanel>

      {/* Form Panel */}
      <SlidePanel
        isOpen={isFormPanelOpen}
        onClose={() => {
          setIsFormPanelOpen(false)
          setSelectedLocation(null)
        }}
        title={selectedLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
      >
        <LocationForm
          location={selectedLocation}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormPanelOpen(false)
            setSelectedLocation(null)
          }}
        />
      </SlidePanel>
    </PageContainer>
  )
}
