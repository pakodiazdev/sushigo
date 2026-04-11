import { CalendarX, Plus, ChevronLeft, ChevronRight, X, History } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { RegisterLeaveDialog } from '@/components/attendance'
import { useLeaveSummarySection } from './use-leave-summary-section'
import { useDialogAnimation } from './use-dialog-animation'
import type { Leave, LeaveType as LeaveTypeInterface, LeaveStatus } from '@/types/leave'

// ── Badge colors by leave type code ─────────────────────────────────────────────

const typeColors: Record<string, string> = {
    MEDICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    PERSONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    PERMISSION_PAID: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    PERMISSION_HOURS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    VACATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

const fallbackColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
    const map: Record<string, { text: string; cls: string }> = {
        APPROVED: { text: 'Aprobada', cls: 'bg-green-100 text-green-800' },
        PENDING: { text: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
        REJECTED: { text: 'Rechazada', cls: 'bg-red-100 text-red-800' },
        CANCELLED: { text: 'Cancelada', cls: 'bg-gray-100 text-gray-700' },
    }
    const s = map[status] ?? { text: status, cls: 'bg-gray-100 text-gray-700' }
    return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
}

function payBadge(pct: number) {
    if (pct >= 100) return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">100%</span>
    if (pct > 0) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{pct}%</span>
    return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Sin goce</span>
}

function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function dateRange(start: string, end: string) {
    return start === end ? formatDate(start) : `${formatDate(start)} — ${formatDate(end)}`
}

// ── FilterBar ───────────────────────────────────────────────────────────────────

type FilterValue = string | number | undefined

type LeaveFilterBarFilters = {
    status?: LeaveStatus | ''
    leave_type_id?: number
}
type LeaveFilterBarKey = keyof LeaveFilterBarFilters

function FilterBar({
    filters,
    leaveTypes,
    onChangeFilter,
}: Readonly<{
    filters: LeaveFilterBarFilters
    leaveTypes: LeaveTypeInterface[]
    onChangeFilter: (key: LeaveFilterBarKey, value: FilterValue) => void
}>) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                aria-label="Filtrar por estado"
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                value={(filters.status as string) ?? ''}
                onChange={(e) => onChangeFilter('status', e.target.value || undefined)}
            >
                <option value="">Todos los estados</option>
                <option value="APPROVED">Aprobada</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="PENDING">Pendiente</option>
                <option value="REJECTED">Rechazada</option>
            </select>

            <select
                aria-label="Filtrar por tipo de ausencia"
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                value={filters.leave_type_id == null ? '' : String(filters.leave_type_id)}
                onChange={(e) => onChangeFilter('leave_type_id', e.target.value ? Number(e.target.value) : undefined)}
            >
                <option value="">Todos los tipos</option>
                {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
            </select>
        </div>
    )
}

// ── Full History Dialog ─────────────────────────────────────────────────────────

function FullHistoryDialog({
    isOpen,
    onClose,
    leaves,
    meta,
    isLoading,
    leaveTypes,
    filters,
    page,
    setPage,
    updateFilter,
}: {
    isOpen: boolean
    onClose: () => void
    leaves: Leave[]
    meta: { current_page: number; last_page: number; total: number } | undefined
    isLoading: boolean
    leaveTypes: LeaveTypeInterface[]
    filters: LeaveFilterBarFilters
    page: number
    setPage: (p: number) => void
    updateFilter: (key: LeaveFilterBarKey, value: FilterValue) => void
}) {
    const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, onClose)

    if (!visible) return null

    const content = (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <button type="button" className={`absolute inset-0 bg-black/50 ${backdropCls} cursor-default appearance-none border-none p-0`} onClick={onClose} aria-label="Cerrar" />

            <dialog open aria-labelledby="leave-history-title" aria-modal="true" className={`relative z-10 w-full max-w-3xl rounded-lg border border-border bg-background shadow-xl ${panelCls} max-h-[80vh] flex flex-col`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h3 id="leave-history-title" className="text-base font-semibold text-foreground">Historial de ausencias</h3>
                    <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <FilterBar
                        filters={filters}
                        leaveTypes={leaveTypes}
                        onChangeFilter={(key, value) => updateFilter(key, value)}
                    />

                    {isLoading && (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                            ))}
                        </div>
                    )}

                    {!isLoading && leaves.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-8 text-center">
                            <CalendarX className="mb-2 h-6 w-6 text-gray-400" />
                            <p className="text-sm text-muted-foreground">No se encontraron ausencias</p>
                        </div>
                    )}

                    {!isLoading && leaves.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                                        <th className="pb-2 pr-3">Fecha(s)</th>
                                        <th className="pb-2 pr-3">Tipo</th>
                                        <th className="pb-2 pr-3">Pago</th>
                                        <th className="pb-2 pr-3">Estado</th>
                                        <th className="pb-2">Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves.map((leave) => (
                                        <tr key={leave.id} className="border-b last:border-0">
                                            <td className="py-2 pr-3 whitespace-nowrap">{dateRange(leave.start_date, leave.end_date)}</td>
                                            <td className="py-2 pr-3 font-medium">{leave.leave_type.name}</td>
                                            <td className="py-2 pr-3">{payBadge(leave.resolved_pay_percentage)}</td>
                                            <td className="py-2 pr-3">{statusBadge(leave.status)}</td>
                                            <td className="max-w-[180px] truncate py-2 text-muted-foreground">{leave.notes ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-between border-t pt-3">
                            <p className="text-xs text-muted-foreground">{meta.total} ausencia{meta.total === 1 ? '' : 's'}</p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">{meta.current_page} / {meta.last_page}</span>
                                <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </dialog>
        </div>
    )

    return createPortal(content, document.body)
}

// ── Main Section ────────────────────────────────────────────────────────────────

interface LeaveSummarySectionProps {
    readonly employeeId: string
    readonly employee: { id: string; first_name: string; last_name: string; code: string } | undefined
}

export function LeaveSummarySection({ employeeId, employee }: LeaveSummarySectionProps) {
    const ctx = useLeaveSummarySection(employeeId, employee)
    const monthLabel = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

    return (
        <>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarX className="h-4 w-4" />
                        Ausencias
                    </h3>
                    <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={ctx.openRegisterLeave} className="h-7 gap-1 px-2 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Registrar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={ctx.openFullHistory} className="h-7 gap-1 px-2 text-xs">
                            <History className="h-3.5 w-3.5" />
                            Ver historial
                        </Button>
                    </div>
                </div>

                {/* Monthly summary badges */}
                {ctx.isLoadingSummary && (
                    <div className="flex gap-2">
                        {[1, 2].map((n) => (
                            <div key={n} className="h-6 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        ))}
                    </div>
                )}

                {!ctx.isLoadingSummary && ctx.monthlySummary.length > 0 && (
                    <div>
                        <p className="mb-1.5 text-xs text-muted-foreground capitalize">{monthLabel}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ctx.monthlySummary.map((s) => (
                                <span
                                    key={s.code}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[s.code] ?? fallbackColor}`}
                                >
                                    {s.count} {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {!ctx.isLoadingSummary && ctx.monthlySummary.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin ausencias este mes</p>
                )}

                {/* Last 3 leaves */}
                {ctx.recentLeaves.length > 0 && (
                    <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">Últimas ausencias</p>
                        <div className="space-y-1.5">
                            {ctx.recentLeaves.map((leave) => (
                                <div key={leave.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground whitespace-nowrap">{dateRange(leave.start_date, leave.end_date)}</span>
                                        <span className="font-medium">{leave.leave_type.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {payBadge(leave.resolved_pay_percentage)}
                                        {statusBadge(leave.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Full history dialog */}
            <FullHistoryDialog
                isOpen={ctx.showFullHistory}
                onClose={ctx.closeFullHistory}
                leaves={ctx.fullLeaves}
                meta={ctx.fullMeta}
                isLoading={ctx.isLoadingFull}
                leaveTypes={ctx.leaveTypes}
                filters={ctx.filters}
                page={ctx.page}
                setPage={ctx.setPage}
                updateFilter={ctx.updateFilter}
            />

            {/* Register leave dialog */}
            <RegisterLeaveDialog
                isOpen={!!ctx.pendingLeaveEmployee}
                employee={ctx.pendingLeaveEmployee}
                onClose={ctx.closeRegisterLeave}
            />
        </>
    )
}
