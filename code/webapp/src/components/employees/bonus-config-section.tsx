import { Loader2, Award, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBonusConfigSection } from './use-bonus-config-section'

interface BonusConfigSectionProps {
  readonly employeeId: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function BonusConfigSection({ employeeId }: BonusConfigSectionProps) {
  const {
    current,
    configs,
    groups,
    isLoadingConfigs,
    isLoadingGroups,
    showForm,
    setShowForm,
    form,
    onSubmit,
    isPending,
  } = useBonusConfigSection(employeeId)

  const { register, handleSubmit, formState: { errors } } = form

  if (isLoadingConfigs) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Grupo de Bono de Puntualidad</h3>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {current ? 'Cambiar grupo' : 'Asignar grupo'}
          </Button>
        )}
      </div>

      {/* Current assignment */}
      {current ? (
        <div className="rounded-md border border-border p-3 space-y-1" data-testid="current-bonus-assignment">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{current.bonus_group_name}</span>
            <Badge variant="success" className="text-xs">Activo</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(current.weekly_bonus_amount)}/sem · {formatCurrency(current.daily_bonus_amount)}/día
          </div>
          <div className="text-xs text-muted-foreground">
            Desde {formatDate(current.effective_from)}
          </div>
        </div>
      ) : (
        !showForm && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Award className="h-8 w-8 mb-2" />
            <p className="text-sm">Sin grupo de bono asignado</p>
          </div>
        )
      )}

      {/* Assignment form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border border-border p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="bonus_group_id" className="text-sm font-medium">Grupo de bono</label>
            <select
              id="bonus_group_id"
              {...register('bonus_group_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoadingGroups || isPending}
            >
              <option value="">Selecciona un grupo...</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {formatCurrency(g.weekly_bonus_amount)}/sem
                </option>
              ))}
            </select>
            {errors.bonus_group_id && (
              <p className="text-xs text-destructive">{errors.bonus_group_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="effective_from" className="text-sm font-medium">Fecha de vigencia</label>
            <input
              id="effective_from"
              type="date"
              {...register('effective_from')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
            />
            {errors.effective_from && (
              <p className="text-xs text-destructive">{errors.effective_from.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* History */}
      {configs && configs.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Historial</h4>
          {configs.slice(1).map((cfg) => (
            <div key={cfg.id} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
              <div className="font-medium text-foreground">{cfg.bonus_group_name}</div>
              <div>
                {formatDate(cfg.effective_from)} → {cfg.effective_to ? formatDate(cfg.effective_to) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
