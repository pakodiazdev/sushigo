import { useState } from 'react'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import type { EmployeeScheduleHistoryItem, ScheduleDayOverride } from '@/types/schedule'
import { DAY_LABELS } from '@/types/schedule'
import { buildCompactSummaryLine } from './schedule-section-utils'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateRange(from: string, to: string | null): string {
  const fromFormatted = formatDate(from)
  if (!to) return `${fromFormatted} → hoy`
  return `${fromFormatted} → ${formatDate(to)}`
}

function formatOverrideDate(o: ScheduleDayOverride): string {
  const from = formatDate(o.effective_from)
  if (o.effective_to === null) return `desde ${from}`
  if (o.effective_from === o.effective_to) return from
  return `${from} – ${formatDate(o.effective_to)}`
}

interface ScheduleHistoryItemProps {
  readonly schedule: EmployeeScheduleHistoryItem
  readonly isActive: boolean
}

export function ScheduleHistoryItem({ schedule, isActive }: ScheduleHistoryItemProps) {
  const [expanded, setExpanded] = useState(false)

  const overrideCount = schedule.overrides.length
  const compactSummary = buildCompactSummaryLine(schedule.days)

  // Sort overrides: permanent (no effective_to) first, then by effective_from
  const sortedOverrides = [...schedule.overrides].sort((a, b) => {
    const aIsPermanent = a.effective_to === null
    const bIsPermanent = b.effective_to === null
    if (aIsPermanent && !bIsPermanent) return -1
    if (!aIsPermanent && bIsPermanent) return 1
    return a.effective_from.localeCompare(b.effective_from)
  })

  return (
    <div className="rounded border bg-card">
      {/* Header — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {isActive && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              ACTIVO
            </span>
          )}
          <span className="text-sm">
            {formatDateRange(schedule.effective_from, schedule.effective_to)}
          </span>
        </div>
        {overrideCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            {overrideCount} {overrideCount === 1 ? 'excepción' : 'excepciones'}
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-3 py-3">
          {/* Compact one-line summary */}
          {compactSummary && (
            <p className="mb-3 text-sm text-muted-foreground">{compactSummary}</p>
          )}

          {/* Overrides section */}
          {sortedOverrides.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Excepciones ({sortedOverrides.length})
              </p>
              <ul className="space-y-1.5">
                {sortedOverrides.map((o) => {
                  const isPermanent = o.effective_to === null
                  return (
                    <li key={o.id} className="flex items-center gap-2 text-xs">
                      <span className={isPermanent ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}>
                        {isPermanent ? '●' : '⚡'}
                      </span>
                      <span className="font-medium">{DAY_LABELS[o.day_of_week]}</span>
                      <span className="text-muted-foreground">—</span>
                      {o.is_day_off ? (
                        <span className="text-muted-foreground">Descanso</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {o.expected_start ?? ''} – {o.expected_end ?? ''}
                        </span>
                      )}
                      <span className="text-muted-foreground">{formatOverrideDate(o)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}