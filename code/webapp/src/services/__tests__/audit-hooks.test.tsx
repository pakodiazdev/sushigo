// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'

const mockList = vi.fn()

vi.mock('@/services/audit.service', () => ({
  auditApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

import { useAuditLog } from '../audit-hooks'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAuditLog', () => {
  it('calls auditApi.list with the given filters', async () => {
    mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 0 } } })

    const { result } = renderHook(() => useAuditLog({ employee_id: 'emp-1' }), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockList).toHaveBeenCalledWith({ employee_id: 'emp-1' })
  })

  it('returns the response data unwrapped', async () => {
    const payload = { status: 200, data: [{ id: 1 }], meta: { total: 1 } }
    mockList.mockResolvedValue({ data: payload })

    const { result } = renderHook(() => useAuditLog(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
  })

  it('starts in a loading state', () => {
    mockList.mockResolvedValue({ data: { status: 200, data: [], meta: null } })

    const { result } = renderHook(() => useAuditLog(), { wrapper: makeWrapper() })

    expect(result.current.isPending).toBe(true)
  })
})
