import { useRef } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { StockTransferForm, StockTransferDetails } from '../components'
import { useStockTransfersPage } from '../hooks/use-stock-transfers-page'
import type { StockTransferStatus, StockTransferSummary } from '../types'

const statusLabels: Record<StockTransferStatus, string> = {
  DRAFT: 'Borrador',
  POSTED: 'Confirmado',
  REVERSED: 'Revertido',
}

const statusBadgeClasses: Record<StockTransferStatus, string> = {
  POSTED: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
  REVERSED: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50',
  DRAFT: 'bg-muted text-muted-foreground ring-border',
}

const panelTitles: Record<'create' | 'edit' | 'detail', string> = {
  create: 'Nuevo traslado',
  edit: 'Editar traslado',
  detail: 'Detalle del traslado',
}

export function StockTransfersPage() {
  const newTransferButtonRef = useRef<HTMLButtonElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    transfers,
    isLoading,
    isError,
    isPanelOpen,
    panelMode,
    selectedTransfer,
    isDetailLoading,
    handleRowClick,
    handleNewTransfer,
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
  } = useStockTransfersPage()

  const handleNewTransferClick = () => {
    lastOpenerRef.current = newTransferButtonRef.current
    handleNewTransfer()
  }

  const handleRowClickTracked = (
    transfer: StockTransferSummary,
    event: React.SyntheticEvent<HTMLTableRowElement>
  ) => {
    lastOpenerRef.current = event.currentTarget
    handleRowClick(transfer)
  }

  const handleClosePanel = () => {
    closePanel()
    lastOpenerRef.current?.focus()
  }

  const columns: Column<StockTransferSummary>[] = [
    {
      key: 'reference',
      header: 'Referencia',
      render: (transfer) => <span className="font-medium">{transfer.reference ?? '—'}</span>,
    },
    {
      key: 'route',
      header: 'Ruta',
      render: (transfer) => (
        <span className="inline-flex items-center gap-1.5 text-sm">
          {transfer.source_location?.name ?? '—'}
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          {transfer.destination_location?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'transfer_date',
      header: 'Fecha',
      render: (transfer) => transfer.transfer_date,
    },
    {
      key: 'line_count',
      header: 'Líneas',
      align: 'right',
      render: (transfer) => transfer.line_count,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (transfer) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses[transfer.status]}`}
        >
          {statusLabels[transfer.status]}
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Transferencias de Inventario"
        description="Mueve variantes entre ubicaciones y confirma el movimiento de forma auditable"
        action={
          <CanAccess permission="stock.manage">
            <Button ref={newTransferButtonRef} onClick={handleNewTransferClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo traslado
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
          onChange={(value) => setStatusFilter(value as StockTransferStatus | '')}
          options={[
            { value: 'DRAFT', label: 'Borrador' },
            { value: 'POSTED', label: 'Confirmado' },
            { value: 'REVERSED', label: 'Revertido' },
          ]}
        />
      </div>

      <DataGrid
        data={transfers}
        columns={columns}
        onRowClick={handleRowClickTracked}
        loading={isLoading}
        emptyMessage={isError ? 'No fue posible cargar los traslados. Intenta de nuevo.' : undefined}
        getRowId={(transfer) => transfer.id}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      <SlidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={panelTitles[panelMode]}>
        {panelMode === 'create' && (
          <StockTransferForm onSuccess={handleCreated} onCancel={handleClosePanel} />
        )}
        {panelMode === 'edit' && selectedTransfer && (
          <StockTransferForm transfer={selectedTransfer} onSuccess={handleUpdated} onCancel={cancelEdit} />
        )}
        {panelMode === 'detail' && selectedTransfer && (
          <StockTransferDetails
            transfer={selectedTransfer}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPost={handlePost}
            onReverse={handleReverse}
            isDeleting={isDeleting}
            isPosting={isPosting}
            isReversing={isReversing}
          />
        )}
        {panelMode !== 'create' && !selectedTransfer && isDetailLoading && (
          <p className="p-6 text-sm text-muted-foreground">Cargando traslado…</p>
        )}
      </SlidePanel>
    </PageContainer>
  )
}
