import { useQuery } from '@tanstack/react-query'

export interface SuggestedCodeResponse {
  code: string
  prefix: string
}

export interface UseSuggestedCodeResult {
  /** The code currently proposed by the server, or `undefined` while it loads. */
  suggestedCode: string | undefined
  prefix: string | undefined
  isLoading: boolean
  isRefreshing: boolean
  isError: boolean
  /** Explicitly ask the server for a fresh suggestion. */
  refresh: () => void
}

/**
 * Reusable controller for the "server proposes the next sequential code" pattern
 * (Supplier creation #497, later Cash Registers #498). Wraps a next-code endpoint
 * query with a manual refresh and derived loading flags; callers own prefill and
 * collision handling.
 */
export function useSuggestedCode(
  queryKey: readonly unknown[],
  fetcher: () => Promise<SuggestedCodeResponse>,
  enabled: boolean,
): UseSuggestedCodeResult {
  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: 0,
  })

  return {
    suggestedCode: query.data?.code,
    prefix: query.data?.prefix,
    isLoading: query.isLoading && enabled,
    isRefreshing: query.isFetching,
    isError: query.isError,
    refresh: () => {
      void query.refetch()
    },
  }
}
