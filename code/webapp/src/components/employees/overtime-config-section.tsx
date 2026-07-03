import { Loader2, Clock, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOvertimeConfigSection } from './use-overtime-config-section'

interface OvertimeConfigSectionProps {
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

function methodLabel(method: 'LFT_PROPORTIONAL' | 'AGREED_RATE'): string {
  return method === 'LFT_PROPORTIONAL' ? 'Proporcional LFT' : 'Tarifa acordada'
}

export function OvertimeConfigSection({ employeeId }: OvertimeConfigSectionProps) {
  const {
    current,
    configs,
    isLoadingConfigs,
    showForm,
    setShowForm,
    form,
    onSubmit,
    isPending,
  } = useOvertimeConfigSection(employeeId)

  const { register, handleSubmit, watch, formState: { errors } } = form
  const selectedMethod = watch('valuation_method')

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
        <h3 className="text-sm font-semibold text-foreground">Pago de Horas Extra</h3>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {current ? 'Cambiar configuración' : 'Configurar'}
          </Button>
        )}
      </div>

      {/* Current configuration */}
      {current ? (
        <div className="rounded-md border border-border p-3 space-y-1" data-testid="current-overtime-config">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{methodLabel(current.valuation_method)}</span>
            <Badge variant="success" className="text-xs">Activo</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {current.valuation_method === 'LFT_PROPORTIONAL'
              ? `Factor ${current.lft_factor}`
              : `${formatCurrency(current.hourly_rate ?? 0)}/hr`}
          </div>
          <div className="text-xs text-muted-foreground">
            Desde {formatDate(current.effective_from)}
          </div>
        </div>
      ) : (
        !showForm && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">Sin configuración de horas extra</p>
          </div>
        )
      )}

      {/* Config form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border border-border p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="valuation_method" className="text-sm font-medium">Método de valoración</label>
            <select
              id="valuation_method"
              {...register('valuation_method')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
            >
              <option value="LFT_PROPORTIONAL">Proporcional LFT</option>
              <option value="AGREED_RATE">Tarifa acordada</option>
            </select>
            {errors.valuation_method && (
              <p className="text-xs text-destructive">{errors.valuation_method.message}</p>
            )}
          </div>

          {selectedMethod === 'LFT_PROPORTIONAL' ? (
            <div className="space-y-1">
              <label htmlFor="lft_factor" className="text-sm font-medium">Factor LFT</label>
              <input
                id="lft_factor"
                type="number"
                step="0.01"
                {...register('lft_factor')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isPending}
              />
              {errors.lft_factor && (
                <p className="text-xs text-destructive">{errors.lft_factor.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="hourly_rate" className="text-sm font-medium">Tarifa por hora</label>
              <input
                id="hourly_rate"
                type="number"
                step="0.01"
                {...register('hourly_rate')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isPending}
              />
              {errors.hourly_rate && (
                <p className="text-xs text-destructive">{errors.hourly_rate.message}</p>
              )}
            </div>
          )}

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
              Guardar
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
              <div className="font-medium text-foreground">{methodLabel(cfg.valuation_method)}</div>
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
