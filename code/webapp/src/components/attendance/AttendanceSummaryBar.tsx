import { Clock, CheckCircle2, XCircle, AlertTriangle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttendanceSummary {
    total: number
    pending: number
    checkedIn: number
    done: number
    withOvertime: number
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SummaryStatProps {
    label: string
    value: number
    icon: React.ReactNode
    colorClass: string
}

export function SummaryStat({ label, value, icon, colorClass }: Readonly<SummaryStatProps>) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
            <div className={cn('shrink-0', colorClass)}>{icon}</div>
            <div>
                <p className={cn('text-2xl font-bold leading-none', colorClass)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
        </div>
    )
}

interface OvertimeWarningProps {
    count: number
}

export function OvertimeWarning({ count }: Readonly<OvertimeWarningProps>) {
    if (count === 0) return null

    return (
        <div className="col-span-2 sm:col-span-4">
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
}

export function AttendanceSummaryBar({ summary }: Readonly<AttendanceSummaryBarProps>) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryStat
                label="Total empleados"
                value={summary.total}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-foreground"
            />
            <SummaryStat
                label="Pendientes"
                value={summary.pending}
                icon={<XCircle className="h-4 w-4" />}
                colorClass="text-muted-foreground"
            />
            <SummaryStat
                label="En trabajo"
                value={summary.checkedIn}
                icon={<Clock className="h-4 w-4" />}
                colorClass="text-blue-600 dark:text-blue-400"
            />
            <SummaryStat
                label="Completados"
                value={summary.done}
                icon={<CheckCircle2 className="h-4 w-4" />}
                colorClass="text-green-600 dark:text-green-400"
            />
            <OvertimeWarning count={summary.withOvertime} />
        </div>
    )
}
