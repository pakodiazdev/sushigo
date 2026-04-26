import { useState } from 'react'
import { Plus, Loader2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { ExtraDayForm } from './extra-day-form'
import { useNegotiatedExtraDays } from './use-negotiated-extra-days'
import type { Employee } from '@/types/employee'

interface ExtraDaySectionProps {
  readonly employee: Employee
}

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

export function ExtraDaySection({ employee }: ExtraDaySectionProps) {
  const [showForm, setShowForm] = useState(false)
  const canApprove = useAuthStore((s) => s.can('employee-requests.approve'))

  const { extraDays, isLoading, filters, setFilters } = useNegotiatedExtraDays(employee.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Días extra negociados</h3>
        {canApprove && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Día extra
          </Button>
        )}
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <label htmlFor="extra-day-date-from" className="text-xs text-muted-foreground whitespace-nowrap">
            Desde
          </label>
          <input
            id="extra-day-date-from"
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_from: e.target.value || undefined }))
            }
            className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="extra-day-date-to" className="text-xs text-muted-foreground whitespace-nowrap">
            Hasta
          </label>
          <input
            id="extra-day-date-to"
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_to: e.target.value || undefined }))
            }
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
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && extraDays.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <CalendarDays className="h-7 w-7 mb-2" />
          <p className="text-sm">No hay días extra negociados</p>
        </div>
      )}

      {!isLoading && extraDays.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Salario acordado</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prima %</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prima $</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Aprobado por</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Notas</th>
              </tr>
            </thead>
            <tbody>
              {extraDays.map((day) => (
                <tr key={day.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-foreground">{formatDate(day.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(day.agreed_daily_wage)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{day.prima_percent}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(day.prima_amount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{day.approved_by}</td>
                  <td className="px-3 py-2 text-muted-foreground">{day.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExtraDayForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        employee={employee}
      />
    </div>
  )
}
