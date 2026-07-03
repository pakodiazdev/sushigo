import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  weeksInMonth,
  formatWeekOrdinal,
  formatWeekTitle,
  currentWeekRange,
  addDays,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
} from '@/lib/week'

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const YEARS_PER_PAGE = 12

/** First year shown for a given yearPage (12 per page, pages are decade-aligned). */
function yearPageStart(year: number, page: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE + page * YEARS_PER_PAGE
}

type View = 'weeks' | 'months' | 'years'

export interface WeekCalendarProps {
  readonly periodStart: string
  readonly earliestWeekStart: string | null
  readonly onSelectDate: (dateStr: string) => void
}

export function WeekCalendar({ periodStart, earliestWeekStart, onSelectDate }: WeekCalendarProps) {
  const initial = new Date(periodStart + 'T00:00:00')
  const [view, setView] = useState<View>('weeks')
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())
  const [yearPage, setYearPage] = useState(0)

  const weeks = weeksInMonth(year, month)
  const currentWeekStart = currentWeekRange().start

  // Follow periodStart when it moves to a different month (e.g. prev/next-week
  // arrows crossing a month boundary, or "current week"). Clicking a row never
  // triggers this, since a row's date always belongs to the month already shown.
  useEffect(() => {
    const target = new Date(periodStart + 'T00:00:00')
    if (target.getFullYear() !== year || target.getMonth() !== month) {
      setYear(target.getFullYear())
      setMonth(target.getMonth())
      setView('weeks')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  function handlePrev() {
    if (view === 'weeks') prevMonth()
    else if (view === 'months') setYear((y) => y - 1)
    else setYearPage((p) => p - 1)
  }

  function handleNext() {
    if (view === 'weeks') nextMonth()
    else if (view === 'months') setYear((y) => y + 1)
    else setYearPage((p) => p + 1)
  }

  function cycleView() {
    setView((v) => {
      if (v === 'weeks') return 'months'
      if (v === 'months') return 'years'
      return 'weeks'
    })
  }

  const baseYear = yearPageStart(year, yearPage)
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => baseYear + i)

  return (
    <div data-testid="week-calendar" className="rounded-md border border-border p-3">
      {/* Navigator — arrows shift month/year/year-page depending on the active view */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          data-testid="week-calendar-prev"
          onClick={handlePrev}
          aria-label="Anterior"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          data-testid="week-calendar-view-label"
          onClick={cycleView}
          title="Click para cambiar de vista"
          className="flex-1 rounded px-1 py-0.5 text-center text-sm font-medium capitalize hover:bg-muted"
        >
          {view === 'weeks' && `${MONTH_NAMES[month]} ${year}`}
          {view === 'months' && `${year}`}
          {view === 'years' && `${years[0]} – ${years[YEARS_PER_PAGE - 1]}`}
        </button>

        <button
          type="button"
          data-testid="week-calendar-next"
          onClick={handleNext}
          aria-label="Siguiente"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Years view */}
      {view === 'years' && (
        <div className="grid grid-cols-4 gap-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              data-testid="week-calendar-year-option"
              onClick={() => { setYear(y); setYearPage(0); setView('months') }}
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

      {/* Months view */}
      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTH_NAMES_SHORT.map((label, i) => (
            <button
              key={label}
              type="button"
              data-testid="week-calendar-month-option"
              onClick={() => { setMonth(i); setView('weeks') }}
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

      {/* Weeks view — one row per week, clicking anywhere in the row selects that week */}
      {view === 'weeks' && (
        <>
          <div className="mb-1 grid grid-cols-[2.5rem_repeat(7,1fr)] gap-0.5">
            <span />
            {DAY_HEADERS.map((h) => (
              <div key={h} className="flex h-6 items-center justify-center text-xs font-medium text-muted-foreground">
                {h}
              </div>
            ))}
          </div>

          <div className="space-y-0.5">
            {weeks.map((week, index) => {
              const isSelected = week.start === periodStart
              const isFuture = week.start > currentWeekStart
              const isBeforeHire = earliestWeekStart !== null && week.start < earliestWeekStart
              const isDisabled = isFuture || isBeforeHire
              const ordinal = formatWeekOrdinal(index + 1)
              const disabledTitle = isFuture
                ? 'No se pueden seleccionar semanas futuras'
                : 'El empleado no tenía periodo activo antes de esta semana'
              return (
                <button
                  key={week.start}
                  type="button"
                  data-testid="week-calendar-row"
                  onClick={() => onSelectDate(week.start)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-disabled={isDisabled}
                  title={isDisabled ? disabledTitle : formatWeekTitle(week.start, week.end)}
                  className={cn(
                    'grid w-full grid-cols-[2.5rem_repeat(7,1fr)] items-center gap-0.5 rounded transition-colors',
                    isDisabled && 'cursor-not-allowed opacity-40',
                    !isDisabled && isSelected && 'bg-emerald-600 text-white hover:bg-emerald-700',
                    !isDisabled && !isSelected && 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                  )}
                >
                  <span className={cn('text-xs font-medium', !isSelected && 'text-muted-foreground')}>
                    {ordinal}
                  </span>
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayIso = addDays(week.start, i)
                    const dayDate = new Date(`${dayIso}T00:00:00`)
                    const inMonth = dayDate.getMonth() === month
                    return (
                      <span
                        key={dayIso}
                        className={cn(
                          'flex h-8 items-center justify-center text-sm',
                          !inMonth && !isSelected && 'text-muted-foreground/40',
                        )}
                      >
                        {dayDate.getDate()}
                      </span>
                    )
                  })}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
