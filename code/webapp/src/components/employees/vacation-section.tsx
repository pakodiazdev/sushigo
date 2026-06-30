import { Loader2, Palmtree, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useVacationSection } from './use-vacation-section'
import type { VacationEntitlement } from '@/types/attendance-payroll'

interface VacationSectionProps {
  readonly employeeId: string
}

const RULE_LABELS: Record<string, string> = {
  VacationsLFTMX: 'LFT México 2022',
}

function ruleLabel(key: string): string {
  return RULE_LABELS[key] ?? key
}

function remainingDaysClass(remaining: number): string {
  if (remaining <= 0) return 'text-destructive font-semibold'
  if (remaining <= 3) return 'text-amber-600 font-semibold'
  return ''
}

function EntitlementRow({ row }: { readonly row: VacationEntitlement }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-sm tabular-nums font-medium">{row.year}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{row.entitled_days}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{row.used_days}</td>
      <td className="py-2 text-sm tabular-nums">
        <span className={remainingDaysClass(row.remaining_days)}>
          {row.remaining_days}
        </span>
      </td>
    </tr>
  )
}

export function VacationSection({ employeeId }: VacationSectionProps) {
  const {
    entitlements,
    isLoading,
    showForm,
    openForm,
    closeForm,
    form,
    handleSubmit,
    isPending,
  } = useVacationSection(employeeId)

  const {
    register,
    formState: { errors },
  } = form

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Vacaciones</h3>
          <Badge variant="default" className="text-xs">
            LFT México 2022
          </Badge>
        </div>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={openForm}>
            <Plus className="mr-1 h-4 w-4" />
            Registrar derecho
          </Button>
        )}
      </div>

      {/* Register form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-border p-3 space-y-3"
          data-testid="vacation-register-form"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Registrar derecho vacacional</p>
            <button
              type="button"
              onClick={closeForm}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="vac-year" className="text-xs text-muted-foreground block mb-1">
                Año
              </label>
              <select
                id="vac-year"
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                {...register('year', { valueAsNumber: true })}
              >
                {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {errors.year && (
                <p className="mt-1 text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>

            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Los días se calculan automáticamente según las reglas de LFT México 2022.
          </p>
        </form>
      )}

      {/* Entitlement table */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && entitlements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Palmtree className="h-8 w-8 mb-2" />
          <p className="text-sm">Sin derechos vacacionales registrados</p>
        </div>
      )}
      {!isLoading && entitlements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 text-xs font-medium">Año</th>
                <th className="py-2 pr-4 text-xs font-medium">Días ganados</th>
                <th className="py-2 pr-4 text-xs font-medium">Usados</th>
                <th className="py-2 text-xs font-medium">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {entitlements.map((row) => (
                <EntitlementRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
          {entitlements[0] !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">
              Regla aplicada: {ruleLabel(entitlements[0].rule_key)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
