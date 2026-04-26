// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCancel = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/negotiated-extra-day-api', () => ({
  negotiatedExtraDayApi: {
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useCancelNegotiatedExtraDay } from '../negotiated-extra-day-hooks'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCancelNegotiatedExtraDay', () => {
  it('calls negotiatedExtraDayApi.cancel with the given id', async () => {
    mockCancel.mockResolvedValue(undefined)
    const { result } = renderHook(() => useCancelNegotiatedExtraDay(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate('ned-1') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCancel).toHaveBeenCalledWith('ned-1')
  })

  it('shows success toast after cancellation', async () => {
    mockCancel.mockResolvedValue(undefined)
    const { result } = renderHook(() => useCancelNegotiatedExtraDay(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate('ned-1') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'El día extra ha sido cancelado.',
      'Día extra cancelado',
    )
  })

  it('shows error toast when cancellation fails', async () => {
    mockCancel.mockRejectedValue(new Error('Server error'))
    const { result } = renderHook(() => useCancelNegotiatedExtraDay(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate('ned-bad') })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending = false', () => {
    const { result } = renderHook(() => useCancelNegotiatedExtraDay(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
