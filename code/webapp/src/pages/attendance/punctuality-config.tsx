import { createFileRoute } from '@tanstack/react-router'
import { Trash2, Plus } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePunctualityConfigPage } from './use-punctuality-config-page'
import { useBonusGroupsSection } from './use-bonus-groups-section'

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

function BonusGroupsSection() {
  const { groups, isLoading, showForm, setShowForm, form, onSubmit, isPending } =
    useBonusGroupsSection()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando grupos...</p>

  return (
    <section className="mt-10 max-w-xl">
      <h2 className="text-base font-semibold mb-1">Grupos de Bono</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Cada grupo define el monto semanal y el divisor de días para calcular el bono diario.
      </p>

      {groups && groups.length > 0 && (
        <table className="w-full text-sm mb-4 border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-right">Semanal</th>
              <th className="px-4 py-2 text-right">Días</th>
              <th className="px-4 py-2 text-right">Diario</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-2">{g.name}</td>
                <td className="px-4 py-2 text-right">${g.weekly_bonus_amount.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{g.working_days_divisor}</td>
                <td className="px-4 py-2 text-right font-medium">${g.daily_bonus_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar grupo
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="border rounded-lg p-4 space-y-3 bg-card">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nombre
            </label>
            <Input {...register('name')} placeholder="Grupo $110 (÷6)" className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Monto semanal ($)
              </label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                {...register('weekly_bonus_amount', { valueAsNumber: true })}
                className="mt-1"
              />
              {errors.weekly_bonus_amount && (
                <p className="mt-1 text-xs text-red-600">{errors.weekly_bonus_amount.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Días divisor
              </label>
              <Input
                type="number"
                min={1}
                step={1}
                {...register('working_days_divisor', { valueAsNumber: true })}
                className="mt-1"
              />
              {errors.working_days_divisor && (
                <p className="mt-1 text-xs text-red-600">{errors.working_days_divisor.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar grupo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

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
        <PageHeader title="Configuración de Puntualidad" description="Cargando configuración..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configuración de Puntualidad"
        description="Define los rangos de bono y los grupos de monto semanal."
      />

      <h2 className="mt-6 text-base font-semibold">Rangos de Puntualidad</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Define los niveles de bono según el tiempo de tardanza. El último nivel aplica a cualquier tardanza mayor o igual al umbral indicado.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xl">

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

      <BonusGroupsSection />
    </PageContainer>
  )
}
