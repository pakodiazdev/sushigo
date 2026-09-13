import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, MapPin } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { inventoryLocationApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'
import {
  LocationForm,
  LocationDetails,
  CrudSlidePanels,
  InventoryListLayout,
  useTypeStatusListFilters,
} from '@/components/inventory'

export const Route = createFileRoute('/inventario/ubicaciones')({
  // stock.view alone must reach this page too (#569): the Location detail
  // panel embeds VariantAssignmentsPanel, which reads variant-assignments
  // under that same permission — a stock.view-only user held only items.view
  // as a gate would never be able to open it.
  beforeLoad: requirePermission('items.view', 'stock.view'),
  component: InventoryLocationsPage,
})

export function InventoryLocationsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    clearFilters,
  } = useTypeStatusListFilters()

  // Fetch locations with filters
  const { data, isLoading, isError: isErrorRaw, isRefetching, refetch, error } = useQuery({
    queryKey: ['inventory-locations', currentPage, searchQuery, typeFilter, statusFilter],
    queryFn: () =>
      inventoryLocationApi.list({
        per_page: 15,
        search: searchQuery || undefined,
        type: typeFilter || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
    placeholderData: keepPreviousData,
  })
  // A 403 (access revoked mid-session) must never be treated as a retryable refresh
  // failure that leaves cached rows visible — DataGrid's `forbidden` state blocks them
  // unconditionally, unlike its plain `error` state, which now keeps stale rows on screen.
  const isForbidden = isForbiddenError(error)
  const isError = isErrorRaw && !isForbidden

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryLocationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] })
      setIsDetailsPanelOpen(false)
      setSelectedLocation(null)
      showSuccess('Ubicación eliminada correctamente', 'Ubicación eliminada')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo eliminar la ubicación. Puede tener existencia registrada.'),
        'Error al eliminar'
      )
    },
  })

  const columns: Column<InventoryLocation>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (location) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{location.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (location) => {
        const typeColors: Record<string, string> = {
          MAIN: 'bg-blue-50 text-blue-700 ring-blue-700/10',
          KITCHEN: 'bg-purple-50 text-purple-700 ring-purple-700/10',
          BAR: 'bg-pink-50 text-pink-700 ring-pink-700/10',
          TEMP: 'bg-gray-50 text-gray-700 ring-gray-700/10',
          RETURN: 'bg-orange-50 text-orange-700 ring-orange-700/10',
        }
        const typeLabels: Record<string, string> = {
          MAIN: 'Almacén',
          KITCHEN: 'Cocina',
          BAR: 'Bar',
          TEMP: 'Temporal',
          RETURN: 'Devoluciones',
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
      header: 'Prioridad',
      render: (location) => (
        <span className="text-sm font-medium">{location.priority}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (location) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${location.is_active
            ? 'bg-green-50 text-green-700 ring-green-600/20'
            : 'bg-gray-50 text-gray-600 ring-gray-500/10'
            }`}
        >
          {location.is_active ? 'Activa' : 'Inactiva'}
        </span>
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

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta ubicación?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-locations'] })
    setIsFormPanelOpen(false)
    setSelectedLocation(null)
  }

  const closeDetails = () => {
    setIsDetailsPanelOpen(false)
    setSelectedLocation(null)
  }

  const closeForm = () => {
    setIsFormPanelOpen(false)
    setSelectedLocation(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ubicaciones de Inventario"
        description="Gestiona las ubicaciones de almacenamiento"
        action={
          <CanAccess permission="inventory_locations.manage">
            <Button onClick={handleNewLocation} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Ubicación
            </Button>
          </CanAccess>
        }
      />

      <InventoryListLayout
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar ubicaciones..."
        filters={
          <FilterSelect
            label="Tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Todos"
            options={[
              { value: 'MAIN', label: 'Almacén Principal' },
              { value: 'KITCHEN', label: 'Cocina' },
              { value: 'BAR', label: 'Bar' },
              { value: 'TEMP', label: 'Temporal' },
              { value: 'RETURN', label: 'Devoluciones' },
            ]}
          />
        }
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        rows={data?.data.data || []}
        columns={columns}
        onRowClick={handleRowClick}
        loading={isLoading}
        error={isError}
        forbidden={isForbidden}
        onRetry={() => refetch()}
        isRefetching={isRefetching}
        emptyDescription="Registra una ubicación para verla aquí."
        emptyAction={
          <CanAccess permission="inventory_locations.manage">
            <Button variant="outline" size="sm" onClick={handleNewLocation} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear la primera ubicación
            </Button>
          </CanAccess>
        }
        currentPage={currentPage}
        totalPages={data?.data.meta.last_page || 1}
        onPageChange={setCurrentPage}
      />

      <CrudSlidePanels
        detailsTitle="Detalle de Ubicación"
        isDetailsOpen={isDetailsPanelOpen}
        onDetailsClose={closeDetails}
        detailsContent={
          selectedLocation && (
            <LocationDetails
              location={selectedLocation}
              onEdit={() => handleEdit(selectedLocation)}
              onDelete={() => handleDelete(selectedLocation.id)}
            />
          )
        }
        formTitle={selectedLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
        isFormOpen={isFormPanelOpen}
        onFormClose={closeForm}
        formContent={
          <LocationForm
            location={selectedLocation}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        }
      />
    </PageContainer>
  )
}
