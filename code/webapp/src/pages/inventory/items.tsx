import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Box, AlertCircle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'
import { ItemForm, ItemDetails } from '@/components/inventory'

export const Route = createFileRoute('/inventory/items')({
  component: InventoryItemsPage,
})

export function InventoryItemsPage() {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch items with filters
  const { data, isLoading } = useQuery({
    queryKey: ['items', currentPage, searchQuery, typeFilter, statusFilter],
    queryFn: () =>
      itemApi.list({
        per_page: 15,
        search: searchQuery || undefined,
        type: typeFilter || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => itemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsDetailsPanelOpen(false)
      setSelectedItem(null)
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
      header: 'Name',
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
      header: 'Type',
      render: (item) => {
        const colors = {
          INSUMO: 'bg-blue-50 text-blue-700 ring-blue-700/10',
          PRODUCTO: 'bg-green-50 text-green-700 ring-green-700/10',
          ACTIVO: 'bg-purple-50 text-purple-700 ring-purple-700/10',
        }
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
              colors[item.type]
            }`}
          >
            {item.type}
          </span>
        )
      },
    },
    {
      key: 'is_stocked',
      header: 'Stocked',
      render: (item) => (
        <span className="text-sm">
          {item.is_stocked ? (
            <Box className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-gray-400" />
          )}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
            item.is_active
              ? 'bg-green-50 text-green-700 ring-green-600/20'
              : 'bg-gray-50 text-gray-600 ring-gray-500/10'
          }`}
        >
          {item.is_active ? 'Active' : 'Inactive'}
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

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
    setIsFormPanelOpen(false)
    setSelectedItem(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Items de Inventario"
        description="Gestiona productos, insumos y activos"
        action={
          <Button onClick={handleNewItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Item
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por SKU o nombre..."
          className="flex-1"
        />

        <FilterSelect
          label="Tipo"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'INSUMO', label: 'Insumo' },
            { value: 'PRODUCTO', label: 'Producto' },
            { value: 'ACTIVO', label: 'Activo' },
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
          setSelectedItem(null)
        }}
        title="Detalle de Item"
      >
        {selectedItem && (
          <ItemDetails
            item={selectedItem}
            onEdit={() => handleEdit(selectedItem)}
            onDelete={() => handleDelete(selectedItem.id)}
            onViewVariants={() => {
              // Navigate to variants filtered by this item
              console.log('View variants for item:', selectedItem.id)
            }}
          />
        )}
      </SlidePanel>

      {/* Form Panel */}
      <SlidePanel
        isOpen={isFormPanelOpen}
        onClose={() => {
          setIsFormPanelOpen(false)
          setSelectedItem(null)
        }}
        title={selectedItem ? 'Editar Item' : 'Nuevo Item'}
      >
        <ItemForm
          item={selectedItem}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormPanelOpen(false)
            setSelectedItem(null)
          }}
        />
      </SlidePanel>
    </PageContainer>
  )
}
