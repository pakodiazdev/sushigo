import { Clock3, Loader2 } from 'lucide-react'
import type { OvertimeBankMovement } from '@/types/attendance-payroll'
import { useOvertimeBankSection } from './use-overtime-bank-section'
import { OvertimeMovementTypeBadge, OvertimeOriginBadge } from './overtime-movement-badges'

interface OvertimeBankSectionProps {
  readonly employeeId: string
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

export function OvertimeBankSection({ employeeId }: OvertimeBankSectionProps) {
  const { movements, summary, isLoading } = useOvertimeBankSection(employeeId)

  return (
    <div className="space-y-4" data-testid="overtime-bank-section">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Banco de horas extra</h3>
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
    </div>
  )
}
