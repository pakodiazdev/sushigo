import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Grid3x3, CheckCircle2, XCircle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { useToast } from '@/components/ui/toast-provider'
import { itemVariantApi } from '@/services/inventory-api'
import type { ItemVariant } from '@/types/inventory'
import { VariantForm, VariantDetails } from '@/components/inventory'

export const Route = createFileRoute('/inventory/item-variants')({
  component: ItemVariantsPage,
})

export function ItemVariantsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['item-variants', currentPage, searchQuery, statusFilter],
    queryFn: () =>
      itemVariantApi.list({
        per_page: 15,
        search: searchQuery || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => itemVariantApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-variants'] })
      setIsDetailsPanelOpen(false)
      setSelectedVariant(null)
      showSuccess('Variant deleted successfully', 'Variant Deleted')
    },
    onError: (error: any) => {
      showError(
        error.response?.data?.message || 'Failed to delete variant. It may have existing stock.',
        'Delete Error'
      )
    },
  })

  const columns: Column<ItemVariant>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (variant) => (
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{variant.code}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
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
      header: 'UoM',
      render: (variant) => (
        <span className="text-sm font-medium">
          {variant.uom?.symbol || variant.uom?.name || '-'}
        </span>
      ),
    },
    {
      key: 'min_stock',
      header: 'Min/Max Stock',
      render: (variant) => (
        <div className="text-sm text-muted-foreground">
          {Number(variant.min_stock || 0)} / {Number(variant.max_stock || 0)}
        </div>
      ),
    },
    {
      key: 'avg_unit_cost',
      header: 'Avg Cost',
      render: (variant) => (
        <span className="font-mono text-sm">
          ${Number(variant.avg_unit_cost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
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
              Active
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
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

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta variante?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['item-variants'] })
    setIsFormPanelOpen(false)
    setSelectedVariant(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Variantes de Items"
        description="Gestiona las variantes de productos e insumos"
        action={
          <Button onClick={handleNewVariant} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Variante
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por código o nombre..."
          className="flex-1"
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

      <SlidePanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false)
          setSelectedVariant(null)
        }}
        title="Detalle de Variante"
      >
        {selectedVariant && (
          <VariantDetails
            variant={selectedVariant}
            onEdit={() => handleEdit(selectedVariant)}
            onDelete={() => handleDelete(selectedVariant.id)}
            onClose={() => setIsDetailsPanelOpen(false)}
          />
        )}
      </SlidePanel>

      <SlidePanel
        isOpen={isFormPanelOpen}
        onClose={() => {
          setIsFormPanelOpen(false)
          setSelectedVariant(null)
        }}
        title={selectedVariant ? 'Editar Variante' : 'Nueva Variante'}
      >
        <VariantForm
          variant={selectedVariant}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormPanelOpen(false)
            setSelectedVariant(null)
          }}
        />
      </SlidePanel>
    </PageContainer>
  )
}
