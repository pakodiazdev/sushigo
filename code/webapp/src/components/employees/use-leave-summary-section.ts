import { useState, useMemo } from 'react'
import { useEmployeeLeaves, useLeaveTypes } from '@/services/leave-hooks'
import type { LeaveFilters } from '@/services/leave-api'
import type { Leave } from '@/types/leave'
import type { TodayAttendanceEmployee } from '@/types/attendance'

export function useLeaveSummarySection(employeeId: string, employee: { id: string; code: string; user: { first_name: string | null; last_name: string | null } } | undefined) {
    const [showFullHistory, setShowFullHistory] = useState(false)
    const [filters, setFilters] = useState<LeaveFilters>({})
    const [page, setPage] = useState(1)

    // Current month range for summary
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`

    // Summary query: current month, all results (overlap semantics for cross-boundary leaves)
    const summaryQuery = useEmployeeLeaves(employeeId, { overlap_from: monthStart, overlap_to: monthEnd, per_page: 100 })

    // Recent leaves: last 3
    const recentQuery = useEmployeeLeaves(employeeId, { per_page: 3 })

    // Full history query (for dialog — disabled when dialog is closed)
    const fullFilters = useMemo(() => ({ ...filters, page }), [filters, page])
    const fullQuery = useEmployeeLeaves(showFullHistory ? employeeId : '', fullFilters)

    const leaveTypesQuery = useLeaveTypes()

    // Compute monthly summary grouped by leave type
    const monthlySummary = useMemo(() => {
        if (!summaryQuery.data?.data) return []
        const counts = new Map<string, { name: string; count: number; code: string }>()
        for (const leave of summaryQuery.data.data) {
            const key = leave.leave_type.code
            const existing = counts.get(key)
            if (existing) {
                existing.count++
            } else {
                counts.set(key, { name: leave.leave_type.name, count: 1, code: key })
            }
        }
        return Array.from(counts.values())
    }, [summaryQuery.data?.data])

    // Register leave state (direct/express — anticipated requests go through
    // the "Solicitudes" self-service page instead)
    const [pendingLeaveEmployee, setPendingLeaveEmployee] = useState<TodayAttendanceEmployee | null>(null)
    const [showRegisterLeave, setShowRegisterLeave] = useState(false)

    function openRegisterLeave() {
        if (!employee) return
        setPendingLeaveEmployee({
            id: employee.id,
            code: employee.code,
            user: {
                first_name: employee.user.first_name,
                last_name: employee.user.last_name,
            },
            roles: [],
            daily_wage: null,
        })
        setShowRegisterLeave(true)
    }

    function closeRegisterLeave() {
        setShowRegisterLeave(false)
        setPendingLeaveEmployee(null)
    }

    function updateFilter(key: keyof LeaveFilters, value: LeaveFilters[keyof LeaveFilters]) {
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
        monthlySummary,
        recentLeaves: recentQuery.data?.data ?? [] as Leave[],
        isLoadingSummary: summaryQuery.isLoading || recentQuery.isLoading,
        // Full history dialog
        showFullHistory,
        openFullHistory: () => setShowFullHistory(true),
        closeFullHistory: () => { setShowFullHistory(false); setFilters({}); setPage(1) },
        fullLeaves: fullQuery.data?.data ?? [] as Leave[],
        fullMeta: fullQuery.data?.meta,
        isLoadingFull: fullQuery.isLoading,
        leaveTypes: leaveTypesQuery.data ?? [],
        filters,
        page,
        setPage,
        updateFilter,
        // Register leave (direct)
        showRegisterLeave,
        pendingLeaveEmployee,
        openRegisterLeave,
        closeRegisterLeave,
    }
}
