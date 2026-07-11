import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDatesLabel, formatDayLabel } from '@/lib/format'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, ExtraDayPayload, LeavePayload, VacationPayload } from '@/types/employee-request'

interface RequestStatusCardProps {
  readonly request: EmployeeRequest
  readonly onCancel: (id: string) => void
  readonly isCancelling: boolean
}

const CANCEL_DESCRIPTIONS: Record<EmployeeRequest['type'], { approved: string; pending: string }> = {
  EXTRA_DAY: {
    approved: 'El día extra aprobado será eliminado. Esta acción no se puede deshacer.',
    pending: 'Tu solicitud de día extra será cancelada. Esta acción no se puede deshacer.',
  },
  LEAVE: {
    approved: 'El permiso aprobado será eliminado. Esta acción no se puede deshacer.',
    pending: 'Tu solicitud de permiso será cancelada. Esta acción no se puede deshacer.',
  },
  VACATION: {
    approved: 'Las vacaciones aprobadas serán eliminadas y el saldo se restituirá. Esta acción no se puede deshacer.',
    pending: 'Tu solicitud de vacaciones será cancelada. Esta acción no se puede deshacer.',
  },
  SCHEDULE_CHANGE: {
    approved: 'El cambio de horario aprobado será eliminado. Esta acción no se puede deshacer.',
    pending: 'Tu solicitud de cambio de horario será cancelada. Esta acción no se puede deshacer.',
  },
}

function cancelDescription(type: EmployeeRequest['type'], status: EmployeeRequest['status']): string {
  const { approved, pending } = CANCEL_DESCRIPTIONS[type]
  return status === 'APPROVED' ? approved : pending
}

function todayIso(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const STATUS_CONFIG = {
  PENDING: {
    icon: '⏳',
    label: 'Pendiente de aprobación',
    className: 'border-yellow-200 bg-yellow-50',
    labelClass: 'text-yellow-700',
  },
  APPROVED: {
    icon: '✅',
    label: 'Aprobado',
    className: 'border-emerald-200 bg-emerald-50',
    labelClass: 'text-emerald-700',
  },
  REJECTED: {
    icon: '❌',
    label: 'Rechazado',
    className: 'border-red-200 bg-red-50',
    labelClass: 'text-red-700',
  },
  CANCELLED: {
    icon: '🚫',
    label: 'Cancelado',
    className: 'border-muted bg-muted/30',
    labelClass: 'text-muted-foreground',
  },
} as const

function ExtraDayStatusBody({ request, config }: { readonly request: EmployeeRequest; readonly config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] }) {
  const payload = request.payload as ExtraDayPayload | null
  const date = payload?.date ?? ''
  const primaPct = payload?.prima_pct ?? 0
  const primaAmount = payload?.prima ?? 0

  return (
    <>
      <p className="text-sm font-medium text-foreground">
        {config.icon} Día extra solicitado
      </p>
      {date && (
        <p className="text-sm text-foreground capitalize">{formatDayLabel(date, 'long')}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Prima propuesta: {primaPct}%{primaAmount > 0 && ` · ${formatCurrency(primaAmount)}`}
      </p>
    </>
  )
}

function LeaveStatusBody({ request, config }: { readonly request: EmployeeRequest; readonly config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] }) {
  const payload = request.payload as LeavePayload | null
  const { data: leaveTypes = [] } = useLeaveTypes()
  const leaveType = leaveTypes.find((t) => t.id === payload?.leave_type_id)

  return (
    <>
      <p className="text-sm font-medium text-foreground">
        {config.icon} {leaveType?.name ?? 'Permiso'} solicitado
      </p>
      {payload && (
        <p className="text-sm text-foreground capitalize">
          {formatDatesLabel(payload.dates, 'long')}
        </p>
      )}
    </>
  )
}

function VacationStatusBody({ request, config }: { readonly request: EmployeeRequest; readonly config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] }) {
  const payload = request.payload as VacationPayload | null

  return (
    <>
      <p className="text-sm font-medium text-foreground">
        {config.icon} Vacaciones solicitadas
      </p>
      {payload && (
        <p className="text-sm text-foreground capitalize">
          {formatDatesLabel(payload.dates, 'long')}
        </p>
      )}
    </>
  )
}

function StatusBody({ request, config }: { readonly request: EmployeeRequest; readonly config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] }) {
  switch (request.type) {
    case 'LEAVE':
      return <LeaveStatusBody request={request} config={config} />
    case 'VACATION':
      return <VacationStatusBody request={request} config={config} />
    default:
      return <ExtraDayStatusBody request={request} config={config} />
  }
}

export function RequestStatusCard({ request, onCancel, isCancelling }: RequestStatusCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const payload = request.payload as ExtraDayPayload & LeavePayload | null
  const hasDatesArray = request.type === 'LEAVE' || request.type === 'VACATION'
  const sortedDates = [...(payload?.dates ?? [])].sort((a, b) => a.localeCompare(b))
  const endDate = hasDatesArray
    ? (sortedDates[sortedDates.length - 1] ?? '')
    : (payload?.date ?? '')

  const config = STATUS_CONFIG[request.status]

  const cancellable =
    request.status === 'PENDING' ||
    (request.status === 'APPROVED' && endDate >= todayIso())

  return (
    <>
      <div className={cn('rounded-lg border p-4 space-y-2', config.className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <StatusBody request={request} config={config} />
            <p className={cn('text-xs font-medium', config.labelClass)}>{config.label}</p>

            {request.status === 'PENDING' && request.notes && (
              <p className="text-xs text-muted-foreground italic">Tu nota: "{request.notes}"</p>
            )}

            {request.status === 'REJECTED' && request.rejection_reason && (
              <p className="text-xs text-muted-foreground italic">"{request.rejection_reason}"</p>
            )}
          </div>

          {cancellable && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0"
              onClick={() => setConfirmOpen(true)}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Cancelar
            </Button>
          )}
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
        description={cancelDescription(request.type, request.status)}
        confirmLabel="Sí, cancelar"
        variant="danger"
        isLoading={isCancelling}
      />
    </>
  )
}
