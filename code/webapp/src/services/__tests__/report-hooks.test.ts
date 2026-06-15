// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'
import { useTodayReport } from '@/services/report.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const mockTodayReportResponse = {
  data: {
    status: 200,
    data: {
      summary: {
        total_employees: 2,
        arrived: 1,
        not_arrived: 1,
        late_count: 0,
      },
      employees: [
        {
          employee_id: 'emp-001',
          name: 'Carlos Mendoza',
          code: 'EMP-001',
          role: 'cook',
          status: 'arrived',
          check_in_time: '2026-06-14T09:00:00Z',
          late_minutes: null,
          has_overtime: false,
          overtime_authorized: false,
        },
        {
          employee_id: 'emp-002',
          name: 'María García',
          code: 'EMP-002',
          role: 'kitchen-assistant',
          status: 'not_arrived',
          check_in_time: null,
          late_minutes: null,
          has_overtime: false,
          overtime_authorized: false,
        },
      ],
    },
  },
}

// ── useTodayReport ─────────────────────────────────────────────────────────────

describe('useTodayReport', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue(mockTodayReportResponse as never)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined data when branchId is null (query disabled)', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReport(null), { wrapper })

    expect(result.current.data).toBeUndefined()
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('fetches today report when branchId is provided', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReport(5), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(apiClient.get).toHaveBeenCalledWith('/reports/today', {
      params: { branch_id: 5 },
    })
    expect(result.current.data?.summary.total_employees).toBe(2)
    expect(result.current.data?.employees).toHaveLength(2)
  })

  it('returns correct summary totals', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReport(1), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const summary = result.current.data?.summary
    expect(summary?.total_employees).toBe(2)
    expect(summary?.arrived).toBe(1)
    expect(summary?.not_arrived).toBe(1)
    expect(summary?.late_count).toBe(0)
  })

  it('returns employee list with expected fields', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayReport(1), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const employees = result.current.data?.employees ?? []
    expect(employees[0]!.employee_id).toBe('emp-001')
    expect(employees[0]!.status).toBe('arrived')
    expect(employees[1]!.status).toBe('not_arrived')
  })
})
