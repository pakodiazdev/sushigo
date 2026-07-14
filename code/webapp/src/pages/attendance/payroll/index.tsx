import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { NoBranchState, PayPeriodStatusBadge } from '@/components/attendance'
import { usePayPeriodsListPage } from './use-pay-periods-list'
import type { PayPeriodStatus } from '@/types/attendance-payroll'

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

      {isLoading && <ListSkeleton />}

      {!isLoading && periods.length === 0 && !errorMessage && (
        <p className="text-sm text-gray-500">No hay periodos que coincidan con los filtros.</p>
      )}

      {!isLoading && periods.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2">Estatus</th>
                <th className="px-4 py-2">Cerrado por</th>
                <th className="px-4 py-2">Cerrado el</th>
                <th className="px-4 py-2 text-right">Empleados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map(period => (
                <tr key={period.id} data-testid="pay-period-row">
                  <td className="px-4 py-2">
                    <Link
                      to="/attendance/payroll/$periodId"
                      params={{ periodId: period.id }}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {period.period_start} — {period.period_end}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <PayPeriodStatusBadge status={period.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-700">{period.closed_by ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {period.closed_at
                      ? new Date(period.closed_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">{period.total_employees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {meta.current_page} de {meta.last_page} · {meta.total} periodos
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              aria-label="Página anterior"
              disabled={meta.current_page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              aria-label="Página siguiente"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}
