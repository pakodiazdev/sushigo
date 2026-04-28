import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { useBusinessDate } from '@/stores/clock.store'
import type { EmployeeScheduleHistoryItem, ScheduleDayOverride } from '@/types/schedule'
import { DAY_LABELS } from '@/types/schedule'
import { buildCompactSummaryLine } from './schedule-section-utils'

interface ExpandIconProps {
  readonly expanded: boolean
  readonly hasOverrides: boolean
}

function ExpandIcon({ expanded, hasOverrides }: ExpandIconProps) {
  if (!hasOverrides) return <span className="w-4" />
  if (expanded) return <ChevronDown className="h-4 w-4 text-muted-foreground" />
  return <ChevronRight className="h-4 w-4 text-muted-foreground" />
}

interface OverrideItemProps {
  readonly override: ScheduleDayOverride
}

function OverrideItem({ override }: OverrideItemProps) {
  const isPermanent = override.effective_to === null
  const iconClass = isPermanent ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'
  const icon = isPermanent ? '●' : '⚡'

  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={iconClass}>{icon}</span>
      <span className="font-medium">{DAY_LABELS[override.day_of_week]}</span>
      <span className="text-muted-foreground">—</span>
      {override.is_day_off ? (
        <span className="text-muted-foreground">Descanso</span>
      ) : (
        <span className="text-muted-foreground">
          {override.expected_start ?? ''} – {override.expected_end ?? ''}
        </span>
      )}
      <span className="text-muted-foreground">{formatOverrideDate(override)}</span>
    </li>
  )
}

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
  const businessDate = useBusinessDate()
  const hasOverrides = schedule.overrides.length > 0
  const compactSummary = buildCompactSummaryLine(schedule.days, schedule.overrides, businessDate ?? undefined)

  const sortedOverrides = useMemo(() =>
    [...schedule.overrides].sort((a, b) => {
      if (a.effective_to === null && b.effective_to !== null) return -1
      if (a.effective_to !== null && b.effective_to === null) return 1
      return a.effective_from.localeCompare(b.effective_from)
    }), [schedule.overrides])

  const handleClick = () => hasOverrides && setExpanded((v) => !v)
  const buttonClass = `flex w-full flex-col gap-1 px-3 py-2 text-left ${hasOverrides ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`
  const overrideLabel = sortedOverrides.length === 1 ? 'excepción' : 'excepciones'

  return (
    <div className="rounded border bg-card">
      <button type="button" onClick={handleClick} className={buttonClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ExpandIcon expanded={expanded} hasOverrides={hasOverrides} />
            {isActive && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                ACTIVO
              </span>
            )}
            <span className="text-sm">
              {formatDateRange(schedule.effective_from, schedule.effective_to)}
            </span>
          </div>
          {hasOverrides && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              {sortedOverrides.length} {overrideLabel}
            </span>
          )}
        </div>
        {compactSummary && (
          <p className="ml-6 text-xs text-muted-foreground">{compactSummary}</p>
        )}
      </button>

      {expanded && hasOverrides && (
        <div className="border-t px-3 py-3">
          <ul className="space-y-1.5">
            {sortedOverrides.map((o) => <OverrideItem key={o.id} override={o} />)}
          </ul>
        </div>
      )}
    </div>
  )
}