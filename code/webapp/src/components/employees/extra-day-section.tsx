import { createPortal } from 'react-dom'
import { Plus, History, X, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { useDialogAnimation } from './use-dialog-animation'
import { useNegotiatedExtraDays } from './use-negotiated-extra-days'
import { ExtraDayForm } from './extra-day-form'
import type { Employee } from '@/types/employee'
import type { NegotiatedExtraDay } from '@/types/negotiated-extra-day'
import type { ListExtraDaysFilters } from '@/types/negotiated-extra-day'
import { useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

// ── History dialog ─────────────────────────────────────────────────────────────

function ExtraDayHistoryDialog({
  isOpen,
  onClose,
  extraDays,
  meta,
  isLoading,
  filters,
  setFilters,
}: {
  isOpen: boolean
  onClose: () => void
  extraDays: NegotiatedExtraDay[]
  meta: { current_page: number; last_page: number; total: number } | undefined
  isLoading: boolean
  filters: ListExtraDaysFilters
  setFilters: (f: ListExtraDaysFilters) => void
}) {
  const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, onClose)

  if (!visible) return null

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropCls} cursor-default appearance-none border-none p-0`}
        onClick={onClose}
        aria-label="Cerrar"
      />

      <dialog
        open
        aria-labelledby="extra-day-history-title"
        aria-modal="true"
        className={`relative z-10 w-full max-w-3xl rounded-lg border border-border bg-background shadow-xl ${panelCls} max-h-[80vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 id="extra-day-history-title" className="text-base font-semibold text-foreground">
            Historial de días extra
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="history-date-from" className="text-xs text-muted-foreground whitespace-nowrap">
                Desde
              </label>
              <input
                id="history-date-from"
                type="date"
                value={filters.date_from ?? ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="history-date-to" className="text-xs text-muted-foreground whitespace-nowrap">
                Hasta
              </label>
              <input
                id="history-date-to"
                type="date"
                value={filters.date_to ?? ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {(filters.date_from ?? filters.date_to) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setFilters({})}
              >
                Limpiar
              </Button>
            )}
            {meta && (
              <span className="ml-auto text-xs text-muted-foreground">
                {meta.total} registro{meta.total === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-9 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && extraDays.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
              <CalendarDays className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No se encontraron días extra</p>
            </div>
          )}

          {/* Table */}
          {!isLoading && extraDays.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4 text-right">Salario</th>
                    <th className="pb-2 pr-4 text-right">Prima %</th>
                    <th className="pb-2 pr-4 text-right">Prima $</th>
                    <th className="pb-2 pr-4">Aprobado por</th>
                    <th className="pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {extraDays.map((day) => (
                    <tr key={day.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDate(day.date)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(day.agreed_daily_wage)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{day.prima_percent}%</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(day.prima_amount)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{day.approved_by}</td>
                      <td className="py-2 max-w-[200px] truncate text-muted-foreground">{day.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}

// ── Main section ───────────────────────────────────────────────────────────────

interface ExtraDaySectionProps {
  readonly employee: Employee
}

export function ExtraDaySection({ employee }: ExtraDaySectionProps) {
  const [showForm, setShowForm] = useState(false)
  const canApprove = useAuthStore((s) => s.can('employee-requests.approve'))

  const ctx = useNegotiatedExtraDays(employee.id)

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" />
            Días extra
          </h3>
          <div className="flex items-center gap-1">
            {canApprove && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(true)}
                className="h-7 gap-1 px-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Día extra
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={ctx.openHistory}
              className="h-7 gap-1 px-2 text-xs"
            >
              <History className="h-3.5 w-3.5" />
              Ver historial
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        {ctx.isLoadingSummary && (
          <div className="flex gap-2">
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        )}

        {!ctx.isLoadingSummary && (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {ctx.thisMonthCount} este mes
            </span>
            {ctx.upcomingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                {ctx.upcomingCount} programado{ctx.upcomingCount === 1 ? '' : 's'}
              </span>
            )}
            {ctx.thisMonthCount === 0 && ctx.upcomingCount === 0 && (
              <span className="text-xs italic text-muted-foreground">Sin días extra registrados</span>
            )}
          </div>
        )}

        {/* Upcoming extra days */}
        {!ctx.isLoadingSummary && ctx.upcomingDays.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Próximos días extra</p>
            <div className="space-y-1.5">
              {ctx.upcomingDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground whitespace-nowrap">{formatDate(day.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{formatCurrency(day.agreed_daily_wage)}</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Prima {day.prima_percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History center dialog */}
      <ExtraDayHistoryDialog
        isOpen={ctx.showHistory}
        onClose={ctx.closeHistory}
        extraDays={ctx.historyExtraDays}
        meta={ctx.historyMeta}
        isLoading={ctx.historyIsLoading}
        filters={ctx.historyFilters}
        setFilters={ctx.setHistoryFilters}
      />

      {/* Register form slide panel */}
      <ExtraDayForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        employee={employee}
      />
    </>
  )
}
