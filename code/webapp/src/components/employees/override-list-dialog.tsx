import { createPortal } from 'react-dom'
import { X, Zap } from 'lucide-react'
import type { ScheduleDayOverride } from '@/types/schedule'
import { calcDayHours, formatHours, overrideDateLabel } from './schedule-section-utils'
import { formatTime } from '@/lib/time-format'

// ── OverrideListDialog ────────────────────────────────────────────────────────

interface OverrideListDialogProps {
  readonly dow: number
  readonly dayLabel: string
  readonly overrides: ScheduleDayOverride[]
  readonly onSelect: (override: ScheduleDayOverride) => void
  readonly onClose: () => void
}

export function OverrideListDialog({ dow: _dow, dayLabel, overrides, onSelect, onClose }: OverrideListDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 w-full border-0 bg-black/40 p-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold">Excepciones — {dayLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {overrides.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin excepciones activas.</p>
          ) : (
            <ul className="divide-y">
              {overrides.map((o) => {
                const hrs = calcDayHours(o.expected_start, o.expected_end, o.lunch_duration_minutes)
                const hrsLabel = hrs ? ` · ${formatHours(hrs)}` : ''
                const overrideTime = o.is_day_off
                  ? 'Descanso'
                  : `${formatTime(o.expected_start)} → ${formatTime(o.expected_end)}${hrsLabel}`
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => onSelect(o)}
                      className="w-full px-5 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{overrideDateLabel(o)}</p>
                      <p className="mt-0.5 text-sm">{overrideTime}</p>
                      {o.note && <p className="mt-0.5 text-xs text-muted-foreground">{o.note}</p>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
