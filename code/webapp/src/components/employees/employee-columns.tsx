import { Eye, BarChart3, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Column } from '@/components/ui/data-grid'
import { formatFirstLast } from '@/lib/format'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeePositionRole } from '@/types/employee'

const ROLE_COLORS: Record<string, string> = {
  'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'cook': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'kitchen-assistant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'delivery-driver': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'acting-manager': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'admin': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'super-admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getEmployeeColumns(
  onEdit: (item: Employee) => void,
  onWeeklySummary?: (item: Employee) => void,
  onViewAudit?: (item: Employee) => void,
): Column<Employee>[] {
  return [
    {
      key: 'code',
      header: 'Codigo',
      width: '120px',
      sortKey: 'code',
      render: (item) => (
        <span className="font-mono font-semibold">{item.code}</span>
      ),
      skeleton: () => <div className="h-4 w-16 rounded bg-muted animate-pulse" />,
    },
    {
      key: 'name',
      header: 'Nombre',
      sortKey: 'first_name',
      render: (item) => (
        <div className="font-medium">
          {formatFirstLast(item.user)}
        </div>
      ),
      skeleton: () => <div className="h-4 w-32 rounded bg-muted animate-pulse" />,
    },
    {
      key: 'roles',
      header: 'Puestos',
      width: '220px',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {(item.roles || []).map(role => (
            <span key={role} className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
              ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'
            }`}>
              {EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
            </span>
          ))}
        </div>
      ),
      skeleton: () => (
        <div className="flex gap-1">
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      width: '100px',
      align: 'center',
      hideBelow: 'md',
      render: (item) => {
        const hasActivePeriod = item.has_active_period ?? item.employment_periods?.some(p => p.is_active) ?? null

        if (hasActivePeriod === false) {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Baja
            </span>
          )
        }

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {item.is_active ? 'Activo' : 'Inactivo'}
          </span>
        )
      },
      skeleton: () => <div className="mx-auto h-5 w-14 rounded-full bg-muted animate-pulse" />,
    },
    {
      key: 'created_at',
      header: 'Fecha Creacion',
      width: '150px',
      sortKey: 'created_at',
      hideBelow: 'lg',
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(item.created_at)}
        </span>
      ),
      skeleton: () => <div className="h-4 w-24 rounded bg-muted animate-pulse" />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: `${80 + (onWeeklySummary ? 40 : 0) + (onViewAudit ? 40 : 0)}px`,
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          {onWeeklySummary && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onWeeklySummary(item)
              }}
              className="h-8 w-8 p-0"
              title="Ver resumen semanal"
              aria-label="Ver resumen semanal"
              data-testid="btn-weekly-summary"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            className="h-8 w-8 p-0"
            title="Ver detalle"
            aria-label="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onViewAudit && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onViewAudit(item)
              }}
              className="h-8 w-8 p-0"
              title="Ver auditoría"
              aria-label="Ver auditoría"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      skeleton: () => <div className="mx-auto h-8 w-8 rounded bg-muted animate-pulse" />,
    },
  ]
}
