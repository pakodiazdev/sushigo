// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePriceListAssignments } from '../use-price-list-assignments'
import type { PriceListAssignment } from '../../types'

const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  priceListAssignmentApi: {
    list: vi.fn(),
  },
}))

import { priceListAssignmentApi } from '../../api/pricing-api'

const forPl1: PriceListAssignment = {
  id: 'pla-1',
  price_list_id: 'pl-1',
  branch_id: 1,
  operating_unit_id: null,
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}
const forPl2: PriceListAssignment = {
  id: 'pla-2',
  price_list_id: 'pl-2',
  branch_id: 2,
  operating_unit_id: null,
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('usePriceListAssignments', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('filters the fetched assignments down to the given price list id', async () => {
    vi.mocked(priceListAssignmentApi.list).mockResolvedValue({
      data: {
        status: 200,
        data: [forPl1, forPl2],
        meta: { current_page: 1, total: 2, last_page: 1 },
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListAssignments('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.assignments).toHaveLength(1))
    expect(result.current.assignments[0]!.id).toBe('pla-1')
  })

  it('fetches every page when the assignment list spans more than one page', async () => {
    vi.mocked(priceListAssignmentApi.list).mockImplementation((params) => {
      const page = params?.page ?? 1
      if (page === 1) {
        return Promise.resolve({
          data: { status: 200, data: [forPl1], meta: { current_page: 1, total: 2, last_page: 2 } },
        } as never)
      }
      return Promise.resolve({
        data: { status: 200, data: [forPl2], meta: { current_page: 2, total: 2, last_page: 2 } },
      } as never)
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListAssignments('pl-2', true), { wrapper })

    await waitFor(() => expect(result.current.assignments).toHaveLength(1))
    expect(result.current.assignments[0]!.id).toBe('pla-2')
    expect(priceListAssignmentApi.list).toHaveBeenCalledTimes(2)
  })

  it('does not fetch while the panel is closed', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => usePriceListAssignments('pl-1', false), { wrapper })
    expect(priceListAssignmentApi.list).not.toHaveBeenCalled()
  })

  it('drives create/edit navigation handlers', async () => {
    vi.mocked(priceListAssignmentApi.list).mockResolvedValue({
      data: { status: 200, data: [forPl1], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListAssignments('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.assignments).toHaveLength(1))

    act(() => result.current.handleNewAssignment())
    expect(result.current.assignmentMode).toBe('create')

    act(() => result.current.handleAssignmentClick(forPl1))
    expect(result.current.assignmentMode).toBe('edit')
    expect(result.current.selectedAssignment).toEqual(forPl1)

    act(() => result.current.handleBackToList())
    expect(result.current.assignmentMode).toBe('list')
    expect(result.current.selectedAssignment).toBeNull()
  })
})
