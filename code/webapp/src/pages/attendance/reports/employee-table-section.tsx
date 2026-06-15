import { ErrorState } from '@/components/attendance'
import type { TodayReportEmployee } from '@/types/report'
import { EmployeeRow } from './employee-row'

/**
 * Employee table for the today-report page.
 * Handles three states: API error, empty list, and the populated table.
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
  if (employees.length === 0 && !isLoading) {
    return (
      <div className="mt-8 p-8 text-center border-2 border-dashed rounded-lg border-muted">
        <p className="text-muted-foreground">No hay empleados activos en esta sucursal.</p>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-lg border overflow-hidden">
      <table className="w-full text-sm" data-testid="employee-table">
        <thead className="bg-muted/50">
          <tr>
            <th className="py-3 px-4 text-left font-medium">Empleado</th>
            <th className="py-3 px-4 text-left font-medium">Puesto</th>
            <th className="py-3 px-4 text-left font-medium">Estado</th>
            <th className="py-3 px-4 text-center font-medium">Entrada</th>
            <th className="py-3 px-4 text-center font-medium">HE</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <EmployeeRow key={employee.employee_id} employee={employee} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
