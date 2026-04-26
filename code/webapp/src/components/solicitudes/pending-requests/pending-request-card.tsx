import { XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import type { EmployeeRequest, ExtraDayPayload } from '@/types/employee-request'

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

export function PendingRequestCard({ request, onReview, onCancel, isCancelling }: PendingRequestCardProps) {
  const payload = request.payload as ExtraDayPayload | null
  const date = payload?.date ?? ''
  const primaPct = payload?.prima_pct ?? 0
  const primaAmount = payload?.prima ?? 0

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-foreground">➕ Día extra</p>
          <p className="text-sm text-foreground font-medium">{request.employee_name}</p>
          {date && (
            <p className="text-sm text-muted-foreground capitalize">{formatDate(date)}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Prima propuesta: {primaPct}%{primaAmount > 0 && ` · ${formatCurrency(primaAmount)}`}
          </p>
          {request.notes && (
            <p className="text-xs text-muted-foreground italic truncate">"{request.notes}"</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Cancelar solicitud"
            disabled={isCancelling}
            onClick={() => onCancel(request.id)}
            className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
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
  )
}
