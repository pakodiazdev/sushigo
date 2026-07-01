import { Loader2, Palmtree } from 'lucide-react'
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
  const { entitlements, isLoading } = useVacationSection(employeeId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Vacaciones</h3>
        <Badge variant="default" className="text-xs">
          LFT México 2022
        </Badge>
      </div>

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
