import { useState, useEffect } from 'react'
import {
  useCreateEmployee,
  useUpdateEmployee,
  useNextEmployeeCode,
  useEmployee,
  useDeactivateEmployee,
  useRehireEmployee,
  useToggleEmployeeActive,
  useAssignableRoles,
} from '@/services/employee-hooks'
import type { Employee, EmployeePositionRole, EmployeeUpdateData, EntityResponse } from '@/types/employee'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeeFormValues } from './employee-edit-create-form'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PanelMode = 'detail' | 'edit' | 'create'

interface UseEmployeeFormParams {
  employee?: Employee | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates all data-fetching, mutations, mode management, and submit
 * handlers for the EmployeeForm slide panel.
 *
 * The view component (EmployeeForm) becomes a thin shell that only wires
 * props to child components, making it easy to test logic independently.
 */
export function useEmployeeForm({
  employee,
  isOpen,
  onClose,
  onSuccess,
}: UseEmployeeFormParams) {
  // ── Auth state ───────────────────────────────────────────────────────────────

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const currentBranch = useAuthStore((s) => s.currentBranch)

  // ── Panel mode ───────────────────────────────────────────────────────────────

  const isEditing = !!employee
  const [mode, setMode] = useState<PanelMode>('create')

  // Holds the employee returned by the create API so the detail view can render
  // immediately after creation without an extra round-trip — cleared when the
  // panel closes so the next open starts fresh.
  const [justCreatedEmployee, setJustCreatedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    setMode(isEditing ? 'detail' : 'create')
    if (!isOpen) setJustCreatedEmployee(null)
  }, [isEditing, isOpen])

  // ── Queries ──────────────────────────────────────────────────────────────────

  // Fetch full employee data when editing to get email/phone from the User record.
  const employeeQuery = useEmployee(isOpen && isEditing && employee?.id ? employee.id : '')
  const fullEmployee = employeeQuery.data || justCreatedEmployee || employee

  const nextCodeQuery = useNextEmployeeCode(isOpen && !isEditing)
  const assignableRolesQuery = useAssignableRoles()

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const deactivateMutation = useDeactivateEmployee()
  const rehireMutation = useRehireEmployee()
  const toggleActiveMutation = useToggleEmployeeActive()

  // ── Submit handlers ──────────────────────────────────────────────────────────

  const handleFormSubmit = async (values: EmployeeFormValues) => {
    try {
      if (mode === 'edit' && employee) {
        // Only send roles the current user is allowed to assign.
        // Roles outside the assignable set (e.g. 'super-admin' for non-super-admins)
        // are filtered out here — syncPositionRoles() on the backend preserves them.
        const assignableRoles = (assignableRolesQuery.data || []) as EmployeePositionRole[]
        const updateData: EmployeeUpdateData = {
          first_name: values.first_name,
          last_name: values.last_name,
          roles: (values.roles as EmployeePositionRole[]).filter((r) =>
            assignableRoles.includes(r),
          ),
        }

        if (isAdmin) {
          // Only send contact fields if they changed from the original value.
          // This preserves the backend `required_without` cross-validation:
          // absent fields are ignored, and the rule only fires when both are present.
          const originalEmail = fullEmployee?.email ?? ''
          const originalPhone = fullEmployee?.phone ?? ''
          const newEmail = (values.email ?? '').trim()
          const newPhone = (values.phone ?? '').trim()
          if (newEmail !== originalEmail) updateData.email = newEmail
          if (newPhone !== originalPhone) updateData.phone = newPhone
        }

        await updateMutation.mutateAsync({ id: employee.id, data: updateData })
        setMode('detail')
      } else {
        // Guard: zod blocks submission when hasBranch=false, but we add an
        // explicit runtime check as a second line of defence (same pattern as
        // handleRehireSubmit in useEmployeeDetailActions).
        if (!currentBranch) return
        const response = await createMutation.mutateAsync({
          code: (values as { code: string }).code,
          first_name: values.first_name,
          last_name: values.last_name,
          roles: values.roles as EmployeePositionRole[],
          email: values.email,
          phone: values.phone,
          start_date: (values as { start_date: string }).start_date,
          branch_id: currentBranch.id,
        })
        // Stay on the panel so the admin can assign a schedule right away.
        // Store the created employee and switch to detail view instead of closing.
        const newEmployee = (response.data as EntityResponse<Employee>).data
        setJustCreatedEmployee(newEmployee)
        setMode('detail')
      }
    } catch (error) {
      console.error('Error submitting employee form:', error)
    }
  }

  const handleDeactivate = async (endDate: string, reason?: string) => {
    if (!employee) return
    try {
      await deactivateMutation.mutateAsync({
        id: employee.id,
        data: { end_date: endDate, termination_reason: reason },
      })
      onSuccess()
    } catch (error) {
      console.error('Error deactivating:', error)
    }
  }

  const handleRehire = async (startDate: string, branchId: number) => {
    if (!employee) return
    try {
      await rehireMutation.mutateAsync({
        id: employee.id,
        data: { branch_id: branchId, start_date: startDate },
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error rehiring:', error)
    }
  }

  const handleToggleActive = async () => {
    if (!employee) return
    try {
      await toggleActiveMutation.mutateAsync(employee.id)
      onSuccess()
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleRefreshCode = () => {
    nextCodeQuery.refetch()
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    rehireMutation.isPending ||
    toggleActiveMutation.isPending ||
    employeeQuery.isLoading ||
    assignableRolesQuery.isLoading

  const panelTitle =
    mode === 'create'
      ? 'Nuevo Empleado'
      : mode === 'edit'
        ? 'Editar Empleado'
        : 'Detalle de Empleado'

  const panelDescription =
    mode === 'create'
      ? 'Registra un nuevo empleado en el sistema'
      : mode === 'edit'
        ? 'Actualiza los datos del empleado'
        : undefined

  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Mode
    mode,
    setMode,
    panelTitle,
    panelDescription,
    // Auth
    isAdmin,
    currentBranch,
    // Data
    fullEmployee,
    assignableRoles: (assignableRolesQuery.data || []) as EmployeePositionRole[],
    assignableRolesLoading: assignableRolesQuery.isLoading,
    assignableRolesError: assignableRolesQuery.isError,
    suggestedCode: nextCodeQuery.data?.code,
    isSuggestedCodeLoading: nextCodeQuery.isLoading,
    isRefreshingCode: nextCodeQuery.isFetching,
    // Loading
    isLoading,
    isEmployeeLoading: employeeQuery.isLoading,
    isDeactivating: deactivateMutation.isPending,
    isRehiring: rehireMutation.isPending,
    isTogglingActive: toggleActiveMutation.isPending,
    // Handlers
    handleFormSubmit,
    handleDeactivate,
    handleRehire,
    handleToggleActive,
    handleRefreshCode,
  }
}
