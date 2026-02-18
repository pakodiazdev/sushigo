import { Calendar, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EmploymentPeriod } from '@/types/employment-period'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface EmploymentPeriodCardProps {
  period: EmploymentPeriod
}

export function EmploymentPeriodCard({ period }: EmploymentPeriodCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{period.branch_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(period.start_date)}
                {' — '}
                {period.end_date ? formatDate(period.end_date) : 'Presente'}
              </span>
            </div>
            {period.termination_reason && (
              <p className="text-sm text-muted-foreground">
                Motivo: {period.termination_reason}
              </p>
            )}
          </div>
          <Badge variant={period.is_active ? 'success' : 'default'}>
            {period.is_active ? 'Activo' : 'Terminado'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
