import { CalendarX, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RegisterLeaveDialog } from '@/components/attendance'
import { useEmployeeLeavesTab } from './-use-employee-leaves-tab'
import type { Leave, LeaveType as LeaveTypeInterface } from '@/types/leave'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function payBadge(pct: number) {
  if (pct >= 100) return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">100%</span>
  if (pct > 0) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{pct}%</span>
  return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Sin goce</span>
}

function restDayBadge(factor: string) {
  const labels: Record<string, { text: string; cls: string }> = {
    FULL: { text: 'Completo', cls: 'bg-green-100 text-green-800' },
    PROPORTIONAL: { text: 'Proporcional', cls: 'bg-yellow-100 text-yellow-800' },
    NONE: { text: 'Sin impacto', cls: 'bg-gray-100 text-gray-700' },
  }
  const l = labels[factor] ?? { text: factor, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${l.cls}`}>{l.text}</span>
}

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

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateRange(start: string, end: string) {
  return start === end ? formatDate(start) : `${formatDate(start)} — ${formatDate(end)}`
}

function timeDetails(leave: Leave) {
  if (leave.leave_type.calculation_mode !== 'PROPORTIONAL_HOURS') return null
  const parts: string[] = []
  if (leave.scheduled_start_time && leave.scheduled_end_time) {
    parts.push(`🕐 ${leave.scheduled_start_time.slice(0, 5)}–${leave.scheduled_end_time.slice(0, 5)}`)
  }
  if (leave.actual_start_time) {
    parts.push(`Real: ${leave.actual_start_time.slice(0, 5)}${leave.actual_end_time ? '–' + leave.actual_end_time.slice(0, 5) : '–…'}`)
  }
  if (leave.computed_duration_minutes != null) {
    const h = Math.floor(leave.computed_duration_minutes / 60)
    const m = leave.computed_duration_minutes % 60
    parts.push(`${h}h${m > 0 ? ` ${m}m` : ''}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

// ── Filter bar ──────────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  leaveTypes,
  onChangeFilter,
}: {
  filters: Record<string, string | number | undefined>
  leaveTypes: LeaveTypeInterface[]
  onChangeFilter: (key: string, value: string | number | undefined) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
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
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        value={filters.leave_type_id != null ? String(filters.leave_type_id) : ''}
        onChange={(e) => onChangeFilter('leave_type_id', e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">Todos los tipos</option>
        {leaveTypes.map((lt) => (
          <option key={lt.id} value={lt.id}>{lt.name}</option>
        ))}
      </select>

      <input
        type="date"
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        value={(filters.date_from as string) ?? ''}
        onChange={(e) => onChangeFilter('date_from', e.target.value || undefined)}
        placeholder="Desde"
      />

      <input
        type="date"
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        value={(filters.date_to as string) ?? ''}
        onChange={(e) => onChangeFilter('date_to', e.target.value || undefined)}
        placeholder="Hasta"
      />
    </div>
  )
}

// ── Pagination ──────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  lastPage,
  total,
  onPageChange,
}: {
  currentPage: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (lastPage <= 1) return null
  return (
    <div className="flex items-center justify-between border-t pt-3">
      <p className="text-xs text-muted-foreground">{total} ausencia{total !== 1 ? 's' : ''}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">{currentPage} / {lastPage}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Leaves Table ────────────────────────────────────────────────────────────────

function LeavesTable({ leaves }: { leaves: Leave[] }) {
  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <CalendarX className="mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-muted-foreground">No se encontraron ausencias</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-muted-foreground">
            <th className="pb-2 pr-4">Fecha(s)</th>
            <th className="pb-2 pr-4">Tipo</th>
            <th className="pb-2 pr-4">Pago</th>
            <th className="pb-2 pr-4">Descanso</th>
            <th className="pb-2 pr-4">Estado</th>
            <th className="pb-2 pr-4">Registrado por</th>
            <th className="pb-2">Notas</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave) => {
            const time = timeDetails(leave)
            return (
              <tr key={leave.id} className="border-b last:border-0">
                <td className="py-2.5 pr-4">
                  <div>{dateRange(leave.start_date, leave.end_date)}</div>
                  {time && <div className="mt-0.5 text-xs text-muted-foreground">{time}</div>}
                </td>
                <td className="py-2.5 pr-4">
                  <span className="font-medium">{leave.leave_type.name}</span>
                  {leave.leave_type.calculation_mode === 'PROPORTIONAL_HOURS' && (
                    <span className="ml-1 text-xs text-muted-foreground">(horas)</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">{payBadge(leave.resolved_pay_percentage)}</td>
                <td className="py-2.5 pr-4">{restDayBadge(leave.resolved_rest_day_factor)}</td>
                <td className="py-2.5 pr-4">{statusBadge(leave.status)}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{leave.requested_by}</td>
                <td className="max-w-[200px] truncate py-2.5 text-muted-foreground">{leave.notes ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Panel ──────────────────────────────────────────────────────────────────

interface LeaveHistoryPanelProps {
  employeeId: string
  employee: { id: string; first_name: string; last_name: string; code: string } | undefined
}

export function LeaveHistoryPanel({ employeeId, employee }: LeaveHistoryPanelProps) {
  const {
    leaves,
    meta,
    isLoading,
    leaveTypes,
    filters,
    setPage,
    updateFilter,
    pendingLeaveEmployee,
    openRegisterLeave,
    closeRegisterLeave,
  } = useEmployeeLeavesTab(employeeId, employee)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filters={filters as Record<string, string | number | undefined>}
          leaveTypes={leaveTypes}
          onChangeFilter={(key, value) => updateFilter(key as keyof typeof filters, value)}
        />
        <Button size="sm" variant="outline" onClick={openRegisterLeave}>
          <Plus className="mr-1 h-4 w-4" />
          Registrar ausencia
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <LeavesTable leaves={leaves} />
          {meta && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <RegisterLeaveDialog
        isOpen={!!pendingLeaveEmployee}
        employee={pendingLeaveEmployee}
        onClose={closeRegisterLeave}
      />
    </div>
  )
}
