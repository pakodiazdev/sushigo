import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Grid3x3, CheckCircle2, XCircle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { type Column } from '@/components/ui/data-grid'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { itemVariantApi } from '@/services/inventory-api'
import type { ItemVariant } from '@/types/inventory'
import { VariantForm, VariantDetails, CrudSlidePanels, InventoryListLayout } from '@/components/inventory'

export const Route = createFileRoute('/inventario/variantes')({
  beforeLoad: requirePermission('items.view'),
  component: ItemVariantsPage,
})

export function ItemVariantsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQueryState] = useState('')
  const [statusFilter, setStatusFilterState] = useState('')

  // Changing a filter narrows/widens the result set, so the page the user was on may no
  // longer exist — reset to page 1 alongside every setter instead of leaving currentPage stale
  // (mirrors use-products-list.ts).
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }
  const setStatusFilter = (value: string) => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  // Always excludes Product-linked variants (comma-separated `item_type`), since this page
  // manages only Insumo/Activo variants; Product variants are managed exclusively via
  // /inventory/products/{id}/variants.
  const { data, isLoading, isError: isErrorRaw, isRefetching, refetch, error } = useQuery({
    queryKey: ['item-variants', currentPage, searchQuery, statusFilter],
    queryFn: () =>
      itemVariantApi.list({
        per_page: 15,
        item_type: 'INSUMO,ACTIVO',
        search: searchQuery || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
    placeholderData: keepPreviousData,
  })
  // A 403 (access revoked mid-session) must never be treated as a retryable refresh
  // failure that leaves cached rows visible — DataGrid's `forbidden` state blocks them
  // unconditionally, unlike its plain `error` state, which now keeps stale rows on screen.
  const isForbidden = isForbiddenError(error)
  const isError = isErrorRaw && !isForbidden

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemVariantApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-variants'] })
      setIsDetailsPanelOpen(false)
      setSelectedVariant(null)
      showSuccess('Variante eliminada correctamente', 'Variante eliminada')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo eliminar la variante. Puede tener existencia registrada.'),
        'Error al eliminar'
      )
    },
  })

  const columns: Column<ItemVariant>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (variant) => (
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{variant.code}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (variant) => (
        <div>
          <div className="font-medium">{variant.name}</div>
          {variant.item && (
            <div className="text-sm text-muted-foreground">
              {variant.item.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'uom',
      header: 'UdM',
      render: (variant) => (
        <span className="text-sm font-medium">
          {variant.uom?.symbol || variant.uom?.name || '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (variant) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${variant.is_active
            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
            : 'bg-muted text-muted-foreground ring-border'
            }`}
        >
          {variant.is_active ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Activa
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Inactiva
            </>
          )}
        </span>
      ),
    },
  ]

  const handleRowClick = (variant: ItemVariant) => {
    setSelectedVariant(variant)
    setIsDetailsPanelOpen(true)
  }

  const handleNewVariant = () => {
    setSelectedVariant(null)
    setIsFormPanelOpen(true)
  }

  const handleEdit = (variant: ItemVariant) => {
    setSelectedVariant(variant)
    setIsDetailsPanelOpen(false)
    setIsFormPanelOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta variante?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['item-variants'] })
    setIsFormPanelOpen(false)
    setSelectedVariant(null)
  }

  const closeDetails = () => {
    setIsDetailsPanelOpen(false)
    setSelectedVariant(null)
  }

  const closeForm = () => {
    setIsFormPanelOpen(false)
    setSelectedVariant(null)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
  }

  return (
    <PageContainer>
      <PageHeader
        title="Variantes de Items"
        description="Gestiona las variantes de insumos y activos"
        action={
          <CanAccess permission="items.create">
            <Button onClick={handleNewVariant} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Variante
            </Button>
          </CanAccess>
        }
      />

      <InventoryListLayout
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por código o nombre..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        hasActiveFilters={Boolean(searchQuery || statusFilter)}
        onClearFilters={clearFilters}
        rows={data?.data.data || []}
        columns={columns}
        onRowClick={handleRowClick}
        loading={isLoading}
        error={isError}
        forbidden={isForbidden}
        onRetry={() => refetch()}
        isRefetching={isRefetching}
        emptyDescription="Registra una variante para verla aquí."
        emptyAction={
          <CanAccess permission="items.create">
            <Button variant="outline" size="sm" onClick={handleNewVariant} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear la primera variante
            </Button>
          </CanAccess>
        }
        currentPage={currentPage}
        totalPages={data?.data.meta.last_page || 1}
        onPageChange={setCurrentPage}
      />

      <CrudSlidePanels
        detailsTitle="Detalle de Variante"
        isDetailsOpen={isDetailsPanelOpen}
        onDetailsClose={closeDetails}
        detailsContent={
          selectedVariant && (
            <VariantDetails
              variant={selectedVariant}
              onEdit={() => handleEdit(selectedVariant)}
              onDelete={() => handleDelete(selectedVariant.id)}
            />
          )
        }
        formTitle={selectedVariant ? 'Editar Variante' : 'Nueva Variante'}
        isFormOpen={isFormPanelOpen}
        onFormClose={closeForm}
        formContent={
          <VariantForm variant={selectedVariant} onSuccess={handleFormSuccess} onCancel={closeForm} />
        }
      />
    </PageContainer>
  )
}
