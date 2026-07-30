import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Calendar } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SessionStatusBadge, TenderTypeBadge } from '@/components/cash/cash-utils'
import { formatDate } from '@/lib/cash-format'
import { formatCurrency } from '@/services/cash-balance-service'
import { useCashSessionDetailPage } from './use-session-detail'
import type { TenderSummary } from '@/types/cash'

export const Route = createFileRoute('/cash/sessions/$sessionId')({
  component: CashSessionDetailPage,
})

function TenderSummaryRow({ item }: Readonly<{ item: TenderSummary }>) {
  const source = item.terminal?.name ?? item.bank_account?.alias

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <TenderTypeBadge type={item.tender_type} />
        {source && <span className="text-sm text-muted-foreground">{source}</span>}
        <span className="text-xs text-muted-foreground">{item.count} movimiento(s)</span>
      </div>
      <span className="font-semibold">{formatCurrency(item.amount)}</span>
    </div>
  )
}

export function CashSessionDetailPage() {
  const { sessionId } = Route.useParams()
  const { session, summary, isLoading, errorMessage } = useCashSessionDetailPage(sessionId)

  return (
    <PageContainer>
      <PageHeader
        title="Detalle de Sesión de Caja"
        description={session ? formatDate(session.operating_date) : 'Cargando sesión...'}
        action={
          <Link to="/cash/registers" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Volver a cajas
          </Link>
        }
      />

      {errorMessage && (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && session && summary && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-6">
              <SessionStatusBadge status={session.status} />
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(session.operating_date)}
              </span>
              {session.cash_register?.branch && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {session.cash_register.branch.name}
                </span>
              )}
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Saldo Actual</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(summary.current_balance)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos ({formatCurrency(summary.total_incomes)})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.incomes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin ingresos registrados</p>
                )}
                {summary.incomes.map((item) => (
                  <TenderSummaryRow key={item.tender_type} item={item} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Egresos ({formatCurrency(summary.total_expenses)})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.expenses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin egresos registrados</p>
                )}
                {summary.expenses.map((item) => (
                  <TenderSummaryRow key={item.tender_type} item={item} />
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  )
}
