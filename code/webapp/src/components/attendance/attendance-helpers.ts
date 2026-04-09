import type { AttendancePhase } from '@/types/attendance'

/**
 * Returns Tailwind border classes based on the attendance phase.
 */
export function getPhaseCardClass(phase: AttendancePhase): string {
    switch (phase) {
        case 'pending':
            return 'border-muted/60 opacity-70'
        case 'checked-in':
            return 'border-blue-200 dark:border-blue-800'
        case 'at-lunch':
            return 'border-orange-200 dark:border-orange-800'
        case 'returned':
            return 'border-teal-200 dark:border-teal-800'
        case 'done':
            return 'border-green-200 dark:border-green-800'
        case 'on-leave':
            return 'border-amber-200 dark:border-amber-800'
    }
}
