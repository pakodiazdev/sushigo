import { todayDateCdmx } from '@/lib/datetime'

export const MONTH_LABELS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function toIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function todayIso(): string {
  return todayDateCdmx()
}

export function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

export type MonthCell = { kind: 'pad'; key: string } | { kind: 'day'; day: number }

export function buildMonthCells(year: number, month: number): MonthCell[] {
  const firstDayOfMonth = new Date(year, month, 1)
  const startOffset = mondayFirstIndex(firstDayOfMonth.getDay())
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return [
    ...Array.from({ length: startOffset }, (_, slot) => ({
      kind: 'pad' as const,
      key: `pad-${year}-${month}-${slot}`,
    })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      kind: 'day' as const,
      day: i + 1,
    })),
  ]
}
