// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMarkDayStatus } from '@/services/attendance-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    today: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
    checkOut: vi.fn(),
    closeDay: vi.fn(),
    overtimeDecision: vi.fn(),
    markDayStatus: vi.fn(),
  },
}))

import { attendanceApi } from '@/services/attendance-api'

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

const mockDayOffResponse = {
  data: {
    status: 201,
    data: {
      id: 'att-001',
      employee_id: 'emp-001',
      date: '2026-04-12',
      day_status: 'DAY_OFF',
      check_in: null,
      check_out: null,
    },
  },
}

const mockAbsenceResponse = {
  data: {
    status: 201,
    data: {
      id: 'att-002',
      employee_id: 'emp-001',
      date: '2026-04-12',
      day_status: 'ABSENCE',
      check_in: null,
      check_out: null,
    },
  },
}

afterEach(() => {
  vi.clearAllMocks()
})

// ── useMarkDayStatus ───────────────────────────────────────────────────────────

describe('useMarkDayStatus', () => {
  it('calls attendanceApi.markDayStatus with correct payload for DAY_OFF', async () => {
    vi.mocked(attendanceApi.markDayStatus).mockResolvedValue(mockDayOffResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMarkDayStatus(), { wrapper })

    await act(async () => {
      result.current.mutate({
        employee_id: 'emp-001',
        date: '2026-04-12',
        day_status: 'DAY_OFF',
      })
    })

    expect(attendanceApi.markDayStatus).toHaveBeenCalledWith({
      employee_id: 'emp-001',
      date: '2026-04-12',
      day_status: 'DAY_OFF',
    })
  })

  it('shows success toast with "descanso" label when DAY_OFF succeeds', async () => {
    vi.mocked(attendanceApi.markDayStatus).mockResolvedValue(mockDayOffResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMarkDayStatus(), { wrapper })

    await act(async () => {
      result.current.mutate({
        employee_id: 'emp-001',
        date: '2026-04-12',
        day_status: 'DAY_OFF',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      expect.stringContaining('descanso'),
      'Día marcado',
    )
  })

  it('shows success toast with "falta" label when ABSENCE succeeds', async () => {
    vi.mocked(attendanceApi.markDayStatus).mockResolvedValue(mockAbsenceResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMarkDayStatus(), { wrapper })

    await act(async () => {
      result.current.mutate({
        employee_id: 'emp-001',
        date: '2026-04-12',
        day_status: 'ABSENCE',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      expect.stringContaining('falta'),
      'Día marcado',
    )
  })

  it('shows error toast when mutation fails', async () => {
    vi.mocked(attendanceApi.markDayStatus).mockRejectedValue(new Error('Server error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMarkDayStatus(), { wrapper })

    await act(async () => {
      result.current.mutate({
        employee_id: 'emp-001',
        date: '2026-04-12',
        day_status: 'DAY_OFF',
      })
    })

    expect(mockShowError).toHaveBeenCalled()
  })
})
