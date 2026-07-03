import { Loader2 } from 'lucide-react'
import { useMyRequests, useCancelEmployeeRequest } from '@/services/employee-request-hooks'
import { RequestStatusCard } from './request-status-card'

interface MyRequestsListProps {
  readonly employeeId: string
}

export function MyRequestsList({ employeeId }: MyRequestsListProps) {
  const { data: requests, isLoading, isError } = useMyRequests(employeeId)
  const cancelMutation = useCancelEmployeeRequest()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-sm text-destructive">
        No se pudieron cargar las solicitudes. Intenta de nuevo.
      </div>
    )
  }

  const active = requests?.filter((r) => r.status !== 'CANCELLED') ?? []

  if (active.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No tienes solicitudes.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {active.map((request) => (
        <RequestStatusCard
          key={request.id}
          request={request}
          onCancel={(id) => cancelMutation.mutate(id)}
          isCancelling={cancelMutation.isPending && cancelMutation.variables === request.id}
        />
      ))}
    </div>
  )
}
