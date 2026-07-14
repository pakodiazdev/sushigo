import { Badge } from '@/components/ui/badge'
import type { PayPeriodStatus } from '@/types/attendance-payroll'

const STATUS_LABELS: Record<PayPeriodStatus, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  REOPENED: 'Reabierto',
}

const STATUS_VARIANTS: Record<PayPeriodStatus, 'info' | 'success' | 'warning'> = {
  OPEN: 'info',
  CLOSED: 'success',
  REOPENED: 'warning',
}

export interface PayPeriodStatusBadgeProps {
  status: PayPeriodStatus
  className?: string
}

export function PayPeriodStatusBadge({ status, className }: Readonly<PayPeriodStatusBadgeProps>) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
