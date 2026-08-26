import type { AxiosResponse } from 'axios'
import type { PaginatedResponse } from '@/types/inventory'

/**
 * Fetches every page of a paginated list endpoint up front and flattens them into one response,
 * so an item ordered past the first page is never silently unselectable in a select/cascade.
 * Mirrors the "fetch every page" approach first used in use-price-lists.ts.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<AxiosResponse<PaginatedResponse<T>>>
): Promise<AxiosResponse<PaginatedResponse<T>>> {
  const first = await fetchPage(1)
  const lastPage = first.data.meta.last_page ?? 1
  if (lastPage <= 1) return first

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, pageIndex) => fetchPage(pageIndex + 2))
  )

  return {
    ...first,
    data: {
      ...first.data,
      data: [first.data.data, ...rest.map((response) => response.data.data)].flat(),
    },
  }
}
