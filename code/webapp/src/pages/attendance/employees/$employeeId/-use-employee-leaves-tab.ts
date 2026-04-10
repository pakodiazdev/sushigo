import { useState, useMemo } from 'react'
import { useEmployeeLeaves, useLeaveTypes } from '@/services/leave-hooks'
import type { LeaveFilters } from '@/services/leave-api'
import type { TodayAttendanceEmployee } from '@/types/attendance'

export function useEmployeeLeavesTab(employeeId: string, employee: { id: string; first_name: string; last_name: string; code: string } | undefined) {
  const [filters, setFilters] = useState<LeaveFilters>({})
  const [page, setPage] = useState(1)

  const queryFilters = useMemo(() => ({ ...filters, page }), [filters, page])
  const leavesQuery = useEmployeeLeaves(employeeId, queryFilters)
  const leaveTypesQuery = useLeaveTypes()

  const [pendingLeaveEmployee, setPendingLeaveEmployee] = useState<TodayAttendanceEmployee | null>(null)

  function openRegisterLeave() {
    if (!employee) return
    setPendingLeaveEmployee({
      id: employee.id,
      code: employee.code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      roles: [],
    })
  }

  function closeRegisterLeave() {
    setPendingLeaveEmployee(null)
  }

  function updateFilter(key: keyof LeaveFilters, value: string | number | undefined) {
    setPage(1)
    setFilters((prev) => {
      const next = { ...prev }
      if (value === undefined || value === '') {
        delete next[key]
      } else {
        (next as Record<string, string | number>)[key] = value
      }
      return next
    })
  }

  return {
    leaves: leavesQuery.data?.data ?? [],
    meta: leavesQuery.data?.meta,
    isLoading: leavesQuery.isLoading,
    leaveTypes: leaveTypesQuery.data ?? [],
    filters,
    page,
    setPage,
    updateFilter,
    pendingLeaveEmployee,
    openRegisterLeave,
    closeRegisterLeave,
  }
}
