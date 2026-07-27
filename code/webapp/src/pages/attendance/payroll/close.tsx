import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NoBranchState } from '@/components/attendance'
import { LabeledBadge } from '@/components/ui/labeled-badge'
import { formatWeekLabel } from '@/lib/week'
import { useClosePreviewPage } from './use-close-preview'
import { EmployeePayRow, PayRowSkeleton } from './-employee-pay-row'

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/attendance/payroll/close')({
  beforeLoad: requirePermission('payroll.preview'),
  component: PayrollClosePage,
})

// ── Page ──────────────────────────────────────────────────────────────────────

export function PayrollClosePage() {
  const {
    weekRange,
    rows,
    isLoading,
    errorMessage,
    hasBranch,
    isConfirmOpen,
    openConfirm,
    closeConfirm,
    confirmClose,
    isClosing,
    canConfirm,
    isRulesOpen,
    openRules,
    closeRules,
    isOverdue,
    overduePeriodsCount,
    isViewingOverdueWeek,
    canViewOlder,
    canViewNewer,
    viewOlder,
    viewNewer,
  } = useClosePreviewPage()

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
        title="Cierre de Nómina"
        description="Preview del cierre semanal — sin persistencia de datos"
      />

      <div className="mb-6 flex items-end gap-2">
        <LabeledBadge
          data-testid="current-week-label"
          label="Semana actual"
        >
          {formatWeekLabel(weekRange.periodStart, weekRange.periodEnd)}
        </LabeledBadge>
        {isOverdue && (
          <div className="flex items-center gap-1 pb-1.5">
            <button
              type="button"
              aria-label="Ver periodo pendiente anterior"
              data-testid="btn-view-older-period"
              onClick={viewOlder}
              disabled={!canViewOlder}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Ver periodo pendiente siguiente"
              data-testid="btn-view-newer-period"
              onClick={viewNewer}
              disabled={!canViewNewer}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isViewingOverdueWeek && (
        <p
          data-testid="overdue-period-notice"
          className="mb-4 flex items-start gap-1.5 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Este periodo está vencido —{' '}
            {overduePeriodsCount === 1
              ? 'es el único periodo pendiente de cierre.'
              : `hay ${overduePeriodsCount} periodos pendientes de cierre.`}{' '}
            Puedes cerrarlo directamente o navegar a otro.
          </span>
        </p>
      )}

      {errorMessage && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading && <PayRowSkeleton />}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map(row => (
            <EmployeePayRow key={row.employee.id} row={row} testId="employee-preview-row" />
          ))}

          <div className="flex flex-col items-end gap-1 pt-4">
            <div className="flex items-center gap-2">
              <Button variant="success" onClick={openConfirm} disabled={!canConfirm}>
                Confirmar cierre
              </Button>
              {!canConfirm && (
                <button
                  type="button"
                  aria-label="Reglas de cierre de nómina"
                  onClick={openRules}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            {!canConfirm && (
              <p className="text-xs text-gray-500">Disponible a partir del domingo 19:00 hrs.</p>
            )}
          </div>
        </div>
      )}

      {!isLoading && rows.length === 0 && !errorMessage && (
        <p className="text-sm text-gray-500">
          No hay empleados activos para calcular el cierre de esta semana.
        </p>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmClose}
        title="Confirmar cierre de nómina"
        description={
          <>
            Se cerrará el periodo del <strong>{weekRange.periodStart}</strong> al{' '}
            <strong>{weekRange.periodEnd}</strong> para <strong>{rows.length}</strong>{' '}
            {rows.length === 1 ? 'empleado' : 'empleados'}. Esta acción congela los datos
            calculados y no se puede modificar después.
          </>
        }
        confirmLabel="Confirmar y cerrar"
        cancelLabel="Cancelar"
        variant="warning"
        isLoading={isClosing}
        container="viewport"
      />

      <ConfirmDialog
        isOpen={isRulesOpen}
        onClose={closeRules}
        onConfirm={closeRules}
        title="Reglas de cierre de nómina"
        description={
          <>
            Los periodos son siempre semanales (lunes a domingo). Solo se puede cerrar el
            periodo una vez que la semana terminó — domingo ≥ 19:00 hrs.
          </>
        }
        confirmLabel="Entendido"
        variant="info"
        hideCancel
        container="viewport"
      />
    </PageContainer>
  )
}
