import { createFileRoute, Link } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { NoBranchState, PayPeriodStatusBadge } from '@/components/attendance'
import { usePayPeriodsListPage } from './use-pay-periods-list'
import type { PayPeriodListItem, PayPeriodStatus } from '@/types/attendance-payroll'

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/attendance/payroll/')({
  beforeLoad: requirePermission('payroll.preview'),
  component: PayPeriodsListPage,
})

const STATUS_OPTIONS: { value: PayPeriodStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'REOPENED', label: 'Reabierto' },
]

const columns: Column<PayPeriodListItem>[] = [
  {
    key: 'period',
    header: 'Periodo',
    render: (period) => (
      <Link
        to="/attendance/payroll/$periodId"
        params={{ periodId: period.id }}
        className="font-medium text-primary hover:underline"
      >
        {period.period_start} — {period.period_end}
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Estatus',
    render: (period) => <PayPeriodStatusBadge status={period.status} />,
  },
  {
    key: 'closed_by',
    header: 'Cerrado por',
    render: (period) => period.closed_by ?? '—',
  },
  {
    key: 'closed_at',
    header: 'Cerrado el',
    render: (period) =>
      period.closed_at
        ? new Date(period.closed_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
  },
  {
    key: 'total_employees',
    header: 'Empleados',
    align: 'right',
    render: (period) => period.total_employees,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function PayPeriodsListPage() {
  const {
    hasBranch,
    status,
    setStatus,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    periods,
    meta,
    setPage,
    isLoading,
    errorMessage,
  } = usePayPeriodsListPage()

  if (!hasBranch) {
    return (
      <PageContainer>
        <NoBranchState />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Periodos de Nómina"
        description="Historial de periodos cerrados y reabiertos"
      />

      <div data-testid="pay-periods-filters" className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-period-status" className="text-sm font-medium text-gray-700">
            Estatus
          </label>
          <select
            id="pay-period-status"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={status}
            onChange={e => setStatus(e.target.value as PayPeriodStatus | '')}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-period-start" className="text-sm font-medium text-gray-700">
            Desde
          </label>
          <input
            id="pay-period-start"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={periodStart}
            onChange={e => setPeriodStart(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-period-end" className="text-sm font-medium text-gray-700">
            Hasta
          </label>
          <input
            id="pay-period-end"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)}
          />
        </div>
      </div>

      {errorMessage && (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {!errorMessage && (
        <DataGrid
          data={periods}
          columns={columns}
          loading={isLoading}
          emptyMessage="No hay periodos que coincidan con los filtros."
          getRowId={(period) => period.id}
          pagination={meta ? { currentPage: meta.current_page, totalPages: meta.last_page, onPageChange: setPage } : undefined}
          perPage={meta?.per_page}
          totalResults={meta?.total}
        />
      )}
    </PageContainer>
  )
}
