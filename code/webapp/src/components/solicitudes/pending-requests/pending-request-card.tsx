import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency } from '@/lib/format'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, ExtraDayPayload, LeavePayload } from '@/types/employee-request'

interface PendingRequestCardProps {
  readonly request: EmployeeRequest
  readonly onReview: (request: EmployeeRequest) => void
  readonly onCancel: (id: string) => void
  readonly isCancelling: boolean
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} — ${formatDate(endDate)}`
}

function ExtraDayCardBody({ request }: { readonly request: EmployeeRequest }) {
  const payload = request.payload as ExtraDayPayload | null
  const date = payload?.date ?? ''
  const primaPct = payload?.prima_pct ?? 0
  const primaAmount = payload?.prima ?? 0

  return (
    <>
      <p className="text-sm font-medium text-foreground">➕ Día extra</p>
      <p className="text-sm text-foreground font-medium">{request.employee_name}</p>
      {date && (
        <p className="text-sm text-muted-foreground capitalize">{formatDate(date)}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Prima propuesta: {primaPct}%{primaAmount > 0 && ` · ${formatCurrency(primaAmount)}`}
      </p>
    </>
  )
}

function LeaveCardBody({ request }: { readonly request: EmployeeRequest }) {
  const payload = request.payload as LeavePayload | null
  const { data: leaveTypes = [] } = useLeaveTypes()
  const leaveType = leaveTypes.find((t) => t.id === payload?.leave_type_id)

  return (
    <>
      <p className="text-sm font-medium text-foreground">📅 {leaveType?.name ?? 'Permiso'}</p>
      <p className="text-sm text-foreground font-medium">{request.employee_name}</p>
      {payload && (
        <p className="text-sm text-muted-foreground capitalize">
          {formatDateRange(payload.start_date, payload.end_date)}
        </p>
      )}
    </>
  )
}

export function PendingRequestCard({ request, onReview, onCancel, isCancelling }: PendingRequestCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            {request.type === 'LEAVE'
              ? <LeaveCardBody request={request} />
              : <ExtraDayCardBody request={request} />}
            {request.notes && (
              <p className="text-xs text-muted-foreground italic truncate">"{request.notes}"</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Cancelar solicitud"
              disabled={isCancelling}
              onClick={() => setConfirmOpen(true)}
              className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              {isCancelling
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <XCircle className="h-4 w-4" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
              onClick={() => onReview(request)}
            >
              Revisar →
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        container="viewport"
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onCancel(request.id)
          setConfirmOpen(false)
        }}
        title="¿Cancelar esta solicitud?"
        description={`Se cancelará la solicitud de ${request.type === 'LEAVE' ? 'permiso' : 'día extra'} de ${request.employee_name}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        variant="danger"
        isLoading={isCancelling}
      />
    </>
  )
}
