import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Package, Box, AlertCircle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'
import {
  ItemForm,
  ItemDetails,
  CrudSlidePanels,
  InventoryListLayout,
  useTypeStatusListFilters,
} from '@/components/inventory'

export const Route = createFileRoute('/inventario/insumos')({
  beforeLoad: requirePermission('items.view'),
  component: InventoryItemsPage,
})

export function InventoryItemsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
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

  // Fetch items with filters — always excludes PRODUCTO (comma-separated `type`), since this
  // page manages only Insumos/Activos; Products are managed exclusively via /inventario/productos.
  const { data, isLoading, isError: isErrorRaw, isRefetching, refetch, error } = useQuery({
    queryKey: ['items', currentPage, searchQuery, typeFilter, statusFilter],
    queryFn: () =>
      itemApi.list({
        per_page: 15,
        search: searchQuery || undefined,
        type: typeFilter || 'INSUMO,ACTIVO',
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
    // Keep the current page visible while a filter/page change refetches in the
    // background instead of blanking the grid to a full-page skeleton.
    placeholderData: keepPreviousData,
  })
  // A 403 (access revoked mid-session) must never be treated as a retryable refresh
  // failure that leaves cached rows visible — DataGrid's `forbidden` state blocks them
  // unconditionally, unlike its plain `error` state, which now keeps stale rows on screen.
  const isForbidden = isForbiddenError(error)
  const isError = isErrorRaw && !isForbidden

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsDetailsPanelOpen(false)
      setSelectedItem(null)
      showSuccess('Item eliminado correctamente', 'Item eliminado')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo eliminar el item. Puede tener variantes existentes.'),
        'Error al eliminar'
      )
    },
  })

  const columns: Column<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{item.sku}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground truncate max-w-md">
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item) => {
        const colors = {
          INSUMO: 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/50',
          PRODUCTO: 'bg-green-50 text-green-700 ring-green-700/10 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
          ACTIVO: 'bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-800/50',
        }
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[item.type]
              }`}
          >
            {item.type}
          </span>
        )
      },
    },
    {
      key: 'is_stocked',
      header: 'Con existencia',
      render: (item) => (
        <span className="text-sm">
          {item.is_stocked ? (
            <Box className="h-4 w-4 text-green-600 dark:text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.is_active
            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
            : 'bg-muted text-muted-foreground ring-border'
            }`}
        >
          {item.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ]

  const handleRowClick = (item: Item) => {
    setSelectedItem(item)
    setIsDetailsPanelOpen(true)
  }

  const handleNewItem = () => {
    setSelectedItem(null)
    setIsFormPanelOpen(true)
  }

  const handleEdit = (item: Item) => {
    setSelectedItem(item)
    setIsDetailsPanelOpen(false)
    setIsFormPanelOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
    setIsFormPanelOpen(false)
    setSelectedItem(null)
  }

  const closeDetails = () => {
    setIsDetailsPanelOpen(false)
    setSelectedItem(null)
  }

  const closeForm = () => {
    setIsFormPanelOpen(false)
    setSelectedItem(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Items de Inventario"
        description="Gestiona insumos y activos"
        action={
          // A view-only role (items.view without items.create) can reach this page —
          // hide the control rather than offer an action that would only 403.
          <CanAccess permission="items.create">
            <Button onClick={handleNewItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Item Rápido
            </Button>
          </CanAccess>
        }
      />

      <InventoryListLayout
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por SKU o nombre..."
        filters={
          <FilterSelect
            label="Tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Todos"
            options={[
              { value: 'INSUMO', label: 'Insumo' },
              { value: 'ACTIVO', label: 'Activo' },
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
        emptyDescription="Registra un item para verlo aquí."
        emptyAction={
          <CanAccess permission="items.create">
            <Button variant="outline" size="sm" onClick={handleNewItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear el primer item
            </Button>
          </CanAccess>
        }
        currentPage={currentPage}
        totalPages={data?.data.meta.last_page || 1}
        onPageChange={setCurrentPage}
      />

      <CrudSlidePanels
        detailsTitle="Detalle de Item"
        isDetailsOpen={isDetailsPanelOpen}
        onDetailsClose={closeDetails}
        detailsContent={
          selectedItem && (
            <ItemDetails
              item={selectedItem}
              onEdit={() => handleEdit(selectedItem)}
              onDelete={() => handleDelete(selectedItem.id)}
              onViewVariants={() => {
                // Navigate to variants filtered by this item
                console.log('View variants for item:', selectedItem.id)
              }}
            />
          )
        }
        formTitle={selectedItem ? 'Editar Item' : 'Nuevo Item'}
        isFormOpen={isFormPanelOpen}
        onFormClose={closeForm}
        formContent={
          <ItemForm item={selectedItem} onSuccess={handleFormSuccess} onCancel={closeForm} />
        }
      />
    </PageContainer>
  )
}
