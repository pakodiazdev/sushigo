import { Clock, CheckCircle2, XCircle, AlertTriangle, Users, UserX, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttendanceSummary {
    total: number
    pending: number
    checkedIn: number
    atLunch: number
    done: number
    absent: number
    withOvertime: number
}

/** Which stat tab is filtering the main grid — `null` means no tab is active (default view). */
export type AttendanceFilter = 'total' | 'pending' | 'checkedIn' | 'atLunch' | 'done' | 'absent'

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SummaryStatProps {
    label: string
    value: number
    icon: React.ReactNode
    colorClass: string
    active?: boolean
    onClick?: () => void
    testId?: string
}

export function SummaryStat({ label, value, icon, colorClass, active = false, onClick, testId }: Readonly<SummaryStatProps>) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border bg-card text-left transition-colors',
                'hover:bg-muted/50',
                active && 'ring-2 ring-primary bg-muted/50'
            )}
        >
            <div className={cn('shrink-0', colorClass)}>{icon}</div>
            <div>
                <p className={cn('text-2xl font-bold leading-none', colorClass)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
        </button>
    )
}

interface OvertimeWarningProps {
    count: number
}

export function OvertimeWarning({ count }: Readonly<OvertimeWarningProps>) {
    if (count === 0) return null

    return (
        <div className="col-span-3 sm:col-span-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <span className="font-semibold">{count}</span>{' '}
                    {count === 1 ? 'empleado tiene' : 'empleados tienen'} overtime pendiente de
                    autorización.
                </p>
            </div>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export interface AttendanceSummaryBarProps {
    summary: AttendanceSummary
    activeFilter?: AttendanceFilter | null
    onFilterChange?: (filter: AttendanceFilter) => void
}

export function AttendanceSummaryBar({ summary, activeFilter = null, onFilterChange }: Readonly<AttendanceSummaryBarProps>) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <SummaryStat
                label="Total empleados"
                value={summary.total}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-foreground"
                active={activeFilter === 'total'}
                onClick={() => onFilterChange?.('total')}
                testId="stat-total"
            />
            <SummaryStat
                label="Pendientes"
                value={summary.pending}
                icon={<XCircle className="h-4 w-4" />}
                colorClass="text-muted-foreground"
                active={activeFilter === 'pending'}
                onClick={() => onFilterChange?.('pending')}
                testId="stat-pending"
            />
            <SummaryStat
                label="En trabajo"
                value={summary.checkedIn}
                icon={<Clock className="h-4 w-4" />}
                colorClass="text-blue-600 dark:text-blue-400"
                active={activeFilter === 'checkedIn'}
                onClick={() => onFilterChange?.('checkedIn')}
                testId="stat-checked-in"
            />
            <SummaryStat
                label="En comida"
                value={summary.atLunch}
                icon={<Coffee className="h-4 w-4" />}
                colorClass="text-orange-600 dark:text-orange-400"
                active={activeFilter === 'atLunch'}
                onClick={() => onFilterChange?.('atLunch')}
                testId="stat-at-lunch"
            />
            <SummaryStat
                label="Completados"
                value={summary.done}
                icon={<CheckCircle2 className="h-4 w-4" />}
                colorClass="text-green-600 dark:text-green-400"
                active={activeFilter === 'done'}
                onClick={() => onFilterChange?.('done')}
                testId="stat-done"
            />
            <SummaryStat
                label="Ausentes"
                value={summary.absent}
                icon={<UserX className="h-4 w-4" />}
                colorClass="text-red-600 dark:text-red-400"
                active={activeFilter === 'absent'}
                onClick={() => onFilterChange?.('absent')}
                testId="stat-absent"
            />
            <OvertimeWarning count={summary.withOvertime} />
        </div>
    )
}
