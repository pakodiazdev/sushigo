import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useCanAccess } from '@/hooks/use-can-access'
import { getApiErrorMessage } from '@/lib/api-error'
import { variantAssignmentApi } from '../api/variant-assignment-api'
import { variantAssignmentQueryKeys } from '../api/query-keys'
import type { VariantAssignmentRow, VariantAssignmentState } from '../types'

const PER_PAGE = 50

/**
 * Owns the per-Inventory-Location Variant-assignment panel (#569): the search
 * term, which slice of the catalog is shown (assigned / unassigned / all),
 * whether the viewer may write, the paginated list query, and the assign /
 * unassign mutations. Assigning never creates Stock; unassigning is refused by
 * the API (409) while on-hand or reserved Stock remains — the rejection message
 * is surfaced verbatim through the error toast.
 *
 * The list is fetched page by page (`useInfiniteQuery`) so a location with more
 * than one page of matching variants stays fully browsable via `loadMore`,
 * instead of silently capping at the first page.
 */
export function useLocationVariantAssignments(locationId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const canManage = useCanAccess({ permission: 'stock.manage' })

  const [search, setSearch] = useState('')
  const [state, setState] = useState<VariantAssignmentState>('assigned')

  const listQuery = useInfiniteQuery({
    queryKey: variantAssignmentQueryKeys.list(locationId, state, search),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      variantAssignmentApi.list(locationId, {
        state,
        search: search || undefined,
        per_page: PER_PAGE,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.data.meta
      const lastNumbered = meta.last_page ?? meta.current_page
      return meta.current_page < lastNumbered ? meta.current_page + 1 : undefined
    },
  })

  const rows: VariantAssignmentRow[] = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.data.data) ?? [],
    [listQuery.data]
  )

  const total: number = listQuery.data?.pages[0]?.data.meta.total ?? rows.length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: variantAssignmentQueryKeys.forLocation(locationId) })
    queryClient.invalidateQueries({ queryKey: ['stock-all'] })
    queryClient.invalidateQueries({ queryKey: ['stock-by-location', locationId] })
  }

  const assignMutation = useMutation({
    mutationFn: (variantId: string) => variantAssignmentApi.assign(locationId, variantId),
    onSuccess: () => {
      invalidate()
      showSuccess('Variant assigned to this location', 'Variant Assigned')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to assign the variant'), 'Assign Error')
    },
  })

  const unassignMutation = useMutation({
    mutationFn: (variantId: string) => variantAssignmentApi.unassign(locationId, variantId),
    onSuccess: () => {
      invalidate()
      showSuccess('Variant unassigned from this location', 'Variant Unassigned')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'Failed to unassign the variant. It may still have stock here.'),
        'Unassign Error'
      )
    },
  })

  let pendingVariantId: string | null = null
  if (assignMutation.isPending) {
    pendingVariantId = assignMutation.variables ?? null
  } else if (unassignMutation.isPending) {
    pendingVariantId = unassignMutation.variables ?? null
  }

  return {
    canManage,
    search,
    setSearch,
    state,
    setState,
    rows,
    total,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    hasMore: listQuery.hasNextPage,
    isLoadingMore: listQuery.isFetchingNextPage,
    loadMore: () => listQuery.fetchNextPage(),
    assign: (variantId: string) => canManage && assignMutation.mutate(variantId),
    unassign: (variantId: string) => canManage && unassignMutation.mutate(variantId),
    pendingVariantId,
  }
}
