import { useState } from 'react'
import { Plus, Loader2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { useApprovedExtraDays } from '@/services/employee-request-hooks'
import { ExtraDayForm } from './extra-day-form'
import type { Employee } from '@/types/employee'

interface ExtraDaySectionProps {
  employee: Employee
}

function formatExtraDayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function ExtraDaySection({ employee }: ExtraDaySectionProps) {
  const [showForm, setShowForm] = useState(false)
  const canApprove = useAuthStore((s) => s.can('employee-requests.approve'))

  const { data: extraDays, isLoading } = useApprovedExtraDays(employee.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Días extra</h3>
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

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!extraDays || extraDays.length === 0) && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <CalendarDays className="h-7 w-7 mb-2" />
          <p className="text-sm">No hay días extra acordados</p>
        </div>
      )}

      {!isLoading && extraDays && extraDays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extraDays.map((req) => {
            const date = req.payload?.date as string | undefined
            const primaPct = req.payload?.prima_pct as number | undefined
            return (
              <div
                key={req.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
              >
                <span>✅</span>
                <span>Día extra acordado</span>
                {date && (
                  <>
                    <span className="text-emerald-500">·</span>
                    <span>{formatExtraDayDate(date)}</span>
                  </>
                )}
                {primaPct !== undefined && (
                  <>
                    <span className="text-emerald-500">·</span>
                    <span>Prima: {primaPct}%</span>
                  </>
                )}
              </div>
            )
          })}
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
