import { useEffect, useState } from 'react'
import type { AuditLogFilters } from '@/types/attendance-payroll'

const EMPLOYEE_ID_DEBOUNCE_MS = 300

export interface UseAuditLogPageResult {
  employeeId: string
  setEmployeeId: (value: string) => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
  filters: AuditLogFilters
}

export function useAuditLogPage(): UseAuditLogPageResult {
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Debounce the free-text employee ID before it reaches the query — typing it
  // one character at a time would otherwise fire a request (and a 422 for any
  // partial/invalid ULID) on every keystroke. Date inputs change atomically
  // (picker selection), so they don't need this.
  const [debouncedEmployeeId, setDebouncedEmployeeId] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmployeeId(employeeId), EMPLOYEE_ID_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [employeeId])

  const filters: AuditLogFilters = {
    employee_id: debouncedEmployeeId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }

  return { employeeId, setEmployeeId, dateFrom, setDateFrom, dateTo, setDateTo, filters }
}
