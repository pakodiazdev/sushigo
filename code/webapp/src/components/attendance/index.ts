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
    OvertimeDecisionBadge,
    RoleBadges,
} from './EmployeeAttendanceCard'
export type { EmployeeAttendanceCardProps } from './EmployeeAttendanceCard'

// OvertimeDecisionDialog
export { OvertimeDecisionDialog } from './OvertimeDecisionDialog'
export type { OvertimeDecisionDialogProps } from './OvertimeDecisionDialog'

// Helper from separate file (Fast Refresh compatible)
export { getPhaseCardClass } from './attendance-helpers'

export { AttendanceSummaryBar, SummaryStat, OvertimeWarning } from './AttendanceSummaryBar'
export type { AttendanceSummaryBarProps, AttendanceSummary } from './AttendanceSummaryBar'

export { EmptyState, ErrorState, NoBranchState, SkeletonGrid } from './AttendanceStates'

// Pay Period Status Badge
export { PayPeriodStatusBadge } from './PayPeriodStatusBadge'
export type { PayPeriodStatusBadgeProps } from './PayPeriodStatusBadge'

// Close Day Panel
export { CloseDayPanel } from './CloseDayPanel'
export { useCloseDayPanel } from './use-close-day-panel'

// ExtraDayNegotiationDialog
export { ExtraDayNegotiationDialog } from './ExtraDayNegotiationDialog'
export type { ExtraDayNegotiationDialogProps } from './ExtraDayNegotiationDialog'

// Extra Day hooks
export { useExtraDayExpress } from './use-extra-day-express'
export { useExtraDayNegotiationDialog } from './use-extra-day-negotiation-dialog'

// Weekly Summary Dialog
export { WeeklySummaryDialog } from './WeeklySummaryDialog'
export type { WeeklySummaryDialogProps } from './WeeklySummaryDialog'
export { useWeeklySummaryDialog } from './use-weekly-summary-dialog'
export type { WeeklySummaryDialogState } from './use-weekly-summary-dialog'

// Register Leave Dialog
export { RegisterLeaveDialog } from './RegisterLeaveDialog'
export type { RegisterLeaveDialogProps } from './RegisterLeaveDialog'
export { useRegisterLeaveDialog } from './use-register-leave-dialog'
export type { UseRegisterLeaveDialogProps, UseRegisterLeaveDialogResult, RegisterLeaveFormValues } from './use-register-leave-dialog'
