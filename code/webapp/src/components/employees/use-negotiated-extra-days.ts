import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { negotiatedExtraDayApi } from '@/services/negotiated-extra-day-api'
import type { ListExtraDaysFilters, NegotiatedExtraDay } from '@/types/negotiated-extra-day'

function monthBounds(): { monthStart: string; monthEnd: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    monthStart: `${y}-${m}-01`,
    monthEnd: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function tomorrowIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function useNegotiatedExtraDays(employeeId: string) {
  const { monthStart, monthEnd } = useMemo(monthBounds, [])
  const tomorrow = useMemo(tomorrowIso, [])

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
