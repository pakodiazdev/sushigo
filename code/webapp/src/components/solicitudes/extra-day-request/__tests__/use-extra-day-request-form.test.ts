// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

const mockWageHistory = vi.fn()

vi.mock('@/services/employee-hooks', () => ({
  useWageHistory: (id: string) => mockWageHistory(id),
}))

vi.mock('@/services/employee-request-hooks', () => ({
  useRequestExtraDay: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

import { useExtraDayRequestForm } from '../use-extra-day-request-form'

// ── Wrapper ────────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useExtraDayRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWageHistory.mockReturnValue({ data: undefined, isLoading: false })
  })

  it('hasNoWage is true when not loading and no wage data', () => {
    mockWageHistory.mockReturnValue({ data: undefined, isLoading: false })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.hasNoWage).toBe(true)
  })

  it('hasNoWage is false while loading', () => {
    mockWageHistory.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.hasNoWage).toBe(false)
  })

  it('hasNoWage is false when wage data is present', () => {
    mockWageHistory.mockReturnValue({
      data: [{ hourly_rate: '50.00', weekly_scheduled_hours: 48 }],
      isLoading: false,
    })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.hasNoWage).toBe(false)
  })

  it('calculates registeredDailyWage from hourly_rate * (weekly_hours / 6)', () => {
    // hourly_rate=50, weekly_hours=48 → daily_hours=8 → daily_wage=400
    mockWageHistory.mockReturnValue({
      data: [{ hourly_rate: '50.00', weekly_scheduled_hours: 48 }],
      isLoading: false,
    })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.registeredDailyWage).toBeCloseTo(400)
  })

  it('defaults prima to registeredDailyWage * 1 (100% prima_pct default)', () => {
    mockWageHistory.mockReturnValue({
      data: [{ hourly_rate: '50.00', weekly_scheduled_hours: 48 }],
      isLoading: false,
    })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    // prima = 100% of 400 = 400
    expect(result.current.prima).toBeCloseTo(400)
  })

  it('total = salaryDay + seventhDay + prima', () => {
    // daily=400, seventh=400, prima=400 → total=1200
    mockWageHistory.mockReturnValue({
      data: [{ hourly_rate: '50.00', weekly_scheduled_hours: 48 }],
      isLoading: false,
    })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.total).toBeCloseTo(1200)
  })

  it('registeredDailyWage is 0 when no wage data', () => {
    mockWageHistory.mockReturnValue({ data: undefined, isLoading: false })
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', vi.fn()), { wrapper })
    expect(result.current.registeredDailyWage).toBe(0)
    expect(result.current.prima).toBe(0)
    expect(result.current.total).toBe(0)
  })

  it('calls mutateAsync on valid submit and invokes onSuccess', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    mockWageHistory.mockReturnValue({
      data: [{ hourly_rate: '50.00', weekly_scheduled_hours: 48 }],
      isLoading: false,
    })

    const onSuccess = vi.fn()
    const { result } = renderHook(() => useExtraDayRequestForm('emp-1', onSuccess), { wrapper })

    // Set a future date (well beyond today)
    act(() => {
      result.current.form.setValue('date', '2099-12-31')
      result.current.form.setValue('prima_pct', 100)
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledOnce()
    })

    const call = mockMutateAsync.mock.calls[0]
    expect(call).toBeDefined()
    const payload = call![0]
    expect(payload.type).toBe('EXTRA_DAY')
    expect(payload.auto_approve).toBe(false)
    expect(payload.payload.date).toBe('2099-12-31')
    expect(payload.payload.salary_pct).toBe(100)
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
