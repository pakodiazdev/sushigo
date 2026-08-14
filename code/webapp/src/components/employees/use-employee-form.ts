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

const PANEL_TITLES: Record<PanelMode, string> = {
  create: 'Nuevo Empleado',
  edit: 'Editar Empleado',
  detail: 'Detalle de Empleado',
}

const PANEL_DESCRIPTIONS: Record<PanelMode, string | undefined> = {
  create: 'Registra un nuevo empleado en el sistema',
  edit: 'Actualiza los datos del empleado',
  detail: undefined,
}

interface UseEmployeeFormParams {
  employee?: Employee | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Called with the newly created employee so the parent can update the URL
   *  (e.g. navigate to ?form=<id>). This allows the detail view that stays
   *  open after creation to work correctly: the `employee` prop gets populated,
   *  the edit guard works, and a page refresh won't lose the just-created data. */
  onCreated?: (employee: Employee) => void
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
  onCreated,
}: UseEmployeeFormParams) {
  // ── Auth state ───────────────────────────────────────────────────────────────

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const currentBranch = useAuthStore((s) => s.currentBranch)
  // Precise counterpart to the backend's avatar-replacement gate
  // (User::userCanManageMedia / UpdateEmployeeRequest::authorizesAvatarReplacement,
  // which check the users.update permission, not the admin/super-admin role name) — kept
  // separate from isAdmin so a role that carries users.update without being named
  // admin/super-admin still sees the uploader, and one that lacks it never does.
  const canManageUsers = useAuthStore((s) => s.can('users.update'))

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

  // Clear the just-created snapshot whenever the panel navigates to a *different*
  // employee while staying open (e.g. user clicks another row in the table).
  // Without this, employee A's data flashes briefly in employee B's detail view
  // because fullEmployee = employeeQuery.data || justCreatedEmployee || employee
  // and justCreatedEmployee is still set while B's query is pending.
  useEffect(() => {
    setJustCreatedEmployee(null)
  }, [employee?.id])

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

  // Extracted from handleFormSubmit (which just dispatches to one of these + the shared
  // catch) to keep each branch's own nesting independently readable, rather than one
  // function carrying both the edit and create flows plus their inner conditionals at once.

  const submitEmployeeUpdate = async (values: EmployeeFormValues) => {
    if (!employee) return

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
      attendance_exempt: values.attendance_exempt,
    }

    if (isAdmin) {
      // Only send contact fields if they changed from the original value.
      // This preserves the backend `required_without` cross-validation:
      // absent fields are ignored, and the rule only fires when both are present.
      const originalEmail = fullEmployee?.user.email ?? ''
      const originalPhone = fullEmployee?.user.phone ?? ''
      const newEmail = (values.email ?? '').trim()
      const newPhone = (values.phone ?? '').trim()
      if (newEmail !== originalEmail) updateData.email = newEmail
      if (newPhone !== originalPhone) updateData.phone = newPhone
    }

    // Only present when MediaGalleryUploader produced a completed upload this session —
    // omitted entirely otherwise, so an edit with no avatar change behaves exactly as before.
    if (values.media_gallery_id) {
      updateData.media_gallery_id = values.media_gallery_id
      updateData.owner_token = values.owner_token
    }

    await updateMutation.mutateAsync({ id: employee.id, data: updateData })
    setMode('detail')
  }

  const submitNewEmployee = async (values: EmployeeFormValues) => {
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
      attendance_exempt: values.attendance_exempt,
      // Only present when MediaGalleryUploader produced a completed upload this session —
      // omitted entirely otherwise, so creating an employee with no avatar behaves exactly
      // as before.
      ...(values.media_gallery_id
        ? { media_gallery_id: values.media_gallery_id, owner_token: values.owner_token }
        : {}),
    })

    // Stay on the panel so the admin can assign a schedule right away.
    // Store the created employee for immediate rendering, then notify the
    // parent so it can update the URL (?form=<id>). This ensures the
    // `employee` prop gets populated, the edit guard works correctly, and
    // a page refresh doesn't revert to a blank create form.
    const newEmployee = (response.data as EntityResponse<Employee>).data
    setJustCreatedEmployee(newEmployee)
    setMode('detail')
    onCreated?.(newEmployee)
  }

  const handleFormSubmit = async (values: EmployeeFormValues) => {
    try {
      if (mode === 'edit' && employee) {
        await submitEmployeeUpdate(values)
      } else {
        await submitNewEmployee(values)
      }
    } catch (error) {
      // createMutation/updateMutation already show a toast via their own onError
      // (employee-hooks.ts). This catch only stops the rejection (e.g. the
      // avatar-replacement 403 from UpdateEmployeeRequest::authorizesAvatarReplacement)
      // from propagating further — a second showError here would duplicate that toast.
      console.error('Error saving employee:', error)
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

  const panelTitle = PANEL_TITLES[mode]

  const panelDescription = PANEL_DESCRIPTIONS[mode]

  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Mode
    mode,
    setMode,
    panelTitle,
    panelDescription,
    // Auth
    isAdmin,
    canManageUsers,
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
