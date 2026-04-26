import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { negotiatedExtraDayApi } from '@/services/negotiated-extra-day-api'
import type { ListExtraDaysFilters } from '@/types/negotiated-extra-day'

export function useNegotiatedExtraDays(employeeId: string) {
  const [filters, setFilters] = useState<ListExtraDaysFilters>({})

  const query = useQuery({
    queryKey: ['negotiated-extra-days', employeeId, filters],
    queryFn: () => negotiatedExtraDayApi.list(employeeId, filters),
    enabled: !!employeeId,
  })

  return {
    extraDays: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    filters,
    setFilters,
  }
}
