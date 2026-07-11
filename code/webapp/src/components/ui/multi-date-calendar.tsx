import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusinessDate } from '@/stores/clock.store'
import { MONTH_LABELS_FULL, DAY_HEADERS, toIso, todayIso, buildMonthCells } from './calendar-shared'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MultiDateCalendarProps {
  /** Selected dates in YYYY-MM-DD format, order does not matter */
  readonly value: string[]
  readonly onChange: (dates: string[]) => void
  /** When true, clicking a day replaces the selection instead of adding to it */
  readonly singleSelect?: boolean
  readonly className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function sortDates(dates: string[]): string[] {
  return [...dates].sort((a, b) => a.localeCompare(b))
}

// ── MultiDateCalendar ─────────────────────────────────────────────────────────

/**
 * Inline (always-visible) calendar where clicking a day toggles it in/out of
 * the selection — used for leave requests, where the days covered by a
 * single permiso don't have to be contiguous (e.g. Monday + Wednesday).
 */
export function MultiDateCalendar({ value, onChange, singleSelect = false, className }: MultiDateCalendarProps) {
  // Respects the Application Clock (simulated time) when available, so the
  // "today" marker and the default viewed month match the simulated date
  // instead of the browser's real clock.
  const businessDate = useBusinessDate()
  const today = businessDate ?? todayIso()
  const initial = new Date(`${value[0] ?? today}T12:00:00`)

  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())

  const selectedSet = new Set(value)

  const cells = buildMonthCells(year, month)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  function toggleDate(iso: string) {
    if (singleSelect) {
      onChange([iso])
      return
    }

    if (selectedSet.has(iso)) {
      onChange(sortDates(value.filter((d) => d !== iso)))
    } else {
      onChange(sortDates([...value, iso]))
    }
  }

  function removeDate(iso: string) {
    onChange(sortDates(value.filter((d) => d !== iso)))
  }

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      <div className="p-3">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-1">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={prevMonth}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="flex-1 text-center text-sm font-medium capitalize text-foreground">
            {MONTH_LABELS_FULL[month]} {year}
          </span>

          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={nextMonth}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground">
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell) => {
            if (cell.kind === 'pad') return <div key={cell.key} />

            const date = new Date(year, month, cell.day)
            const iso = toIso(date)
            const isSelected = selectedSet.has(iso)
            const isToday = iso === today

            return (
              <button
                key={cell.day}
                type="button"
                onClick={() => toggleDate(iso)}
                aria-label={iso}
                aria-pressed={isSelected}
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded text-sm transition-colors',
                  !isSelected && 'text-foreground hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300',
                  isSelected && 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700',
                  isToday && !isSelected && 'ring-1 ring-emerald-400',
                )}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected dates chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border p-3">
          {sortDates(value).map((iso) => (
            <span
              key={iso}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {formatDisplay(iso)}
              <button
                type="button"
                aria-label={`Quitar ${iso}`}
                onClick={() => removeDate(iso)}
                className="rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
