import { Briefcase } from 'lucide-react'
import { EmploymentPeriodCard } from './employment-period-card'
import type { EmploymentPeriod } from '@/types/employment-period'

interface EmploymentPeriodsSectionProps {
  periods: EmploymentPeriod[]
}

export function EmploymentPeriodsSection({ periods }: Readonly<EmploymentPeriodsSectionProps>) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Periodos Laborales</h3>

      {periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Briefcase className="h-8 w-8 mb-2" />
          <p className="text-sm">No hay periodos laborales registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <EmploymentPeriodCard key={period.id} period={period} />
          ))}
        </div>
      )}
    </div>
  )
}
