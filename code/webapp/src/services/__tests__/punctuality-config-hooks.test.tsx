// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { PunctualityRange } from '@/types/punctuality'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListRanges = vi.fn()
const mockUpdateRanges = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/punctuality-config-api', () => ({
  punctualityConfigApi: {
    listRanges: (...args: unknown[]) => mockListRanges(...args),
    updateRanges: (...args: unknown[]) => mockUpdateRanges(...args),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { usePunctualityRanges, useUpdatePunctualityRanges } from '../punctuality-config-hooks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeRange: PunctualityRange = {
  id: 'abc',
  min_seconds: 0,
  max_seconds: 599,
  bonus_percentage: 100,
  sort_order: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── usePunctualityRanges ──────────────────────────────────────────────────────

describe('usePunctualityRanges', () => {
  it('returns data from listRanges', async () => {
    mockListRanges.mockResolvedValue({ data: { data: [fakeRange] } })
    const { result } = renderHook(() => usePunctualityRanges(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeRange])
  })

  it('starts with data undefined before resolving', () => {
    mockListRanges.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePunctualityRanges(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

// ── useUpdatePunctualityRanges ────────────────────────────────────────────────

describe('useUpdatePunctualityRanges', () => {
  const payload = { ranges: [{ min_seconds: 0, bonus_percentage: 100 }] }

  it('calls punctualityConfigApi.updateRanges with the payload', async () => {
    mockUpdateRanges.mockResolvedValue({ data: { data: [fakeRange] } })
    const { result } = renderHook(() => useUpdatePunctualityRanges(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateRanges).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on success', async () => {
    mockUpdateRanges.mockResolvedValue({ data: { data: [fakeRange] } })
    const { result } = renderHook(() => useUpdatePunctualityRanges(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Rangos de puntualidad actualizados.',
      'Puntualidad',
    )
  })

  it('shows error toast on failure', async () => {
    mockUpdateRanges.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useUpdatePunctualityRanges(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useUpdatePunctualityRanges(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
