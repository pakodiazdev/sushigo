// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ currentBranch: { id: 5, name: 'Test Branch' } })
  ),
}))

vi.mock('@/services/report.service', () => ({
  useTodayReport: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
  })),
}))

import { useAuthStore } from '@/stores/auth.store'
import { useTodayReport } from '@/services/report.service'
import { useTodayReportPage } from '../use-today-report-page'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { wrapper }
}

const mockReport = {
  summary: { total_employees: 3, arrived: 2, not_arrived: 1, late_count: 1 },
  employees: [
    {
      employee_id: 'emp-001',
      name: 'Carlos Mendoza',
      code: 'EMP-001',
      role: 'cook',
      status: 'arrived' as const,
      check_in_time: '2026-06-14T09:00:00Z',
      late_minutes: null,
      has_overtime: false,
      overtime_authorized: false,
    },
  ],
}

describe('useTodayReportPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns hasBranch true and branchName when branch is selected', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: { id: 5, name: 'Test Branch' } } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReportPage(), { wrapper })

    expect(result.current.hasBranch).toBe(true)
    expect(result.current.branchName).toBe('Test Branch')
  })

  it('returns hasBranch false and branchName null when no branch selected', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: null } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReportPage(), { wrapper })

    expect(result.current.hasBranch).toBe(false)
    expect(result.current.branchName).toBeNull()
  })

  it('returns employees and summary from report data', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: { id: 5, name: 'Test Branch' } } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReportPage(), { wrapper })

    expect(result.current.employees).toHaveLength(1)
    expect(result.current.employees[0]!.name).toBe('Carlos Mendoza')
    expect(result.current.summary.total_employees).toBe(3)
    expect(result.current.summary.arrived).toBe(2)
  })

  it('returns empty state defaults when data is undefined', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: { id: 5, name: 'Test Branch' } } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReportPage(), { wrapper })

    expect(result.current.employees).toEqual([])
    expect(result.current.summary).toEqual({
      total_employees: 0,
      arrived: 0,
      not_arrived: 0,
      late_count: 0,
    })
    expect(result.current.isLoading).toBe(true)
  })

  it('passes branchId from currentBranch to useTodayReport', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: { id: 7, name: 'Branch 7' } } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    renderHook(() => useTodayReportPage(), { wrapper })

    expect(useTodayReport).toHaveBeenCalledWith(7)
  })

  it('passes null branchId when no branch is selected', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: null } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never)

    const { wrapper } = makeWrapper()
    renderHook(() => useTodayReportPage(), { wrapper })

    expect(useTodayReport).toHaveBeenCalledWith(null)
  })

  it('returns isError true when query fails', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ currentBranch: { id: 5, name: 'Test Branch' } } as unknown as Parameters<typeof selector>[0])
    )
    vi.mocked(useTodayReport).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReportPage(), { wrapper })

    expect(result.current.isError).toBe(true)
  })
})
