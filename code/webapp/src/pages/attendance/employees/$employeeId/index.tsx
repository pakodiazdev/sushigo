import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { DAY_LABELS } from '@/types/schedule'
import { useEmployeeSchedulePage } from './-use-employee-schedule-page'

export const Route = createFileRoute('/attendance/employees/$employeeId/')({
  component: EmployeeSchedulePage,
})

function EmployeeSchedulePage() {
  const { employeeId } = Route.useParams()
  const {
    employee,
    schedule,
    isLoadingEmployee,
    isLoadingSchedule,
    isError,
  } = useEmployeeSchedulePage(employeeId)

  if (isError) {
    return (
      <PageContainer>
        <p className="text-sm text-red-600">No se encontró el empleado.</p>
      </PageContainer>
    )
  }

  const employeeName = employee
    ? `${employee.first_name} ${employee.last_name}`
    : '…'

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        to="/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Empleados
      </Link>

      <PageHeader
        title={isLoadingEmployee ? 'Cargando…' : employeeName}
        description="Horario semanal activo"
      />

      {/* ── Schedule section ─────────────────────────────────── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-4 w-4" />
            Horario actual
          </h2>
        </div>

        {renderScheduleContent(isLoadingSchedule, schedule)}
      </div>
    </PageContainer>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

type SchedulePanelSchedule = NonNullable<ReturnType<typeof useEmployeeSchedulePage>['schedule']>

function renderScheduleContent(isLoading: boolean, schedule: SchedulePanelSchedule | null | undefined) {
  if (isLoading) return <ScheduleSkeleton />
  if (schedule) return <SchedulePanel schedule={schedule} />
  return <EmptySchedule />
}

function SchedulePanel({ schedule }: { readonly schedule: SchedulePanelSchedule }) {
  return (
    <div className="rounded-md border">
      {/* Header info */}
      <div className="flex flex-wrap gap-3 border-b px-4 py-3 text-sm">
        <Badge>{schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}</Badge>
        <span className="text-muted-foreground">
          {schedule.working_days_per_week} días/semana
        </span>
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Days grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <th className="py-2 pl-4 pr-3">Día</th>
              <th className="py-2 pr-3">Entrada</th>
              <th className="py-2 pr-3">Fin almuerzo</th>
              <th className="py-2 pr-3">Salida</th>
              <th className="py-2 pr-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {[...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week).map((day) => (
              <tr key={day.day_of_week} className="border-b last:border-0">
                <td className="py-2 pl-4 pr-3 font-medium">{DAY_LABELS[day.day_of_week]}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_start ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_lunch_end ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_end ?? '—'}</td>
                <td className="py-2 pr-4 text-center">
                  {day.is_day_off ? (
                    <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptySchedule() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
      <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="mb-1 font-medium">Sin horario activo</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Este empleado no tiene un horario vigente configurado.
      </p>
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex gap-6 border-b px-4 py-3 last:border-0">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
