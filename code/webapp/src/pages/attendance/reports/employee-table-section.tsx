import { Flag } from 'lucide-react'
import { ErrorState } from '@/components/attendance'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { formatTimeInFrontendTz } from '@/lib/timezone'
import type { TodayReportEmployee } from '@/types/report'
import { StatusBadge } from './status-badge'

type EmployeeGridRow = TodayReportEmployee & { id: string }

function formatCheckIn(checkInTime: string | null): string {
  if (!checkInTime) return '—'
  return formatTimeInFrontendTz(checkInTime, { hour: '2-digit', minute: '2-digit' })
}

function skeletonBlock(width: string) {
  return () => <div className={`h-4 ${width} rounded bg-muted animate-pulse`} />
}

const columns: Column<EmployeeGridRow>[] = [
  {
    key: 'name',
    header: 'Empleado',
    render: (employee) => (
      <div>
        <p className="font-medium text-sm">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.code}</p>
      </div>
    ),
    skeleton: skeletonBlock('w-32'),
  },
  {
    key: 'role',
    header: 'Puesto',
    render: (employee) => (
      <span className="text-sm text-muted-foreground capitalize">{employee.role ?? '—'}</span>
    ),
    skeleton: skeletonBlock('w-20'),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (employee) => (
      <StatusBadge status={employee.status} lateMinutes={employee.late_minutes} />
    ),
    skeleton: skeletonBlock('w-16'),
  },
  {
    key: 'check_in_time',
    header: 'Entrada',
    align: 'center',
    render: (employee) => formatCheckIn(employee.check_in_time),
    skeleton: skeletonBlock('w-12 mx-auto'),
  },
  {
    key: 'has_overtime',
    header: 'HE',
    align: 'center',
    render: (employee) =>
      employee.has_overtime && (
        <Flag
          className={`h-4 w-4 inline-block ${employee.overtime_authorized ? 'text-green-600' : 'text-amber-500'}`}
          aria-label={
            employee.overtime_authorized
              ? 'Horas extra autorizadas'
              : 'Horas extra pendientes de decisión'
          }
        />
      ),
    skeleton: skeletonBlock('w-4 mx-auto'),
  },
]

/**
 * Employee table for the today-report page.
 * Handles three states: API error, empty list, and the populated table — via the shared DataGrid.
 */
export function EmployeeTableSection({
  isError,
  isLoading,
  employees,
}: {
  readonly isError: boolean
  readonly isLoading: boolean
  readonly employees: TodayReportEmployee[]
}) {
  if (isError) return <ErrorState />

  const rows: EmployeeGridRow[] = employees.map((employee) => ({
    ...employee,
    id: employee.employee_id,
  }))

  return (
    <div className="mt-8" data-testid="employee-table">
      <DataGrid
        data={rows}
        columns={columns}
        loading={isLoading}
        emptyMessage="No hay empleados activos en esta sucursal."
      />
    </div>
  )
}
