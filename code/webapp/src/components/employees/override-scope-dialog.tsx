import { createPortal } from 'react-dom'
import { X, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ScheduleDayOverride } from '@/types/schedule'
import type { OverrideScope } from './use-create-day-override'
import { useOverrideScopeDialog } from './use-override-scope-dialog'
import { calcDayHours, formatHours, overrideDateLabel } from './schedule-section-utils'
import { formatTime } from '@/lib/time-format'

const SCOPE_OPTIONS: { value: OverrideScope; label: string; description: string }[] = [
  {
    value: 'single_date',
    label: 'Solo esta fecha',
    description: 'Un cambio puntual para una fecha específica.',
  },
  {
    value: 'range',
    label: 'Rango de fechas',
    description: 'Aplica durante un período con fecha de fin.',
  },
  {
    value: 'indefinite',
    label: 'De aquí en adelante',
    description: 'Solo este día cambia permanentemente. Los demás días conservan su horario.',
  },
]

export interface OverrideScopeDialogProps {
  readonly dayLabel: string
  readonly dayOfWeek: number
  readonly existingOverrides: ScheduleDayOverride[]
  readonly isPending: boolean
  readonly isError: boolean
  readonly onSubmit: (params: { scope: OverrideScope; effectiveFrom: string; effectiveTo: string | null; note: string }) => void
  readonly onClose: () => void
}

export function OverrideScopeDialog({ dayLabel, dayOfWeek, existingOverrides, isPending, isError, onSubmit, onClose }: OverrideScopeDialogProps) {
  const {
    register,
    errors,
    isValid,
    scope,
    effectiveFrom,
    step,
    conflicts,
    handlePrimaryClick,
    handleConfirmConflicts,
    backToForm,
  } = useOverrideScopeDialog(dayOfWeek, existingOverrides, onSubmit)

  const today = new Date().toISOString().slice(0, 10)
  const isIndefinite = scope === 'indefinite'
  const dateLabel = scope === 'single_date' ? 'Fecha' : 'A partir de'
  const submitLabel = isIndefinite ? 'Aplicar cambio permanente' : 'Guardar excepción'

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 w-full border-0 bg-black/50 p-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold">Ajuste — {dayLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {step === 'form' ? (
          <>
            <div className="space-y-4 p-5">
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">¿Cuándo aplica?</legend>
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors ${
                      scope === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('scope')}
                      checked={scope === opt.value}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="scope-effective-from" className="block text-xs font-medium">
                  {dateLabel}<span className="ml-0.5 text-red-500">*</span>
                </label>
                <Input id="scope-effective-from" type="date" min={today} {...register('effectiveFrom')} />
                {errors.effectiveFrom && <p className="text-[10px] text-red-600">{errors.effectiveFrom.message}</p>}
              </div>

              {scope === 'range' && (
                <div className="space-y-2">
                  <label htmlFor="scope-effective-to" className="block text-xs font-medium">Hasta<span className="ml-0.5 text-red-500">*</span></label>
                  <Input id="scope-effective-to" type="date" min={effectiveFrom || today} {...register('effectiveTo')} />
                  {errors.effectiveTo && <p className="text-[10px] text-red-600">{errors.effectiveTo.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="scope-note" className="block text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
                <input
                  id="scope-note"
                  type="text"
                  placeholder="Ej. Clases de inglés los jueves"
                  maxLength={255}
                  {...register('note')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {isError && <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button type="button" size="sm" disabled={!isValid || isPending} onClick={handlePrimaryClick}>
                {isPending ? 'Guardando…' : submitLabel}
              </Button>
            </div>
          </>
        ) : (
          /* ── Paso 2: confirmación de conflictos ─────────────────────── */
          <>
            <div className="space-y-3 p-5">
              <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Se encontró{conflicts.length === 1 ? '' : 'n'}{' '}
                  <strong>{conflicts.length} ajuste{conflicts.length === 1 ? '' : 's'}</strong>{' '}
                  existente{conflicts.length === 1 ? '' : 's'} para {dayLabel} que se cruza{conflicts.length === 1 ? '' : 'n'} con las fechas seleccionadas.
                </p>
              </div>
              <ul className="divide-y rounded-md border text-sm">
                {conflicts.map((o) => {
                  const hrs = calcDayHours(o.expected_start, o.expected_end, o.lunch_duration_minutes)
                  const hrsLabel = hrs ? ` · ${formatHours(hrs)}` : ''
                  const conflictTime = o.is_day_off
                    ? 'Descanso'
                    : `${formatTime(o.expected_start)} → ${formatTime(o.expected_end)}${hrsLabel}`
                  return (
                    <li key={o.id} className="px-3 py-2.5 space-y-0.5">
                      <p className="font-medium text-xs text-amber-600 dark:text-amber-400">{overrideDateLabel(o)}</p>
                      <p className="text-muted-foreground">{conflictTime}</p>
                      {o.note && <p className="text-xs text-muted-foreground">{o.note}</p>}
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                El sistema aplicará el ajuste con <strong>fecha de inicio más reciente</strong>. Los ajustes anteriores permanecerán en el registro histórico.
              </p>
              {isError && <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={backToForm}>← Volver</Button>
              <Button type="button" size="sm" disabled={isPending} onClick={handleConfirmConflicts}>
                {isPending ? 'Guardando…' : 'Continuar de todos modos'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
