import { Badge } from '@/components/ui/badge'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeePositionRole } from '@/types/employee'

// ─── Role color map ───────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'cook': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'kitchen-assistant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'delivery-driver': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'acting-manager': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'admin': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'super-admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EmployeeInfoHeaderProps {
  employee: Employee
  hasActivePeriod: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmployeeInfoHeader({ employee, hasActivePeriod }: EmployeeInfoHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Name + status badges */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {employee.first_name} {employee.last_name}
          </h3>
          <span className="font-mono text-sm text-muted-foreground">{employee.code}</span>
        </div>
        <div className="flex items-center gap-2">
          {!hasActivePeriod && (
            <Badge variant="default">Baja</Badge>
          )}
          <Badge variant={employee.is_active ? 'success' : 'default'}>
            {employee.is_active ? 'Habilitado' : 'Deshabilitado'}
          </Badge>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Email</span>
          <p className="font-medium">{employee.email || 'No registrado'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Teléfono</span>
          <p className="font-medium">
            {employee.phone
              ? `${employee.phone_country || ''} ${employee.phone}`.trim()
              : 'No registrado'}
          </p>
        </div>
      </div>

      {/* Position roles */}
      <div>
        <span className="text-sm text-muted-foreground">Puestos</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {(employee.roles || []).map((role) => (
            <span
              key={role}
              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
