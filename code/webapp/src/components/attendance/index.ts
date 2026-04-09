// Attendance Components Barrel Export

// AttendanceTimeDialog component
export { AttendanceTimeDialog } from './AttendanceTimeDialog'
export type { AttendanceTimeDialogProps } from './AttendanceTimeDialog'

// Hook and schema from separate file (Fast Refresh compatible)
export { useAttendanceTimeDialog, createTimeSchema } from './use-attendance-time-dialog'
export type { UseAttendanceTimeDialogParams, TimeFormValues } from './use-attendance-time-dialog'

// EmployeeAttendanceCard components
export {
    EmployeeAttendanceCard,
    PhaseBadge,
    TimeRow,
    LateRow,
    OvertimeAlert,
    RoleBadges,
} from './EmployeeAttendanceCard'
export type { EmployeeAttendanceCardProps } from './EmployeeAttendanceCard'

// Helper from separate file (Fast Refresh compatible)
export { getPhaseCardClass } from './attendance-helpers'

export { AttendanceSummaryBar, SummaryStat, OvertimeWarning } from './AttendanceSummaryBar'
export type { AttendanceSummaryBarProps, AttendanceSummary } from './AttendanceSummaryBar'

export { EmptyState, ErrorState, NoBranchState, SkeletonGrid } from './AttendanceStates'

// Close Day Panel
export { CloseDayPanel } from './CloseDayPanel'
export { useCloseDayPanel } from './use-close-day-panel'

// Register Leave Dialog
export { RegisterLeaveDialog } from './RegisterLeaveDialog'
export type { RegisterLeaveDialogProps } from './RegisterLeaveDialog'
export { useRegisterLeaveDialog } from './use-register-leave-dialog'
export type { UseRegisterLeaveDialogProps, UseRegisterLeaveDialogResult, RegisterLeaveFormValues } from './use-register-leave-dialog'
