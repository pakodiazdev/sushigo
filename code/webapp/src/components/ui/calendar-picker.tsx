import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTH_LABELS_FULL, DAY_HEADERS, toIso, todayIso, mondayFirstIndex, buildMonthCells } from './calendar-shared'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarPickerProps {
  /** Selected date in YYYY-MM-DD format, or empty string */
  readonly value: string
  readonly onChange: (date: string) => void
  /**
   * ISO days of week (1=Mon … 7=Sun) that are DISABLED.
   * Pass the employee's working days so only rest days are selectable.
   */
  readonly disabledDaysOfWeek?: number[]
  readonly placeholder?: string
  readonly className?: string
}

type View = 'day' | 'month' | 'year'

const YEARS_PER_PAGE = 12

// ── Static data ───────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isoToMondayIndex(isoDow: number): number {
  return isoDow - 1
}

/** First year shown for a given yearPage (12 per page, pages are decade-aligned). */
function yearPageStart(year: number, page: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE + page * YEARS_PER_PAGE
}

// ── CalendarGrid ──────────────────────────────────────────────────────────────

interface CalendarGridProps {
  readonly value: string
  readonly onSelect: (iso: string) => void
  readonly disabledSet: Set<number>
  readonly disabledCount: number
}

function CalendarGrid({ value, onSelect, disabledSet, disabledCount }: CalendarGridProps) {
  const today = todayIso()
  const initial = value ? new Date(`${value}T12:00:00`) : new Date()

  const [view, setView] = useState<View>('day')
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())
  const [yearPage, setYearPage] = useState(0) // offset from base decade

  // ── Day view helpers ────────────────────────────────────────────────────────

  const cells = buildMonthCells(year, month)

  function prevDay() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextDay() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // ── Year view helpers ───────────────────────────────────────────────────────

  const baseYear = yearPageStart(year, yearPage)
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => baseYear + i)

  function selectYear(y: number) {
    setYear(y)
    setYearPage(0)
    setView('month')
  }

  // ── Month view helpers ──────────────────────────────────────────────────────

  function selectMonth(m: number) {
    setMonth(m)
    setView('day')
  }

  // ── Cycle header label ──────────────────────────────────────────────────────

  function cycleView() {
    setView((v) => {
      if (v === 'day') return 'month'
      if (v === 'month') return 'year'
      return 'day'
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="select-none p-3">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-1">

        {/* Prev arrow */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => {
            if (view === 'day') prevDay()
            else if (view === 'month') setYear((y) => y - 1)
            else setYearPage((p) => p - 1)
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Clickable label — cycles through day → month → year views */}
        <button
          type="button"
          onClick={cycleView}
          className="flex-1 rounded px-1 py-0.5 text-center text-sm font-medium capitalize hover:bg-muted"
          title="Click para cambiar vista"
        >
          {view === 'day' && `${MONTH_LABELS_FULL[month]} ${year}`}
          {view === 'month' && `${year}`}
          {view === 'year' && `${years[0]} – ${years[YEARS_PER_PAGE - 1]}`}
        </button>

        {/* Next arrow */}
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => {
            if (view === 'day') nextDay()
            else if (view === 'month') setYear((y) => y + 1)
            else setYearPage((p) => p + 1)
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Year view ── */}
      {view === 'year' && (
        <div className="grid grid-cols-4 gap-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              className={cn(
                'rounded py-1.5 text-sm transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300',
                y === year && 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'month' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => selectMonth(i)}
              className={cn(
                'rounded py-2 text-sm transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300',
                i === month && 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Day view ── */}
      {view === 'day' && (
        <>
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
            {cells.map((cell) => {
              if (cell.kind === 'pad') return <div key={cell.key} />

              const day = cell.day

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
        </>
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

      {/* Dropdown */}
      {open && (
        <dialog
          open
          aria-label="Seleccionar fecha"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background shadow-lg"
        >
          <CalendarGrid
            value={value}
            onSelect={handleSelect}
            disabledSet={disabledSet}
            disabledCount={disabledDaysOfWeek.length}
          />
        </dialog>
      )}
    </div>
  )
}
