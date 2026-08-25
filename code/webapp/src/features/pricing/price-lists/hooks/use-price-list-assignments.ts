import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { priceListAssignmentApi } from '../api/pricing-api'
import { priceListQueryKeys } from '../api/query-keys'
import type { PriceListAssignment } from '../types'

/**
 * Nested state for the embedded Assignments list inside a Price List's detail SlidePanel —
 * mirrors use-product-variants.ts / use-variant-purchase-presentations.ts. 'list' is the
 * normal Price List-detail view (Assignments section embedded inline); 'create'/'edit' each
 * take over the whole panel body/footer until the user goes back. No separate 'detail' state
 * — an Assignment has few enough fields that a row click opens directly into 'edit',
 * mirroring PresentationPanelMode's own precedent.
 */
export type AssignmentPanelMode = 'list' | 'create' | 'edit'

export function usePriceListAssignments(priceListId: string | null, isPanelOpen: boolean) {
  const queryClient = useQueryClient()
  const { showError } = useToast()

  const [assignmentMode, setAssignmentMode] = useState<AssignmentPanelMode>('list')
  const [selectedAssignment, setSelectedAssignment] = useState<PriceListAssignment | null>(null)

  // Reset to the list view on every fresh open — mirrors use-product-variants.ts's own
  // wasPanelOpenRef guard (useLayoutEffect for the same reason: SlidePanel keeps content
  // mounted through its exit animation).
  const wasPanelOpenRef = useRef(false)
  useLayoutEffect(() => {
    if (isPanelOpen && !wasPanelOpenRef.current) {
      setAssignmentMode('list')
      setSelectedAssignment(null)
    }
    wasPanelOpenRef.current = isPanelOpen
  }, [isPanelOpen])

  // ListPriceListAssignmentsController has no price_list_id filter (it scopes to the
  // requesting user's own branch access instead — see that controller) — fetch every page of
  // the user's own assignments and narrow to this Price List client-side, mirroring
  // use-product-variants.ts's own "fetch every page up front" approach for a compact embedded
  // list.
  const assignmentsQuery = useQuery({
    queryKey: priceListQueryKeys.allAssignments(),
    queryFn: async () => {
      const first = await priceListAssignmentApi.list({ per_page: 100, page: 1 })
      const lastPage = first.data.meta.last_page ?? 1
      if (lastPage <= 1) return first

      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          priceListAssignmentApi.list({ per_page: 100, page: index + 2 })
        )
      )

      return {
        ...first,
        data: {
          ...first.data,
          data: [first.data.data, ...rest.map((response) => response.data.data)].flat(),
        },
      }
    },
    enabled: priceListId != null && isPanelOpen,
  })
  const assignments = (assignmentsQuery.data?.data.data ?? []).filter(
    (assignment) => assignment.price_list_id === priceListId
  )

  useEffect(() => {
    if (assignmentsQuery.isError) {
      showError(getApiErrorMessage(assignmentsQuery.error, 'Failed to load assignments'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentsQuery.isError])

  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: priceListQueryKeys.assignments() })
  }

  const handleNewAssignment = () => {
    setSelectedAssignment(null)
    setAssignmentMode('create')
  }

  const handleAssignmentClick = (assignment: PriceListAssignment) => {
    setSelectedAssignment(assignment)
    setAssignmentMode('edit')
  }

  const handleBackToList = () => {
    setSelectedAssignment(null)
    setAssignmentMode('list')
  }

  const handleAssignmentSaved = () => {
    invalidateAssignments()
    setSelectedAssignment(null)
    setAssignmentMode('list')
  }

  return {
    assignments,
    isLoading: assignmentsQuery.isLoading,
    isError: assignmentsQuery.isError,
    assignmentMode,
    selectedAssignment,
    handleNewAssignment,
    handleAssignmentClick,
    handleBackToList,
    handleAssignmentSaved,
  }
}
