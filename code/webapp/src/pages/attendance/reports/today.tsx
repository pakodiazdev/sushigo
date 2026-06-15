import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { NoBranchState } from '@/components/attendance'
import { useTodayReportPage } from './use-today-report-page'
import { SummaryCard } from './summary-card'
import { EmployeeTableSection } from './employee-table-section'

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/attendance/reports/today')({
  beforeLoad: requirePermission('reports.today'),
  component: TodayReportPage,
})

// ── Page ──────────────────────────────────────────────────────────────────────

export function TodayReportPage() {
  const { employees, summary, isLoading, isError, hasBranch, branchName } = useTodayReportPage()

  if (!hasBranch) {
    return (
      <PageContainer>
        <NoBranchState />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reporte Operacional de Hoy"
        description={
          branchName
            ? `Sucursal: ${branchName} — actualización automática cada 2 min`
            : 'Actualización automática cada 2 min'
        }
        action={
          isLoading ? <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /> : null
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <SummaryCard label="Total empleados" value={summary.total_employees} />
        <SummaryCard label="Presentes"       value={summary.arrived}         highlight />
        <SummaryCard label="Sin registrar"   value={summary.not_arrived} />
        <SummaryCard label="Con tardanza"    value={summary.late_count} />
      </div>

      {/* Employee table */}
      <EmployeeTableSection isError={isError} isLoading={isLoading} employees={employees} />
    </PageContainer>
  )
}
