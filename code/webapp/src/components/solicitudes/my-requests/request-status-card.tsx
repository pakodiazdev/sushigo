import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { EmployeeRequest, ExtraDayPayload } from '@/types/employee-request'

interface RequestStatusCardProps {
  readonly request: EmployeeRequest
  readonly onCancel: (id: string) => void
  readonly isCancelling: boolean
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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

export function RequestStatusCard({ request, onCancel, isCancelling }: RequestStatusCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const payload = request.payload as ExtraDayPayload | null
  const date = payload?.date ?? ''
  const primaPct = payload?.prima_pct ?? 0
  const primaAmount = payload?.prima ?? 0

  const config = STATUS_CONFIG[request.status]

  const cancellable =
    request.status === 'PENDING' ||
    (request.status === 'APPROVED' && date >= todayIso())

  return (
    <>
      <div className={cn('rounded-lg border p-4 space-y-2', config.className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {config.icon} Día extra solicitado
            </p>
            {date && (
              <p className="text-sm text-foreground capitalize">{formatDate(date)}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Prima propuesta: {primaPct}%{primaAmount > 0 && ` · ${formatCurrency(primaAmount)}`}
            </p>
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
        description={
          request.status === 'APPROVED'
            ? 'El día extra aprobado será eliminado. Esta acción no se puede deshacer.'
            : 'Tu solicitud de día extra será cancelada. Esta acción no se puede deshacer.'
        }
        confirmLabel="Sí, cancelar"
        variant="danger"
        isLoading={isCancelling}
      />
    </>
  )
}
