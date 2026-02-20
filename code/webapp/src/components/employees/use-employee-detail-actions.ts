import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types/employee'
import type { DeactivateFormValues } from './deactivate-form'
import type { RehireFormValues } from './rehire-form'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseEmployeeDetailActionsParams {
  employee: Employee
  isDeactivating: boolean
  isRehiring: boolean
  isTogglingActive: boolean
  onDeactivate: (endDate: string, reason?: string) => void
  onRehire: (startDate: string, branchId: number) => void
  onToggleActive: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates all UI state and event handlers for EmployeeDetailView.
 *
 * Keeps the view component free of business logic, making it easy to test
 * handlers independently and reducing cognitive load when reading the JSX.
 */
export function useEmployeeDetailActions({
  employee,
  isDeactivating,
  isRehiring,
  isTogglingActive,
  onDeactivate,
  onRehire,
  onToggleActive,
}: UseEmployeeDetailActionsParams) {
  // ── Auth state ───────────────────────────────────────────────────────────────

  const currentBranch = useAuthStore((s) => s.currentBranch)
  const availableBranches = useAuthStore((s) => s.availableBranches)

  // Use currentBranch or fall back to the first (and only) available branch.
  const effectiveBranch = currentBranch ?? availableBranches[0] ?? null

  // ── UI state ─────────────────────────────────────────────────────────────────

  const [showDeactivateForm, setShowDeactivateForm] = useState(false)
  const [showRehireForm, setShowRehireForm] = useState(false)
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────────

  const hasActivePeriod =
    employee.has_active_period ?? employee.employment_periods?.some((p) => p.is_active) ?? false

  const isLoading = isDeactivating || isRehiring || isTogglingActive

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleDeactivateSubmit = (values: DeactivateFormValues) => {
    onDeactivate(values.end_date, values.termination_reason || undefined)
  }

  const handleRehireSubmit = (values: RehireFormValues) => {
    // Guard: effectiveBranch is also validated in RehireForm (button is disabled),
    // but we keep this explicit check as second line of defence.
    if (!effectiveBranch) return
    onRehire(values.start_date, effectiveBranch.id)
  }

  const handleToggleActive = () => {
    onToggleActive()
    setShowToggleConfirm(false)
  }

  const openDeactivateForm = () => {
    setShowRehireForm(false)
    setShowDeactivateForm(true)
  }

  const openRehireForm = () => {
    setShowDeactivateForm(false)
    setShowRehireForm(true)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // State
    effectiveBranch,
    hasActivePeriod,
    isLoading,
    showDeactivateForm,
    showRehireForm,
    showToggleConfirm,
    // Handlers
    handleDeactivateSubmit,
    handleRehireSubmit,
    handleToggleActive,
    openDeactivateForm,
    openRehireForm,
    closeDeactivateForm: () => setShowDeactivateForm(false),
    closeRehireForm: () => setShowRehireForm(false),
    openToggleConfirm: () => setShowToggleConfirm(true),
    closeToggleConfirm: () => setShowToggleConfirm(false),
  }
}
