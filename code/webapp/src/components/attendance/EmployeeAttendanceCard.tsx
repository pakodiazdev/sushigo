import {
    UtensilsCrossed,
    AlertTriangle,
    LogIn,
    Undo2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAttendancePhase, formatTime, formatSeconds } from '@/types/attendance'
import type {
    TodayAttendanceRow,
    AttendancePhase,
    TodayAttendanceEmployee,
} from '@/types/attendance'
import { getPhaseCardClass } from './attendance-helpers'

// ── Sub-components ─────────────────────────────────────────────────────────────

interface PhaseBadgeProps {
    phase: AttendancePhase
}

export function PhaseBadge({ phase }: Readonly<PhaseBadgeProps>) {
    switch (phase) {
        case 'pending':
            return <Badge variant="default">⭕ Sin registro</Badge>
        case 'checked-in':
            return <Badge variant="info">⏰ En trabajo</Badge>
        case 'at-lunch':
            return (
                <Badge variant="warning" className="flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3" /> Comida
                </Badge>
            )
        case 'returned':
            return <Badge variant="info">↩ Regresó</Badge>
        case 'done':
            return <Badge variant="success">✅ Completo</Badge>
    }
}

interface TimeRowProps {
    icon: string
    label: string
    value: string
}

export function TimeRow({ icon, label, value }: Readonly<TimeRowProps>) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
                <span>{icon}</span>
                {label}
            </span>
            <span className="font-mono font-medium text-foreground">{value}</span>
        </div>
    )
}

interface LateRowProps {
    label: string
    value: string
    deductible: boolean
}

export function LateRow({ label, value, deductible }: Readonly<LateRowProps>) {
    return (
        <div className="flex items-center justify-between rounded bg-red-50 dark:bg-red-950/30 px-2 py-0.5">
            <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {label}
                {deductible && (
                    <span className="ml-1 text-[9px] bg-red-200 dark:bg-red-800 rounded px-1 uppercase tracking-wide">
                        deducible
                    </span>
                )}
            </span>
            <span className="font-mono text-red-700 dark:text-red-400 font-medium">
                {value}
            </span>
        </div>
    )
}

interface OvertimeAlertProps {
    overtimeMinutes: number
}

export function OvertimeAlert({ overtimeMinutes }: Readonly<OvertimeAlertProps>) {
    return (
        <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span className="text-[11px] text-yellow-800 dark:text-yellow-300 font-medium">
                Overtime: {overtimeMinutes} min — pendiente autorización
            </span>
        </div>
    )
}

interface RoleBadgesProps {
    roles: string[]
}

export function RoleBadges({ roles }: Readonly<RoleBadgesProps>) {
    if (roles.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
                <span
                    key={role}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide"
                >
                    {role}
                </span>
            ))}
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export interface EmployeeAttendanceCardProps {
    row: TodayAttendanceRow
    onCheckIn: (employee: TodayAttendanceEmployee) => void
    onLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    onLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string) => void
}

export function EmployeeAttendanceCard({
    row,
    onCheckIn,
    onLunchStart,
    onLunchReturn,
}: Readonly<EmployeeAttendanceCardProps>) {
    const phase = getAttendancePhase(row.attendance)
    const att = row.attendance

    return (
        <div
            className={cn(
                'rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors',
                getPhaseCardClass(phase)
            )}
        >
            {/* Header: Name + Phase Badge */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground">
                        {row.employee.last_name}, {row.employee.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.employee.code}</p>
                </div>
                <PhaseBadge phase={phase} />
            </div>

            {/* Role badges */}
            <RoleBadges roles={row.employee.roles} />

            {/* Attendance details */}
            {att ? (
                <div className="space-y-1.5 text-xs">
                    <TimeRow icon="↗" label="Entrada" value={formatTime(att.check_in)} />
                    {(att.entry_late_seconds ?? 0) > 0 && (
                        <LateRow
                            label="Tardanza entrada"
                            value={formatSeconds(att.entry_late_seconds)}
                            deductible={att.is_entry_deductible}
                        />
                    )}
                    {att.lunch_start && (
                        <TimeRow icon="🍽" label="Salida comida" value={formatTime(att.lunch_start)} />
                    )}
                    {att.lunch_end && (
                        <TimeRow icon="↩" label="Regreso comida" value={formatTime(att.lunch_end)} />
                    )}
                    {att.check_out && (
                        <TimeRow icon="↙" label="Salida" value={formatTime(att.check_out)} />
                    )}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground italic">Sin registro aún</p>
            )}

            {/* Check-in action — only for pending employees */}
            {phase === 'pending' && (
                <Button
                    size="sm"
                    className="w-full mt-auto"
                    onClick={() => onCheckIn(row.employee)}
                >
                    <LogIn className="h-3.5 w-3.5 mr-1.5" />
                    Registrar entrada
                </Button>
            )}

            {/* Lunch-start action — only for checked-in employees */}
            {phase === 'checked-in' && att && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => onLunchStart(row.employee, att.id)}
                >
                    <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                    Salir a comer
                </Button>
            )}

            {/* Lunch-return action — only for employees at lunch */}
            {phase === 'at-lunch' && att && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => onLunchReturn(row.employee, att.id)}
                >
                    <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                    Regresar de comida
                </Button>
            )}

            {/* Overtime alert */}
            {att?.requires_overtime_decision && (
                <OvertimeAlert overtimeMinutes={att.overtime_minutes ?? 0} />
            )}
        </div>
    )
}
