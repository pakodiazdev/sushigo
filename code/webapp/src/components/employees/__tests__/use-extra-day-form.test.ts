// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn()
const mockUseCreateEmployeeRequest = vi.fn()
const mockUseWageHistory = vi.fn()

vi.mock('@/services/employee-hooks', () => ({
  useWageHistory: (...args: unknown[]) => mockUseWageHistory(...args),
}))

vi.mock('@/services/employee-request-hooks', () => ({
  useCreateEmployeeRequest: () => mockUseCreateEmployeeRequest(),
}))

import { useExtraDayForm } from '../use-extra-day-form'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWage(hourlyRate: string, weeklyHours: number) {
  return { hourly_rate: hourlyRate, weekly_scheduled_hours: weeklyHours }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useExtraDayForm — wage calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateEmployeeRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
  })

  it('computes registeredDailyWage from hourly_rate × (weeklyHours / 6)', () => {
    // 100/hr × (48h/6) = 100 × 8 = 800
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.registeredDailyWage).toBeCloseTo(800)
  })

  it('sets registeredDailyWage to 0 when no wage history', () => {
    mockUseWageHistory.mockReturnValue({ data: [], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.registeredDailyWage).toBe(0)
  })

  it('sets hasNoWage=true when no wage and not loading', () => {
    mockUseWageHistory.mockReturnValue({ data: [], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.hasNoWage).toBe(true)
  })

  it('sets hasNoWage=false when wage exists', () => {
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.hasNoWage).toBe(false)
  })

  it('sets hasNoWage=false while wages are loading', () => {
    mockUseWageHistory.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.hasNoWage).toBe(false)
  })

  it('computes total = salaryDay + seventhDay + prima (registered, legal)', () => {
    // dailyWage = 100 × (48/6) = 800
    // salaryDay = 800, seventhDay = 800, prima = 800 (100%), total = 2400
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    expect(result.current.salaryDay).toBeCloseTo(800)
    expect(result.current.seventhDay).toBeCloseTo(800)
    expect(result.current.prima).toBeCloseTo(800)
    expect(result.current.total).toBeCloseTo(2400)
  })

  it('uses custom salary_pct when salary_type is custom', async () => {
    // dailyWage = 800, salary_pct=50 → salaryDay = 400
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('salary_type', 'custom')
      result.current.form.setValue('salary_pct', 50)
    })

    await waitFor(() => expect(result.current.salaryDay).toBeCloseTo(400))
  })

  it('uses custom prima_pct when prima_type is custom', async () => {
    // dailyWage = 800, prima_pct=50 → prima = 400
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('prima_type', 'custom')
      result.current.form.setValue('prima_pct', 50)
    })

    await waitFor(() => expect(result.current.prima).toBeCloseTo(400))
  })
})

describe('useExtraDayForm — submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWageHistory.mockReturnValue({ data: [makeWage('100', 48)], isLoading: false })
    mockUseCreateEmployeeRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
  })

  it('calls mutateAsync with correct payload on submit', async () => {
    mockMutateAsync.mockResolvedValue({})
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useExtraDayForm('emp-1', onSuccess), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('date', '2026-04-25')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: 'emp-1',
        type: 'EXTRA_DAY',
        auto_approve: true,
        payload: expect.objectContaining({
          date: '2026-04-25',
          salary_pct: 100,
          prima_pct: 100,
        }),
      }),
    )
  })

  it('calls onSuccess and resets form after successful submission', async () => {
    mockMutateAsync.mockResolvedValue({})
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useExtraDayForm('emp-1', onSuccess), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('date', '2026-04-25')
      result.current.form.setValue('notes', 'Acuerdo verbal')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    // form should be reset — notes back to default
    expect(result.current.form.getValues('notes')).toBe('')
  })

  it('does not call onSuccess when mutation rejects', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'))
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useExtraDayForm('emp-1', onSuccess), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('date', '2026-04-25')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('uses effectiveSalaryPct=100 when salary_type=registered regardless of salary_pct value', async () => {
    mockMutateAsync.mockResolvedValue({})

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('date', '2026-04-25')
      result.current.form.setValue('salary_type', 'registered')
      result.current.form.setValue('salary_pct', 50) // stale hidden value
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ salary_pct: 100 }) }),
    )
  })

  it('uses effectivePrimaPct=100 when prima_type=legal regardless of prima_pct value', async () => {
    mockMutateAsync.mockResolvedValue({})

    const { result } = renderHook(() => useExtraDayForm('emp-1', vi.fn()), { wrapper: createWrapper() })

    act(() => {
      result.current.form.setValue('date', '2026-04-25')
      result.current.form.setValue('prima_type', 'legal')
      result.current.form.setValue('prima_pct', 75) // stale hidden value
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ prima_pct: 100 }) }),
    )
  })
})
