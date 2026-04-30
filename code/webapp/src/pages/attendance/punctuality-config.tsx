import { createFileRoute } from '@tanstack/react-router'
import { Trash2, Plus } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePunctualityConfigPage } from './use-punctuality-config-page'

export const Route = createFileRoute('/attendance/punctuality-config')({
  beforeLoad: requirePermission('punctuality.manage'),
  component: PunctualityConfigPage,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function rangeLabel(minSeconds: number, maxSeconds: number | null): string {
  const minMin = Math.floor(minSeconds / 60)
  if (maxSeconds === null) return `≥ ${minMin} min`
  const maxMin = Math.floor((maxSeconds + 1) / 60)
  return `${minMin} – ${maxMin - 1} min`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PunctualityConfigPage() {
  const { ranges, isLoading, form, fields, remove, onSubmit, addRow, isPending } =
    usePunctualityConfigPage()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = form

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Rangos de Puntualidad" description="Cargando configuración..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Rangos de Puntualidad"
        description="Define los niveles de bono según el tiempo de tardanza. El último nivel aplica a cualquier tardanza mayor o igual al umbral indicado."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3 max-w-xl">

        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_120px_40px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Desde (min)</span>
          <span className="text-right">Hasta (calculado)</span>
          <span className="text-right">Bono %</span>
          <span />
        </div>

        {fields.map((field, index) => {
          const isFirst = index === 0
          const isLast = index === fields.length - 1
          const thresholdMinutes = watch(`rows.${index}.threshold_minutes`)
          const nextThreshold = watch(`rows.${index + 1}.threshold_minutes`)

          let uptoLabel = '—'
          if (isLast) {
            uptoLabel = '∞'
          } else if (nextThreshold != null && nextThreshold > thresholdMinutes) {
            uptoLabel = `${nextThreshold - 1} min`
          }

          return (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_120px_120px_40px] gap-3 items-start rounded-lg border bg-card px-4 py-3"
            >
              {/* Threshold */}
              <div>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  disabled={isFirst}
                  className={isFirst ? 'opacity-60 cursor-not-allowed' : ''}
                  {...register(`rows.${index}.threshold_minutes`, { valueAsNumber: true })}
                />
                {errors.rows?.[index]?.threshold_minutes && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.rows[index]?.threshold_minutes?.message}
                  </p>
                )}
              </div>

              {/* Until label */}
              <div className="flex items-center justify-end h-9 text-sm text-muted-foreground">
                {uptoLabel}
              </div>

              {/* Bonus % */}
              <div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="text-right"
                    {...register(`rows.${index}.bonus_percentage`, { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
                {errors.rows?.[index]?.bonus_percentage && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.rows[index]?.bonus_percentage?.message}
                  </p>
                )}
              </div>

              {/* Delete */}
              <div className="flex items-center justify-center h-9">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isFirst || fields.length === 1}
                  aria-label="Eliminar nivel"
                  title="Eliminar nivel"
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Current preview of saved ranges */}
        {ranges && (
          <p className="text-xs text-muted-foreground px-1">
            Rangos actuales guardados: {ranges.map((r) => rangeLabel(r.min_seconds, r.max_seconds)).join(' · ')}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar nivel
          </Button>
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
