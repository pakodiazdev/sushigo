import { useAuthStore } from '@/stores/auth.store'
import { todayDateCdmx } from '@/lib/datetime'

export interface AttendancePermissions {
    canEdit: boolean
    requiresReason: boolean
}

/**
 * Returns edit permissions for a given attendance date.
 *
 * - Admin/super-admin: can edit any date; requiresReason=true when date < today
 * - Manager (non-admin): can only edit today; requiresReason=false always
 * - null date: treated as today (can edit, no reason required)
 */
export function useAttendancePermissions(date: string | null): AttendancePermissions {
    const isAdmin = useAuthStore(s => s.isAdmin)
    const today = todayDateCdmx()
    const isToday = date === null || date === today
    const isPastDay = date !== null && date < today

    if (isAdmin) {
        return { canEdit: true, requiresReason: isPastDay }
    }

    return { canEdit: isToday, requiresReason: false }
}
