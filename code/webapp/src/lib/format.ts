export function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}

function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function isNextDay(dateStr: string, nextDateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day! + 1)
  const [nextYear, nextMonth, nextDay] = nextDateStr.split('-').map(Number)
  return date.getFullYear() === nextYear && date.getMonth() === nextMonth! - 1 && date.getDate() === nextDay
}

/**
 * Groups a leave's individual days into contiguous runs (e.g. [13, 14, 15]
 * becomes one run, [13, 15] becomes two single-day runs) — days do not have
 * to be consecutive within a single leave.
 */
export function groupContiguousDates(dates: string[]): string[][] {
  if (dates.length === 0) return []

  const sorted = [...dates].sort()
  const runs: string[][] = []
  let current: string[] = [sorted[0]!]

  for (let i = 1; i < sorted.length; i++) {
    const date = sorted[i]!
    if (isNextDay(current[current.length - 1]!, date)) {
      current.push(date)
    } else {
      runs.push(current)
      current = [date]
    }
  }
  runs.push(current)

  return runs
}

/**
 * Formats a leave's individual days into a compact readable label,
 * collapsing contiguous runs into ranges (e.g. "lun 13 — mié 15 abr") while
 * keeping non-contiguous days separate (e.g. "lun 13 abr, mié 15 abr").
 */
export function formatDatesLabel(dates: string[]): string {
  return groupContiguousDates(dates)
    .map((run) => run.length === 1 ? formatDayLabel(run[0]!) : `${formatDayLabel(run[0]!)} — ${formatDayLabel(run[run.length - 1]!)}`)
    .join(', ')
}
