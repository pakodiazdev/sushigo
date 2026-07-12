import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { AuditLogPanel } from '@/components/audit'
import { useAuditLogPage } from './-use-audit-log-page'

export const Route = createFileRoute('/attendance/audit')({
  beforeLoad: requirePermission('audit-logs.view'),
  component: AuditLogPage,
})

export function AuditLogPage() {
  const { employeeId, setEmployeeId, dateFrom, setDateFrom, dateTo, setDateTo, filters } = useAuditLogPage()

  return (
    <PageContainer>
      <PageHeader
        title="Auditoría"
        description="Historial de cambios sobre asistencias y empleados"
      />

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="audit-employee-id" className="mb-1 block text-xs font-medium text-muted-foreground">
              ID de empleado
            </label>
            <Input
              id="audit-employee-id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="public_id del empleado"
              className="w-64"
            />
          </div>
          <div>
            <label htmlFor="audit-date-from" className="mb-1 block text-xs font-medium text-muted-foreground">
              Desde
            </label>
            <Input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label htmlFor="audit-date-to" className="mb-1 block text-xs font-medium text-muted-foreground">
              Hasta
            </label>
            <Input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <AuditLogPanel filters={filters} />
        </div>
      </div>
    </PageContainer>
  )
}
