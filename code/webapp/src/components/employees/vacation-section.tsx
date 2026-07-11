import { Loader2, Palmtree, Plus, Check, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { useVacationSection } from './use-vacation-section'
import { RegisterVacationRequestDialog } from './RegisterVacationRequestDialog'
import { RequestStatusBadge } from './request-status-badge'
import type { RegisterVacationRequestEmployee } from './use-register-vacation-request-dialog'
import type { VacationEntitlement, VacationRequest } from '@/types/attendance-payroll'

interface VacationSectionProps {
  readonly employeeId: string
  readonly employee?: RegisterVacationRequestEmployee
}

const RULE_LABELS: Record<string, string> = {
  VacationsLFTMX: 'LFT México 2022',
}

function ruleLabel(key: string): string {
  return RULE_LABELS[key] ?? key
}

function formatDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function dateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} — ${formatDate(end)}`
}

function remainingDaysClass(remaining: number): string {
  if (remaining <= 0) return 'text-destructive font-semibold'
  if (remaining <= 3) return 'text-amber-600 font-semibold'
  return ''
}

function EntitlementRow({ row }: { readonly row: VacationEntitlement }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-sm tabular-nums font-medium">{row.year}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{row.entitled_days}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{row.used_days}</td>
      <td className="py-2 text-sm tabular-nums">
        <span className={remainingDaysClass(row.remaining_days)}>
          {row.remaining_days}
        </span>
      </td>
    </tr>
  )
}

function RequestRow({
  request,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  readonly request: VacationRequest
  readonly onApprove: (id: string) => void
  readonly onReject: (id: string) => void
  readonly isApproving: boolean
  readonly isRejecting: boolean
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 text-sm whitespace-nowrap">{dateRange(request.start_date, request.end_date)}</td>
      <td className="py-2 pr-3 text-sm tabular-nums">{request.days_count}</td>
      <td className="py-2 pr-3"><RequestStatusBadge status={request.status} /></td>
      <td className="py-2">
        {request.status === 'PENDING' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onApprove(request.id)}
              disabled={isApproving || isRejecting}
              className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/30"
              aria-label="Aprobar vacaciones"
              title="Aprobar"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onReject(request.id)}
              disabled={isApproving || isRejecting}
              className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/30"
              aria-label="Rechazar vacaciones"
              title="Rechazar"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export function VacationSection({ employeeId, employee }: VacationSectionProps) {
  const ctx = useVacationSection(employeeId, employee)
  const { can } = useAuthStore()
  const canSchedule = can('vacation-requests.schedule')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Vacaciones</h3>
          <Badge variant="default" className="text-xs">
            LFT México 2022
          </Badge>
        </div>
        {canSchedule && (
          <Button size="sm" variant="ghost" onClick={ctx.openRequestDialog} className="h-7 gap-1 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Programar vacaciones
          </Button>
        )}
      </div>

      {ctx.summary && (
        <p className="text-xs text-muted-foreground">
          {ctx.summary.seniority_years}{' '}
          {ctx.summary.seniority_years === 1 ? 'año de antigüedad' : 'años de antigüedad'}
          {ctx.summary.next_anniversary_date && (
            <> · Próximo aniversario: {formatDate(ctx.summary.next_anniversary_date)}</>
          )}
        </p>
      )}

      {/* Entitlement table */}
      {ctx.isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!ctx.isLoading && ctx.entitlements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Palmtree className="h-8 w-8 mb-2" />
          <p className="text-sm">Sin derechos vacacionales registrados</p>
        </div>
      )}
      {!ctx.isLoading && ctx.entitlements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 text-xs font-medium">Año</th>
                <th className="py-2 pr-4 text-xs font-medium">Días ganados</th>
                <th className="py-2 pr-4 text-xs font-medium">Usados</th>
                <th className="py-2 text-xs font-medium">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {ctx.entitlements.map((row) => (
                <EntitlementRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
          {ctx.entitlements[0] !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">
              Regla aplicada: {ruleLabel(ctx.entitlements[0].rule_key)}
            </p>
          )}
        </div>
      )}

      {/* Vacation requests */}
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Solicitudes de vacaciones</p>
        {ctx.isLoadingRequests && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!ctx.isLoadingRequests && ctx.requests.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin solicitudes de vacaciones</p>
        )}
        {!ctx.isLoadingRequests && ctx.requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Fecha(s)</th>
                  <th className="pb-2 pr-3">Días</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ctx.requests.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onApprove={ctx.handleApprove}
                    onReject={ctx.handleReject}
                    isApproving={ctx.isApproving}
                    isRejecting={ctx.isRejecting}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request vacation dialog */}
      <RegisterVacationRequestDialog
        isOpen={ctx.showRequestDialog}
        employee={ctx.pendingRequestEmployee}
        onClose={ctx.closeRequestDialog}
      />
    </div>
  )
}
