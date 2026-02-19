import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, Edit, UserMinus, UserPlus, Power, PowerOff } from 'lucide-react'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeePositionRole } from '@/types/employee'
import { EmploymentPeriodsSection } from './employment-periods-section'
import { useAuthStore } from '@/stores/auth.store'

const ROLE_COLORS: Record<string, string> = {
  'employee-manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'employee-cook': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'employee-kitchen-assistant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'employee-delivery-driver': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'employee-acting-manager': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'cook': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'kitchen-assistant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'delivery-driver': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'acting-manager': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'admin': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'super-admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface EmployeeDetailViewProps {
  employee: Employee
  onEdit: () => void
  onDeactivate: (endDate: string, reason?: string) => void
  onRehire: (startDate: string, branchId: number) => void
  onToggleActive: () => void
  isDeactivating: boolean
  isRehiring: boolean
  isTogglingActive: boolean
}

export function EmployeeDetailView({
  employee,
  onEdit,
  onDeactivate,
  onRehire,
  onToggleActive,
  isDeactivating,
  isRehiring,
  isTogglingActive,
}: EmployeeDetailViewProps) {
  const [showDeactivateForm, setShowDeactivateForm] = useState(false)
  const [showRehireForm, setShowRehireForm] = useState(false)
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [rehireDate, setRehireDate] = useState(() => new Date().toISOString().slice(0, 10))

  const currentBranch = useAuthStore((s) => s.currentBranch)
  const availableBranches = useAuthStore((s) => s.availableBranches)

  // Use currentBranch or fall back to the first (and only) available branch
  const effectiveBranch = currentBranch ?? availableBranches[0] ?? null

  const hasActivePeriod = employee.employment_periods?.some(p => p.is_active) ?? false

  const handleDeactivate = () => {
    onDeactivate(endDate, reason || undefined)
  }

  const handleRehire = () => {
    if (!effectiveBranch) return
    onRehire(rehireDate, effectiveBranch.id)
  }

  const handleToggleActive = () => {
    onToggleActive()
    setShowToggleConfirm(false)
  }

  const isLoading = isDeactivating || isRehiring || isTogglingActive

  return (
    <div className="space-y-6">
      {/* Header with name + status */}
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

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Email</span>
          <p className="font-medium">{employee.email || 'No registrado'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Teléfono</span>
          <p className="font-medium">
            {employee.phone
              ? `${employee.phone_country || ''} ${employee.phone}`
              : 'No registrado'}
          </p>
        </div>
      </div>

      {/* Roles */}
      <div>
        <span className="text-sm text-muted-foreground">Puestos</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {(employee.roles || []).map((role) => (
            <span
              key={role}
              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'
                }`}
            >
              {EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {/* Employment periods */}
      <EmploymentPeriodsSection periods={employee.employment_periods || []} />

      <hr className="border-border" />

      {/* Deactivate (Baja) form — terminates employment period + forces disable */}
      {showDeactivateForm && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h4 className="text-sm font-semibold">Dar de Baja</h4>
          <p className="text-xs text-muted-foreground">
            Al dar de baja se cierra el periodo de empleo actual y el empleado queda deshabilitado.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Fecha de baja</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Motivo (opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Renuncia voluntaria, despido, etc."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowDeactivateForm(false)}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeactivate}
              disabled={isLoading || !endDate}
              className="bg-amber-600 text-white hover:bg-amber-700 text-xs"
            >
              {isDeactivating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Confirmar Baja
            </Button>
          </div>
        </div>
      )}

      {/* Rehire form — auto-uses the only available branch */}
      {showRehireForm && (
        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <h4 className="text-sm font-semibold">Reingreso</h4>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Fecha de reingreso</label>
            <input
              type="date"
              value={rehireDate}
              onChange={(e) => setRehireDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          {effectiveBranch && (
            <p className="text-xs text-muted-foreground">
              Sucursal asignada automáticamente: <span className="font-medium text-foreground">{effectiveBranch.name}</span>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowRehireForm(false)}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRehire}
              disabled={isLoading || !rehireDate || !effectiveBranch}
              className="bg-green-600 text-white hover:bg-green-700 text-xs"
            >
              {isRehiring && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Confirmar Reingreso
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={onEdit}
          disabled={isLoading}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>

        {/* Toggle enable/disable — only when employee has an active period */}
        {hasActivePeriod && !showDeactivateForm && !showRehireForm && (
          <Button
            type="button"
            onClick={() => setShowToggleConfirm(true)}
            disabled={isLoading}
            className={employee.is_active
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }
          >
            {isTogglingActive ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : employee.is_active ? (
              <PowerOff className="mr-2 h-4 w-4" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            {employee.is_active ? 'Deshabilitar' : 'Habilitar'}
          </Button>
        )}

        {/* Dar de Baja — only when employee has an active period */}
        {hasActivePeriod && !showDeactivateForm && !showRehireForm && (
          <Button
            type="button"
            onClick={() => {
              setShowRehireForm(false)
              setShowDeactivateForm(true)
            }}
            disabled={isLoading}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Dar de Baja
          </Button>
        )}

        {/* Reingreso — only when employee has NO active period (was given baja) */}
        {!hasActivePeriod && !showRehireForm && !showDeactivateForm && (
          <Button
            type="button"
            onClick={() => {
              setShowDeactivateForm(false)
              setShowRehireForm(true)
            }}
            disabled={isLoading}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Reingreso
          </Button>
        )}
      </div>

      {/* Confirmation dialog for toggle active */}
      <ConfirmDialog
        isOpen={showToggleConfirm}
        onClose={() => setShowToggleConfirm(false)}
        onConfirm={handleToggleActive}
        title={employee.is_active ? 'Deshabilitar empleado' : 'Habilitar empleado'}
        description={
          employee.is_active
            ? `¿Estás seguro de deshabilitar a ${employee.first_name} ${employee.last_name}? El empleado no podrá acceder al sistema mientras esté deshabilitado.`
            : `¿Estás seguro de habilitar a ${employee.first_name} ${employee.last_name}? El empleado podrá acceder al sistema nuevamente.`
        }
        confirmLabel={employee.is_active ? 'Deshabilitar' : 'Habilitar'}
        variant={employee.is_active ? 'warning' : 'info'}
        isLoading={isTogglingActive}
      />
    </div>
  )
}
