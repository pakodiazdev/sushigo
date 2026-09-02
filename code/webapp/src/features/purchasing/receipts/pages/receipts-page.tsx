import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { formatCurrency } from '@/lib/format'
import { ReceiptForm, ReceiptDetails } from '../components'
import { useReceiptsPage } from '../hooks/use-receipts-page'
import type { ReceiptStatus, ReceiptSummary } from '../types'

const statusLabels: Record<ReceiptStatus, string> = {
  DRAFT: 'Borrador',
  POSTED: 'Confirmada',
  REVERSED: 'Revertida',
}

const statusBadgeClasses: Record<ReceiptStatus, string> = {
  POSTED: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
  REVERSED: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50',
  DRAFT: 'bg-muted text-muted-foreground ring-border',
}

const panelTitles: Record<'create' | 'edit' | 'detail', string> = {
  create: 'Nueva recepción',
  edit: 'Editar recepción',
  detail: 'Detalle de la recepción',
}

export function ReceiptsPage() {
  const newReceiptButtonRef = useRef<HTMLButtonElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    receipts,
    isLoading,
    isError,
    isPanelOpen,
    panelMode,
    selectedReceipt,
    isDetailLoading,
    handleRowClick,
    handleNewReceipt,
    handleEdit,
    cancelEdit,
    handleDelete,
    handlePost,
    handleReverse,
    handleCreated,
    handleUpdated,
    closePanel,
    isDeleting,
    isPosting,
    isReversing,
  } = useReceiptsPage()

  const handleNewReceiptClick = () => {
    lastOpenerRef.current = newReceiptButtonRef.current
    handleNewReceipt()
  }

  const handleRowClickTracked = (
    receipt: ReceiptSummary,
    event: React.SyntheticEvent<HTMLTableRowElement>
  ) => {
    lastOpenerRef.current = event.currentTarget
    handleRowClick(receipt)
  }

  const handleClosePanel = () => {
    closePanel()
    lastOpenerRef.current?.focus()
  }

  const columns: Column<ReceiptSummary>[] = [
    {
      key: 'reference',
      header: 'Referencia',
      render: (receipt) => <span className="font-medium">{receipt.reference ?? '—'}</span>,
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (receipt) => receipt.supplier?.name ?? '—',
    },
    {
      key: 'destination_location',
      header: 'Destino',
      render: (receipt) => receipt.destination_location?.name ?? '—',
    },
    {
      key: 'receipt_date',
      header: 'Fecha',
      render: (receipt) => receipt.receipt_date,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (receipt) => formatCurrency(receipt.total),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (receipt) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses[receipt.status]}`}
        >
          {statusLabels[receipt.status]}
        </span>
      ),
    },
  ]

  const panelTitle = panelTitles[panelMode]

  return (
    <PageContainer>
      <PageHeader
        title="Recepciones de Compra"
        description="Registra lo que realmente se recibió del proveedor y confirma el costo de adquisición"
        action={
          <CanAccess permission="receipts.manage">
            <Button ref={newReceiptButtonRef} onClick={handleNewReceiptClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva recepción
            </Button>
          </CanAccess>
        }
      />

      <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por referencia..."
          className="flex-1"
        />

        <FilterSelect
          label="Estado"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as ReceiptStatus | '')}
          options={[
            { value: 'DRAFT', label: 'Borrador' },
            { value: 'POSTED', label: 'Confirmada' },
            { value: 'REVERSED', label: 'Revertida' },
          ]}
        />
      </div>

      <DataGrid
        data={receipts}
        columns={columns}
        onRowClick={handleRowClickTracked}
        loading={isLoading}
        emptyMessage={isError ? 'No fue posible cargar las recepciones. Intenta de nuevo.' : undefined}
        getRowId={(receipt) => receipt.id}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      <SlidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={panelTitle}>
        {panelMode === 'create' && (
          <ReceiptForm onSuccess={handleCreated} onCancel={handleClosePanel} />
        )}
        {panelMode === 'edit' && selectedReceipt && (
          <ReceiptForm receipt={selectedReceipt} onSuccess={handleUpdated} onCancel={cancelEdit} />
        )}
        {panelMode === 'detail' && selectedReceipt && (
          <ReceiptDetails
            receipt={selectedReceipt}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPost={handlePost}
            onReverse={handleReverse}
            isDeleting={isDeleting}
            isPosting={isPosting}
            isReversing={isReversing}
          />
        )}
        {panelMode !== 'create' && !selectedReceipt && isDetailLoading && (
          <p className="p-6 text-sm text-muted-foreground">Cargando recepción…</p>
        )}
      </SlidePanel>
    </PageContainer>
  )
}
