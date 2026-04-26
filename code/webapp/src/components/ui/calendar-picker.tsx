import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
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
  placeholder?: string
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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

function formatDisplay(iso: string): string {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** JS getDay() (0=Sun…6=Sat) → Monday-first column index (0=Mon…6=Sun). */
function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

/** ISO day of week (1=Mon…7=Sun) → Monday-first column index (0=Mon…6=Sun). */
function isoToMondayIndex(isoDow: number): number {
  return isoDow - 1
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface CalendarGridProps {
  value: string
  onSelect: (iso: string) => void
  disabledSet: Set<number>
  disabledCount: number
}

function CalendarGrid({ value, onSelect, disabledSet, disabledCount }: CalendarGridProps) {
  const today = todayIso()
  const initialDate = value ? new Date(`${value}T12:00:00`) : new Date()
  const [year, setYear] = useState(initialDate.getFullYear())
  const [month, setMonth] = useState(initialDate.getMonth())

  const firstDay = new Date(year, month, 1)
  const startOffset = mondayFirstIndex(firstDay.getDay())
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="select-none p-3">
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
              disabledSet.has(i) ? 'text-muted-foreground/35' : 'text-muted-foreground',
            )}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />

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
              onClick={() => onSelect(iso)}
              aria-label={iso}
              aria-pressed={isSelected}
              className={cn(
                'flex h-8 w-full items-center justify-center rounded text-sm transition-colors',
                isDisabled && 'cursor-not-allowed text-muted-foreground/25',
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

      {disabledCount > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Solo días de descanso son seleccionables
        </p>
      )}
    </div>
  )
}

// ── CalendarPicker (input + popover) ──────────────────────────────────────────

export function CalendarPicker({
  value,
  onChange,
  disabledDaysOfWeek = [],
  placeholder = 'Seleccionar fecha',
  className,
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const disabledSet = new Set(disabledDaysOfWeek.map(isoToMondayIndex))

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function handleSelect(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
          'hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'border-ring ring-2 ring-ring ring-offset-2',
          !value && 'text-muted-foreground',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{value ? formatDisplay(value) : placeholder}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Seleccionar fecha"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background shadow-lg"
        >
          <CalendarGrid
            value={value}
            onSelect={handleSelect}
            disabledSet={disabledSet}
            disabledCount={disabledDaysOfWeek.length}
          />
        </div>
      )}
    </div>
  )
}
