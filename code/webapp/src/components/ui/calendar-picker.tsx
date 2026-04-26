import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarPickerProps {
  /** Selected date in YYYY-MM-DD format, or empty string */
  value: string
  onChange: (date: string) => void
  /**
   * ISO days of week (1=Mon … 7=Sun) that are DISABLED.
   * Pass the employee's working days so only rest days are selectable.
   * When undefined/empty every day is enabled.
   */
  disabledDaysOfWeek?: number[]
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Monday-first header (ISO 1→index 0)
const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayIso(): string {
  return toIso(new Date())
}

/**
 * Convert a JS Date's getDay() (0=Sun…6=Sat) to Monday-first column index (0=Mon…6=Sun).
 */
function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

/**
 * Convert an ISO day of week (1=Mon…7=Sun) to Monday-first column index (0=Mon…6=Sun).
 */
function isoToMondayIndex(isoDow: number): number {
  return isoDow - 1
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarPicker({
  value,
  onChange,
  disabledDaysOfWeek = [],
  className,
}: CalendarPickerProps) {
  const today = todayIso()

  // Derive initial month from value or today
  const initialDate = value ? new Date(`${value}T12:00:00`) : new Date()
  const [year, setYear] = useState(initialDate.getFullYear())
  const [month, setMonth] = useState(initialDate.getMonth()) // 0-indexed

  const disabledSet = new Set(disabledDaysOfWeek.map(isoToMondayIndex))

  // First day of the displayed month
  const firstDay = new Date(year, month, 1)
  const startOffset = mondayFirstIndex(firstDay.getDay())
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(day: number) {
    const date = new Date(year, month, day)
    const col = mondayFirstIndex(date.getDay())
    if (disabledSet.has(col)) return
    onChange(toIso(date))
  }

  // Build a flat array of cells: null = empty leading cell, number = day of month
  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={cn('select-none rounded-lg border border-border bg-background p-3', className)}>
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {MONTH_LABELS_ES[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className={cn(
              'flex h-7 items-center justify-center text-xs font-medium',
              disabledSet.has(i)
                ? 'text-muted-foreground/40'
                : 'text-muted-foreground',
            )}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} />
          }

          const date = new Date(year, month, day)
          const iso = toIso(date)
          const col = mondayFirstIndex(date.getDay())
          const isDisabled = disabledSet.has(col)
          const isSelected = iso === value
          const isToday = iso === today

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(day)}
              aria-label={iso}
              aria-pressed={isSelected}
              className={cn(
                'flex h-8 w-full items-center justify-center rounded text-sm transition-colors',
                isDisabled && 'cursor-not-allowed text-muted-foreground/30',
                !isDisabled && !isSelected && 'hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300',
                isSelected && 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700',
                isToday && !isSelected && 'ring-1 ring-emerald-400',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      {disabledDaysOfWeek.length > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Solo días de descanso son seleccionables
        </p>
      )}
    </div>
  )
}
