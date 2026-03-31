import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { useEmployeeSchedulePage } from './-use-employee-schedule-page'
import { SchedulePanel } from './-schedule-panel'
import { EmptySchedule, ScheduleSkeleton } from './-schedule-states'

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

        {isLoadingSchedule && <ScheduleSkeleton />}
        {!isLoadingSchedule && schedule && <SchedulePanel schedule={schedule} />}
        {!isLoadingSchedule && !schedule && <EmptySchedule />}
      </div>
    </PageContainer>
  )
}
