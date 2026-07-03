import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, CalendarCheck } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeekCalendar } from '@/components/attendance/week-calendar'
import { formatWeekTitle } from '@/lib/week'
import type { WeeklySummaryResponse, DailyEvidenceItem } from '@/types/report'

// ── Shared display helpers ───────────────────────────────────────────────────

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatOvertime(minutes: number, authorized: boolean): string {
  if (minutes <= 0) return '—'
  return `${minutes}${authorized ? ' ✓' : ''}`
}

export function ConceptRow({ label, value, highlight }: Readonly<{ label: string; value: number; highlight?: boolean }>) {
  return (
    <div className={`flex justify-between py-1 ${highlight ? 'font-semibold text-primary' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm tabular-nums">{formatMoney(value)}</span>
    </div>
  )
}

export function DailyEvidenceTable({ rows }: Readonly<{ rows: DailyEvidenceItem[] }>) {
  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Fecha</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Entrada</th>
            <th className="py-2 pr-4 font-medium">Salida</th>
            <th className="py-2 pr-4 font-medium text-right">Tard. min</th>
            <th className="py-2 pr-4 font-medium text-right">Desc. min</th>
            <th className="py-2 font-medium text-right">Extra min</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-b last:border-0">
              <td className="py-2 pr-4 tabular-nums">{row.date}</td>
              <td className="py-2 pr-4">{row.day_status ?? '—'}</td>
              <td className="py-2 pr-4 tabular-nums">
                {row.check_in ? row.check_in.substring(11, 16) : '—'}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {row.check_out ? row.check_out.substring(11, 16) : '—'}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{row.late_minutes}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{row.deducted_minutes}</td>
              <td className="py-2 text-right tabular-nums">
                {formatOvertime(row.overtime_minutes, row.overtime_authorized)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WeeklySummaryContent({ summary }: Readonly<{ summary: WeeklySummaryResponse }>) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ConceptRow label="Sueldo base (c/descanso)"    value={summary.base_pay} />
          <ConceptRow label="Deducciones por tardanza"    value={-summary.late_deductions} />
          <ConceptRow label="Ded. permisos no pagados"    value={-summary.unpaid_leave_deductions} />
          <ConceptRow label="Día extra negociado"         value={summary.extra_day_pay} />
          <ConceptRow label="Pago día festivo"            value={summary.holiday_pay} />
          <ConceptRow label="Bono de puntualidad"         value={summary.punctuality_bonus} />
          <ConceptRow label="Tiempo extra"                value={summary.overtime_pay} />
          <div className="border-t mt-2 pt-2">
            <ConceptRow label="Total a pagar" value={summary.total_pay} highlight />
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Horas libres ganadas: {summary.free_hours_earned}h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidencia diaria</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyEvidenceTable rows={summary.daily_evidence} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

export interface WeeklySummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  periodStart: string
  periodEnd: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onJumpToDate: (dateStr: string) => void
  isCurrentWeek: boolean
  isEarliestWeek: boolean
  earliestWeekStart: string | null
  onGoToCurrentWeek: () => void
  summary: WeeklySummaryResponse | null
  isLoading: boolean
  isError: boolean
}

export function WeeklySummaryDialog({
  isOpen,
  onClose,
  employeeName,
  periodStart,
  periodEnd,
  onPrevWeek,
  onNextWeek,
  onJumpToDate,
  isCurrentWeek,
  isEarliestWeek,
  earliestWeekStart,
  onGoToCurrentWeek,
  summary,
  isLoading,
  isError,
}: Readonly<WeeklySummaryDialogProps>) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Resumen semanal — ${employeeName}`}
      description="Desglose de pago para el período seleccionado"
      size="lg"
    >
      <div className="space-y-4">
        {/* Week navigator */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="dialog-prev-week"
            onClick={onPrevWeek}
            disabled={isEarliestWeek}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            title={isEarliestWeek ? 'El empleado no tenía periodo activo antes de esta semana' : 'Semana anterior'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 items-center justify-center gap-2">
            <button
              type="button"
              data-testid="dialog-week-label"
              onClick={() => setIsCalendarOpen((v) => !v)}
              aria-expanded={isCalendarOpen}
              title={isCalendarOpen ? 'Ocultar calendario' : 'Mostrar calendario'}
              className="flex items-center gap-1 rounded px-1 py-0.5 text-sm font-medium hover:bg-muted"
            >
              {formatWeekTitle(periodStart, periodEnd)}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isCalendarOpen ? '' : '-rotate-90'}`} />
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                data-testid="dialog-current-week"
                onClick={onGoToCurrentWeek}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                title="Volver a la semana actual"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Semana actual
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="dialog-next-week"
            onClick={onNextWeek}
            disabled={isCurrentWeek}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            title={isCurrentWeek ? 'No se pueden seleccionar semanas futuras' : 'Semana siguiente'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isCalendarOpen && (
          <WeekCalendar
            periodStart={periodStart}
            earliestWeekStart={earliestWeekStart}
            onSelectDate={onJumpToDate}
          />
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando resumen...</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Error al cargar el resumen. Verifica el rango de fechas e intenta de nuevo.
          </p>
        )}
        {summary && <WeeklySummaryContent summary={summary} />}
      </div>
    </SlidePanel>
  )
}
