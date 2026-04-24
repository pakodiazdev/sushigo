import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { RequestTypeBar } from '@/components/solicitudes/RequestTypeBar'
import { SolicitudesLayout } from '@/components/solicitudes/SolicitudesLayout'
import { ExtraDayRequestForm } from '@/components/solicitudes/extra-day-request/extra-day-request-form'
import { MyRequestsList } from '@/components/solicitudes/my-requests/my-requests-list'
import { useSolicitudesPage } from '@/components/solicitudes/use-solicitudes-page'

export const Route = createFileRoute('/solicitudes')({
  beforeLoad: requirePermission('employee-requests.view'),
  component: SolicitudesPage,
})

export function SolicitudesPage() {
  const {
    isManager,
    activeTab,
    pendingCount,
    onTabChange,
    showExtraDayForm,
    openExtraDayForm,
    closeExtraDayForm,
    myEmployeeId,
  } = useSolicitudesPage()

  const mineContent = myEmployeeId ? (
    <MyRequestsList employeeId={myEmployeeId} />
  ) : (
    <div className="text-sm text-muted-foreground py-8 text-center">
      No hay un empleado vinculado a tu cuenta.
    </div>
  )

  const pendingContent = (
    <div className="text-sm text-muted-foreground py-8 text-center">
      El listado de solicitudes pendientes estará disponible próximamente.
    </div>
  )

  return (
    <PageContainer>
      <PageHeader
        title="Solicitudes"
        description="Gestiona las solicitudes de tu equipo"
      />

      <div className="mt-6">
        <RequestTypeBar onExtraDayClick={openExtraDayForm} />
      </div>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-background pr-3 text-sm text-muted-foreground">Solicitudes</span>
          </div>
        </div>
      </div>

      <SolicitudesLayout
        isManager={isManager}
        activeTab={activeTab}
        pendingCount={pendingCount}
        onTabChange={onTabChange}
        mineContent={mineContent}
        pendingContent={pendingContent}
      />

      {myEmployeeId && (
        <ExtraDayRequestForm
          isOpen={showExtraDayForm}
          onClose={closeExtraDayForm}
          employeeId={myEmployeeId}
        />
      )}
    </PageContainer>
  )
}
