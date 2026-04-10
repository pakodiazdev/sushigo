import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, CalendarX, ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { useEmployeeSchedulePage } from './-use-employee-schedule-page'
import { SchedulePanel } from './-schedule-panel'
import { EmptySchedule, ScheduleSkeleton } from './-schedule-states'
import { LeaveHistoryPanel } from './-leave-history-panel'

type Tab = 'schedule' | 'leaves'

export const Route = createFileRoute('/attendance/employees/$employeeId/')({
  component: EmployeeSchedulePage,
})

function EmployeeSchedulePage() {
  const { employeeId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<Tab>('schedule')
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'schedule', label: 'Horario', icon: <CalendarDays className="h-4 w-4" /> },
    { key: 'leaves', label: 'Ausencias', icon: <CalendarX className="h-4 w-4" /> },
  ]

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
        description="Detalle del empleado"
      />

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="mt-6 border-b">
        <nav className="-mb-px flex gap-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="mt-6">
        {activeTab === 'schedule' && (
          <>
            {isLoadingSchedule && <ScheduleSkeleton />}
            {!isLoadingSchedule && schedule && <SchedulePanel schedule={schedule} />}
            {!isLoadingSchedule && !schedule && <EmptySchedule />}
          </>
        )}

        {activeTab === 'leaves' && (
          <LeaveHistoryPanel employeeId={employeeId} employee={employee} />
        )}
      </div>
    </PageContainer>
  )
}
