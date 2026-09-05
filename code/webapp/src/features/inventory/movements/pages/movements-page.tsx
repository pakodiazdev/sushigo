import { X } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import { MovementDetail, MovementDirectionBadge } from '../components'
import { useMovementsPage } from '../hooks/use-movements-page'
import {
  formatMovementTimestamp,
  movementLocationLabel,
  reasonLabels,
  statusBadgeClasses,
  statusLabels,
} from '../lib/movement-presentation'
import type { MovementReason, MovementStatus, StockMovementSummary } from '../types'

const reasonOptions = (Object.keys(reasonLabels) as MovementReason[]).map((value) => ({
  value,
  label: reasonLabels[value],
}))

const statusOptions = (Object.keys(statusLabels) as MovementStatus[]).map((value) => ({
  value,
  label: statusLabels[value],
}))

export function MovementsPage() {
  const {
    movements,
    isLoading,
    isError,
    isForbidden,
    page,
    totalPages,
    totalResults,
    setPage,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    locationOptions,
    variantOptions,
    selectedMovement,
    isDetailLoading,
    isDetailOpen,
    openMovement,
    closeMovement,
  } = useMovementsPage()

  const columns: Column<StockMovementSummary>[] = [
    {
      key: 'posted_at',
      header: 'Fecha',
      render: (m) => formatMovementTimestamp(m.posted_at),
    },
    {
      key: 'direction',
      header: 'Movimiento',
      render: (m) => <MovementDirectionBadge direction={m.direction} isReversal={m.is_reversal} />,
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (m) => reasonLabels[m.reason],
    },
    {
      key: 'variant',
      header: 'Variante',
      render: (m) => (m.variant ? `${m.variant.name} (${m.variant.code})` : '—'),
    },
    {
      key: 'location',
      header: 'Ubicación',
      render: (m) => movementLocationLabel(m),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      render: (m) =>
        m.variant?.base_uom
          ? `${m.quantity} ${m.variant.base_uom.symbol ?? m.variant.base_uom.code}`
          : m.quantity,
    },
    {
      key: 'reference',
      header: 'Referencia',
      render: (m) => m.reference ?? '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (m) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses[m.status]}`}
        >
          {statusLabels[m.status]}
        </span>
      ),
    },
  ]

  let emptyMessage: string | undefined
  if (isForbidden) {
    emptyMessage = 'No tienes permiso para consultar el historial de movimientos.'
  } else if (isError) {
    emptyMessage = 'No fue posible cargar los movimientos. Intenta de nuevo.'
  } else {
    emptyMessage = 'No hay movimientos que coincidan con los filtros.'
  }

  return (
    <PageContainer>
      <PageHeader
        title="Movimientos de Inventario"
        description="Historial inmutable de entradas, salidas, traspasos y reversas de existencia"
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Buscar por referencia..."
        />
        <FilterSelect
          label="Ubicación"
          value={filters.location_id}
          onChange={(value) => setFilter('location_id', value)}
          placeholder="Todas"
          options={locationOptions.map((loc) => ({ value: loc.id, label: loc.name }))}
        />
        <FilterSelect
          label="Variante"
          value={filters.item_variant_id}
          onChange={(value) => setFilter('item_variant_id', value)}
          placeholder="Todas"
          options={variantOptions.map((v) => ({ value: v.id, label: `${v.name} (${v.code})` }))}
        />
        <FilterSelect
          label="Motivo"
          value={filters.reason}
          onChange={(value) => setFilter('reason', value)}
          placeholder="Todos"
          options={reasonOptions}
        />
        <FilterSelect
          label="Estado"
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          placeholder="Todos"
          options={statusOptions}
        />
        <FilterSelect
          label="Origen"
          value={filters.source_type}
          onChange={(value) => setFilter('source_type', value)}
          placeholder="Cualquiera"
          options={[{ value: 'receipt', label: 'Recepción de compra' }]}
        />
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Desde:
          <Input
            type="date"
            aria-label="Publicado desde"
            value={filters.date_from}
            onChange={(event) => setFilter('date_from', event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Hasta:
          <Input
            type="date"
            aria-label="Publicado hasta"
            value={filters.date_to}
            onChange={(event) => setFilter('date_to', event.target.value)}
          />
        </label>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2 justify-self-start">
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <DataGrid
        data={movements}
        columns={columns}
        onRowClick={(m) => openMovement(m.id)}
        loading={isLoading}
        emptyMessage={emptyMessage}
        getRowId={(m) => m.id}
        totalResults={totalResults}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
        }}
      />

      <SlidePanel isOpen={isDetailOpen} onClose={closeMovement} title="Detalle del movimiento">
        {selectedMovement ? (
          <MovementDetail movement={selectedMovement} onOpenLinked={openMovement} />
        ) : (
          isDetailLoading && (
            <p className="p-6 text-sm text-muted-foreground">Cargando movimiento…</p>
          )
        )}
      </SlidePanel>
    </PageContainer>
  )
}
