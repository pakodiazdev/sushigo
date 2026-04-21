// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

const mockRegister = vi.fn()
vi.mock('@/services/negotiated-extra-day-api', () => ({
  negotiatedExtraDayApi: { register: (...args: unknown[]) => mockRegister(...args) },
}))

afterEach(() => {
  vi.clearAllMocks()
})

import { useExtraDayExpress } from '../use-extra-day-express'
import type { RegisterExtraDayPayload } from '@/types/negotiated-extra-day'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  // Spy on invalidateQueries so we can assert it was called
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(mockInvalidateQueries as never)

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const payload: RegisterExtraDayPayload = {
  employee_id: 'emp-001',
  date: '2026-04-20',
  agreed_daily_wage: 200,
  prima_percent: 100,
  notes: 'test',
}

const mockExtraDay = {
  id: 'ned-001',
  employee_id: 'emp-001',
  branch_id: 1,
  date: '2026-04-20',
  agreed_daily_wage: 200,
  prima_percent: 100,
  prima_amount: 200,
  approved_by: 'usr-001',
  status: 'APPROVED' as const,
  notes: 'test',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useExtraDayExpress', () => {
  it('calls negotiatedExtraDayApi.register with the given payload', async () => {
    mockRegister.mockResolvedValueOnce(mockExtraDay)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    await act(async () => {
      result.current.mutate(payload)
    })

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(payload))
  })

  it('invalidates today attendance queries on success', async () => {
    mockRegister.mockResolvedValueOnce(mockExtraDay)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    await act(async () => {
      result.current.mutate(payload)
    })

    await waitFor(() =>
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['attendances', 'today'] }),
      ),
    )
  })

  it('shows success toast on success', async () => {
    mockRegister.mockResolvedValueOnce(mockExtraDay)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    await act(async () => {
      result.current.mutate(payload)
    })

    await waitFor(() =>
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Día extra'),
        expect.any(String),
      ),
    )
  })

  it('shows error toast on failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    await act(async () => {
      result.current.mutate(payload)
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })

  it('does not show success toast on failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    await act(async () => {
      result.current.mutate(payload)
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it('isPending is true while mutation is in flight', async () => {
    let resolve!: (v: unknown) => void
    mockRegister.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExtraDayExpress(), { wrapper })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isPending).toBe(true))

    await act(async () => { resolve(mockExtraDay) })
  })
})
