import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NoBranchState } from '@/components/attendance'
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
    rows,
    isLoading,
    errorMessage,
    hasBranch,
    calculate,
    pendingRange,
    setPendingRange,
    activeRange,
    isConfirmOpen,
    openConfirm,
    closeConfirm,
    confirmClose,
    isClosing,
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

      <div data-testid="payroll-preview-form" className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="period-start" className="text-sm font-medium text-gray-700">
            Inicio del período
          </label>
          <input
            id="period-start"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={pendingRange.periodStart}
            onChange={e => setPendingRange({ ...pendingRange, periodStart: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="period-end" className="text-sm font-medium text-gray-700">
            Fin del período
          </label>
          <input
            id="period-end"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={pendingRange.periodEnd}
            onChange={e => setPendingRange({ ...pendingRange, periodEnd: e.target.value })}
          />
        </div>
        <button
          onClick={calculate}
          disabled={isLoading}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Calculando...' : 'Calcular preview'}
        </button>
      </div>

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

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={openConfirm}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Confirmar cierre
            </button>
          </div>
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-gray-500">
          Selecciona un rango de fechas y presiona &ldquo;Calcular preview&rdquo;.
        </p>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmClose}
        title="Confirmar cierre de nómina"
        description={
          activeRange && (
            <>
              Se cerrará el periodo del <strong>{activeRange.periodStart}</strong> al{' '}
              <strong>{activeRange.periodEnd}</strong> para <strong>{rows.length}</strong>{' '}
              {rows.length === 1 ? 'empleado' : 'empleados'}. Esta acción congela los datos
              calculados y no se puede modificar después.
            </>
          )
        }
        confirmLabel="Confirmar y cerrar"
        cancelLabel="Cancelar"
        variant="warning"
        isLoading={isClosing}
        container="viewport"
      />
    </PageContainer>
  )
}
