import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { usePendingRequests } from '@/services/employee-request-hooks'
import type { EmployeeRequest } from '@/types/employee-request'
import { PendingRequestCard } from './pending-request-card'
import { ReviewRequestDialog } from './review-request-dialog'

export function PendingRequestsList() {
  const { data: requests, isLoading, isError } = usePendingRequests()
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null)

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
        No se pudieron cargar las solicitudes pendientes. Intenta de nuevo.
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Sin solicitudes pendientes de aprobación.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => (
          <PendingRequestCard
            key={request.id}
            request={request}
            onReview={setSelectedRequest}
          />
        ))}
      </div>

      <ReviewRequestDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </>
  )
}
