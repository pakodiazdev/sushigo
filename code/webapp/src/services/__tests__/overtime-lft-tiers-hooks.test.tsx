// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { OvertimeLftTier } from '@/types/attendance-payroll'

const mockList = vi.fn()
const mockUpdate = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/overtime-lft-tiers-api', () => ({
  overtimeLftTiersApi: {
    list: (...args: unknown[]) => mockList(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useOvertimeLftTiers, useUpdateOvertimeLftTiers } from '../overtime-lft-tiers-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeTier: OvertimeLftTier = { id: 'abc', factor: 2, up_to_hours: 9, sort_order: 1 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOvertimeLftTiers', () => {
  it('returns data from list', async () => {
    mockList.mockResolvedValue({ data: { data: [fakeTier] } })
    const { result } = renderHook(() => useOvertimeLftTiers(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeTier])
  })

  it('starts with data undefined before resolving', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useOvertimeLftTiers(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpdateOvertimeLftTiers', () => {
  const payload = { tiers: [{ factor: 2, up_to_hours: null }] }

  it('calls overtimeLftTiersApi.update with the payload', async () => {
    mockUpdate.mockResolvedValue({ data: { data: [fakeTier] } })
    const { result } = renderHook(() => useUpdateOvertimeLftTiers(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on success', async () => {
    mockUpdate.mockResolvedValue({ data: { data: [fakeTier] } })
    const { result } = renderHook(() => useUpdateOvertimeLftTiers(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('Tramos de horas extra actualizados.', 'Horas extra')
  })

  it('shows error toast on failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useUpdateOvertimeLftTiers(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useUpdateOvertimeLftTiers(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
