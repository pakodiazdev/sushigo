import { createFileRoute, Link } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { PayPeriodStatusBadge } from '@/components/attendance'
import { usePayPeriodDetailPage } from './use-pay-period-detail'
import { EmployeePayRow, PayRowSkeleton } from './-employee-pay-row'

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/attendance/payroll/$periodId')({
  beforeLoad: requirePermission('payroll.preview'),
  component: ClosedPeriodDetailPage,
})

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClosedPeriodDetailPage() {
  const { periodId } = Route.useParams()
  const { payPeriod, isLoading, errorMessage, canExport, isExporting, exportCsv } =
    usePayPeriodDetailPage(periodId)

  return (
    <PageContainer>
      <PageHeader
        title="Detalle de Periodo de Nómina"
        description={payPeriod ? `${payPeriod.period_start} — ${payPeriod.period_end}` : 'Cargando periodo...'}
        action={
          <div className="flex items-center gap-4">
            {payPeriod && canExport && (
              <Button size="sm" variant="outline" disabled={isExporting} onClick={exportCsv}>
                {isExporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            )}
            <Link to="/attendance/payroll" className="text-sm font-medium text-indigo-600 hover:underline">
              ← Volver al listado
            </Link>
          </div>
        }
      />

      {errorMessage && (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading && <PayRowSkeleton />}

      {!isLoading && payPeriod && (
        <>
          <div
            data-testid="pay-period-summary"
            className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <PayPeriodStatusBadge status={payPeriod.status} />
            <span className="text-sm text-gray-600">
              Cerrado por <strong>{payPeriod.closed_by ?? '—'}</strong>
              {payPeriod.closed_at && (
                <>
                  {' '}
                  el{' '}
                  <strong>
                    {new Date(payPeriod.closed_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                  </strong>
                </>
              )}
            </span>
            {payPeriod.status === 'REOPENED' && (
              <span className="text-sm text-yellow-700">
                Reabierto por <strong>{payPeriod.reopened_by ?? '—'}</strong>
                {payPeriod.reopen_reason && <> — {payPeriod.reopen_reason}</>}
              </span>
            )}
            <span className="text-sm text-gray-500">{payPeriod.total_employees} empleados</span>
          </div>

          <div className="space-y-2">
            {payPeriod.employees.map(row => (
              <EmployeePayRow key={row.employee.id} row={row} testId="employee-detail-row" />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  )
}
