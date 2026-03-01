import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, Edit, UserMinus, UserPlus, Power, PowerOff } from 'lucide-react'
import type { Employee } from '@/types/employee'
import { EmploymentPeriodsSection } from './employment-periods-section'
import { WageHistorySection } from './wage-history-section'
import { EmployeeInfoHeader } from './employee-info-header'
import { DeactivateForm } from './deactivate-form'
import { RehireForm } from './rehire-form'
import { useEmployeeDetailActions } from './use-employee-detail-actions'
import { ScheduleSection } from './schedule-section'

// ─── Props ───────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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
  const {
    hasActivePeriod,
    isLoading,
    showDeactivateForm,
    showRehireForm,
    showToggleConfirm,
    handleDeactivateSubmit,
    handleRehireSubmit,
    handleToggleActive,
    openDeactivateForm,
    openRehireForm,
    closeDeactivateForm,
    closeRehireForm,
    openToggleConfirm,
    closeToggleConfirm,
  } = useEmployeeDetailActions({
    employee,
    isDeactivating,
    isRehiring,
    isTogglingActive,
    onDeactivate,
    onRehire,
    onToggleActive,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Employee name, code, badges, contact, roles */}
      <EmployeeInfoHeader employee={employee} hasActivePeriod={hasActivePeriod} />

      <hr className="border-border" />

      {/* Employment history */}
      <EmploymentPeriodsSection periods={employee.employment_periods || []} />

      <hr className="border-border" />

      {/* Wage history */}
      <WageHistorySection employeeId={employee.id} />

      <hr className="border-border" />

      {/* Active schedule */}
      <ScheduleSection employee={employee} />

      <hr className="border-border" />

      {/* Inline forms (only one visible at a time) */}
      {showDeactivateForm && (
        <DeactivateForm
          isLoading={isDeactivating}
          onSubmit={handleDeactivateSubmit}
          onCancel={closeDeactivateForm}
        />
      )}

      {showRehireForm && (
        <RehireForm
          isLoading={isRehiring}
          onSubmit={handleRehireSubmit}
          onCancel={closeRehireForm}
        />
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
            onClick={openToggleConfirm}
            disabled={isLoading}
            className={
              employee.is_active
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
            onClick={openDeactivateForm}
            disabled={isLoading}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Dar de Baja
          </Button>
        )}

        {/* Reingreso — only when employee has NO active period */}
        {!hasActivePeriod && !showRehireForm && !showDeactivateForm && (
          <Button
            type="button"
            onClick={openRehireForm}
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
        onClose={closeToggleConfirm}
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
