import { useState } from 'react'
import type { PayPeriodEmployeePreview, PayPeriodLine } from '@/types/attendance-payroll'

// Shared between the close-preview page and the closed-period detail page —
// both render the identical expandable employee/day-line breakdown, only the
// data source (calculated preview vs. frozen totals) differs.

export interface EmployeePayRowProps {
  row: PayPeriodEmployeePreview
  testId: string
}

export function EmployeePayRow({ row, testId }: Readonly<EmployeePayRowProps>) {
  const [expanded, setExpanded] = useState(false)
  const name = `${row.employee.first_name} ${row.employee.last_name}`

  const totalDeductions = row.late_deductions + row.unpaid_leave_deductions
  const totalExtras = row.overtime_pay + row.extra_day_pay + row.punctuality_bonus + row.holiday_pay

  return (
    <div data-testid={testId} className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(prev => !prev)}
      >
        <span className="font-medium text-gray-900">{name}</span>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-600">
            Base: <span className="font-mono">${row.base_pay.toFixed(2)}</span>
          </span>
          {totalDeductions > 0 && (
            <span className="text-red-600">
              −<span className="font-mono">${totalDeductions.toFixed(2)}</span>
            </span>
          )}
          {totalExtras > 0 && (
            <span className="text-green-600">
              +<span className="font-mono">${totalExtras.toFixed(2)}</span>
            </span>
          )}
          <span className="rounded bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
            Total: ${row.total_pay.toFixed(2)}
          </span>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="pb-2 pr-2 w-6">Día</th>
                <th className="pb-2 pr-4">Fecha</th>
                <th className="pb-2 pr-4">Concepto</th>
                <th className="pb-2 pr-4">Descripción</th>
                <th className="pb-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortLines(row.pay_period_lines).map((line, i) => (
                <LineRow key={`${line.concept}-${line.date ?? 'none'}-${i}`} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// D L M X J V S — Sunday-first to align with Date#getDay(). X for Miércoles to avoid clash with Martes (M).
const DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

function dayInitial(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  const [year, month, day] = parts as [number, number, number]
  return DAY_INITIALS[new Date(year, month - 1, day).getDay()] ?? ''
}

function sortLines(lines: PayPeriodLine[]): PayPeriodLine[] {
  return [...lines].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })
}

function LineRow({ line }: { readonly line: PayPeriodLine }) {
  const isDeduction = line.amount < 0
  const initial = dayInitial(line.date)
  return (
    <tr>
      <td className="py-1 pr-2 font-semibold text-gray-400 w-6">{initial}</td>
      <td className="py-1 pr-4 text-gray-500">{line.date ?? '—'}</td>
      <td className="py-1 pr-4">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
          {line.concept}
        </span>
      </td>
      <td className="py-1 pr-4 text-gray-700">{line.description}</td>
      <td className={`py-1 text-right font-mono ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
        ${Math.abs(line.amount).toFixed(2)}
      </td>
    </tr>
  )
}

export function PayRowSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}
