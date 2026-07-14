import { Clock3, Loader2, Plus } from 'lucide-react'
import type { OvertimeBankMovement } from '@/types/attendance-payroll'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { useOvertimeBankSection } from './use-overtime-bank-section'
import { OvertimeMovementTypeBadge, OvertimeOriginBadge } from './overtime-movement-badges'
import { ManualOvertimeMovementDialog } from './ManualOvertimeMovementDialog'
import type { ManualOvertimeMovementEmployee } from './use-manual-overtime-movement-dialog'

interface OvertimeBankSectionProps {
  readonly employeeId: string
  readonly employee?: ManualOvertimeMovementEmployee
}

function formatDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function balanceClass(minutes: number): string {
  if (minutes < 0) return 'text-destructive'
  if (minutes === 0) return 'text-muted-foreground'
  return 'text-foreground'
}

function MovementRow({ movement }: { readonly movement: OvertimeBankMovement }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 text-sm whitespace-nowrap">{formatDate(movement.date)}</td>
      <td className="py-2 pr-3"><OvertimeMovementTypeBadge type={movement.movement_type} /></td>
      <td className="py-2 pr-3"><OvertimeOriginBadge origin={movement.origin} /></td>
      <td className="py-2 pr-3 text-sm tabular-nums">{movement.minutes} min</td>
      <td className="py-2 pr-3 text-sm tabular-nums">
        {movement.amount !== null ? formatCurrency(movement.amount) : '—'}
      </td>
      <td className="py-2 text-sm">{movement.authorized_by ?? '—'}</td>
    </tr>
  )
}

export function OvertimeBankSection({ employeeId, employee }: OvertimeBankSectionProps) {
  const {
    movements,
    summary,
    isLoading,
    showManualMovementDialog,
    manualMovementEmployee,
    openManualMovementDialog,
    closeManualMovementDialog,
  } = useOvertimeBankSection(employeeId, employee)

  const { can } = useAuthStore()
  const canRegisterManualMovement = can('employees.update')

  return (
    <div className="space-y-4" data-testid="overtime-bank-section">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Banco de horas extra</h3>
        {canRegisterManualMovement && (
          <Button size="sm" variant="ghost" onClick={openManualMovementDialog} className="h-7 gap-1 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Movimiento manual
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && summary && (
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
            <p className={`text-3xl font-bold tabular-nums ${balanceClass(summary.balance_minutes)}`}>
              {summary.balance_formatted}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo actual ({summary.balance_minutes} min)
          </p>
        </div>
      )}

      {!isLoading && movements.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Sin movimientos de horas extra registrados</p>
      )}

      {!isLoading && movements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Origen</th>
                <th className="py-2 pr-3">Minutos</th>
                <th className="py-2 pr-3">Monto</th>
                <th className="py-2">Autorizado por</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ManualOvertimeMovementDialog
        isOpen={showManualMovementDialog}
        employee={manualMovementEmployee}
        onClose={closeManualMovementDialog}
      />
    </div>
  )
}
