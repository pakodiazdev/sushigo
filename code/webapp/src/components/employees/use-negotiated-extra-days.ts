import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { negotiatedExtraDayApi } from '@/services/negotiated-extra-day-api'
import type { ListExtraDaysFilters, NegotiatedExtraDay } from '@/types/negotiated-extra-day'
import { todayDateCdmx } from '@/lib/datetime'
import { addDays } from '@/lib/week'
import { useBusinessDate } from '@/stores/clock.store'

function monthBounds(today: string): { monthStart: string; monthEnd: string } {
  const [y, m] = today.split('-') as [string, string]
  const lastDay = new Date(Number(y), Number(m), 0).getDate()
  return {
    monthStart: `${y}-${m}-01`,
    monthEnd: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function tomorrowIso(today: string): string {
  return addDays(today, 1)
}

export function useNegotiatedExtraDays(employeeId: string) {
  const businessDate = useBusinessDate()
  const today = businessDate ?? todayDateCdmx()
  const { monthStart, monthEnd } = useMemo(() => monthBounds(today), [today])
  const tomorrow = useMemo(() => tomorrowIso(today), [today])

  const [showHistory, setShowHistory] = useState(false)
  const [historyFilters, setHistoryFilters] = useState<ListExtraDaysFilters>({})

  // Summary queries — always active when the panel is open
  const monthQuery = useQuery({
    queryKey: ['negotiated-extra-days', employeeId, 'month', monthStart, monthEnd],
    queryFn: () => negotiatedExtraDayApi.list(employeeId, { date_from: monthStart, date_to: monthEnd, per_page: 100 }),
    enabled: !!employeeId,
  })

  const upcomingQuery = useQuery({
    queryKey: ['negotiated-extra-days', employeeId, 'upcoming', tomorrow],
    queryFn: () => negotiatedExtraDayApi.list(employeeId, { date_from: tomorrow, per_page: 5 }),
    enabled: !!employeeId,
  })

  // History query — loads only when dialog is open
  const historyQuery = useQuery({
    queryKey: ['negotiated-extra-days', employeeId, 'history', historyFilters],
    queryFn: () => negotiatedExtraDayApi.list(employeeId, { ...historyFilters, per_page: 15 }),
    enabled: !!employeeId && showHistory,
  })

  const thisMonthDays: NegotiatedExtraDay[] = monthQuery.data?.data ?? []
  const upcomingDays: NegotiatedExtraDay[] = upcomingQuery.data?.data ?? []

  return {
    // Summary stats
    thisMonthCount: thisMonthDays.length,
    upcomingCount: upcomingDays.length,
    upcomingDays,
    isLoadingSummary: monthQuery.isLoading || upcomingQuery.isLoading,

    // History dialog
    showHistory,
    openHistory: () => setShowHistory(true),
    closeHistory: () => setShowHistory(false),
    historyExtraDays: historyQuery.data?.data ?? [],
    historyMeta: historyQuery.data?.meta,
    historyIsLoading: historyQuery.isLoading,
    historyFilters,
    setHistoryFilters,
  }
}
