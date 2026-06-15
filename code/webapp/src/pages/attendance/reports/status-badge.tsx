import { Badge } from '@/components/ui/badge'
import type { EmployeeOperationalStatus } from '@/types/report'

type BadgeVariant = 'success' | 'warning' | 'error' | 'default'

const STATUS_CONFIG: Record<EmployeeOperationalStatus, { label: string; variant: BadgeVariant }> = {
  arrived:     { label: 'A tiempo',        variant: 'success' },
  late:        { label: 'Tardanza',         variant: 'warning' },
  not_arrived: { label: 'No registrado',   variant: 'error' },
  on_leave:    { label: 'Permiso',          variant: 'default' },
  day_off:     { label: 'Descanso',         variant: 'default' },
  rest_day:    { label: 'Día de descanso',  variant: 'default' },
}

/**
 * Colored badge showing an employee's operational status.
 * When status is 'late' and lateMinutes is provided, displays "Tardanza N min".
 */
export function StatusBadge({
  status,
  lateMinutes,
}: {
  readonly status: EmployeeOperationalStatus
  readonly lateMinutes: number | null
}) {
  const config = STATUS_CONFIG[status]
  const label =
    status === 'late' && lateMinutes != null ? `Tardanza ${lateMinutes} min` : config.label

  return <Badge variant={config.variant}>{label}</Badge>
}
