import { Flag } from 'lucide-react'
import type { TodayReportEmployee } from '@/types/report'
import { StatusBadge } from './status-badge'

/**
 * Single row in the today-report employee table.
 * Displays name/code, position role, status badge, check-in time and overtime flag.
 */
export function EmployeeRow({ employee }: { readonly employee: TodayReportEmployee }) {
  const checkInDisplay = employee.check_in_time
    ? new Date(employee.check_in_time).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <tr className="border-b hover:bg-muted/40 transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-sm">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.code}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground capitalize">
        {employee.role ?? '—'}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={employee.status} lateMinutes={employee.late_minutes} />
      </td>
      <td className="py-3 px-4 text-sm text-center">{checkInDisplay}</td>
      <td className="py-3 px-4 text-center">
        {employee.has_overtime && (
          <Flag
            className={`h-4 w-4 inline-block ${employee.overtime_authorized ? 'text-green-600' : 'text-amber-500'}`}
            aria-label={
              employee.overtime_authorized
                ? 'Horas extra autorizadas'
                : 'Horas extra pendientes de decisión'
            }
          />
        )}
      </td>
    </tr>
  )
}
