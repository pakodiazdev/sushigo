// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAssignmentForm } from '../use-assignment-form'
import type { PriceListAssignment } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  priceListAssignmentApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { priceListAssignmentApi } from '../../api/pricing-api'

const existingAssignment: PriceListAssignment = {
  id: 'pla-1',
  price_list_id: 'pl-1',
  branch_id: 1,
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

function submit(handleSubmit: unknown, onSubmit: unknown) {
  return act(async () => {
    await (handleSubmit as (fn: unknown) => (e?: unknown) => void)(onSubmit)({ preventDefault: () => {} })
  })
}

describe('useAssignmentForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends the fixed priceListId alongside the form values on create', async () => {
    vi.mocked(priceListAssignmentApi.create).mockResolvedValue({
      data: { status: 201, data: { ...existingAssignment, id: 'pla-2' } },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAssignmentForm({ priceListId: 'pl-1', onSuccess }), { wrapper })

    act(() => {
      result.current.setValue('branch_id', 2)
      result.current.setValue('effective_from', '2026-02-01')
    })

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() =>
      expect(priceListAssignmentApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ price_list_id: 'pl-1', branch_id: 2, effective_from: '2026-02-01' })
      )
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it('omits branch_id from the update payload', async () => {
    vi.mocked(priceListAssignmentApi.update).mockResolvedValue({
      data: { status: 200, data: existingAssignment },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useAssignmentForm({ priceListId: 'pl-1', assignment: existingAssignment, onSuccess: vi.fn() }),
      { wrapper }
    )

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() => expect(priceListAssignmentApi.update).toHaveBeenCalled())
    const payload = vi.mocked(priceListAssignmentApi.update).mock.calls[0]![1]
    expect(payload).not.toHaveProperty('branch_id')
    expect(payload).not.toHaveProperty('price_list_id')
  })

  it('surfaces a price_list_id conflict as conflictError, not a field error', async () => {
    const conflictResponse = {
      status: 422,
      data: { errors: { price_list_id: ['Ya existe una asignación activa con la misma prioridad...'] } },
    }
    vi.mocked(priceListAssignmentApi.create).mockRejectedValue(
      new AxiosError('Validation failed', '422', undefined, undefined, conflictResponse as never)
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAssignmentForm({ priceListId: 'pl-1', onSuccess: vi.fn() }), {
      wrapper,
    })

    act(() => {
      result.current.setValue('branch_id', 1)
      result.current.setValue('effective_from', '2026-01-01')
    })

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() => expect(result.current.conflictError).toContain('Ya existe una asignación activa'))
    expect(result.current.allErrors.branch_id).toBeUndefined()
  })

  it('deletes the assignment and calls onDeleted after confirmation', async () => {
    vi.mocked(priceListAssignmentApi.delete).mockResolvedValue({ data: { status: 200 } } as never)
    const onDeleted = vi.fn()
    vi.stubGlobal('confirm', () => true)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useAssignmentForm({ priceListId: 'pl-1', assignment: existingAssignment, onSuccess: vi.fn(), onDeleted }),
      { wrapper }
    )

    await act(async () => result.current.handleDelete())

    expect(priceListAssignmentApi.delete).toHaveBeenCalledWith('pla-1')
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    vi.unstubAllGlobals()
  })

  it('does not delete when the confirmation is declined', async () => {
    const onDeleted = vi.fn()
    vi.stubGlobal('confirm', () => false)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useAssignmentForm({ priceListId: 'pl-1', assignment: existingAssignment, onSuccess: vi.fn(), onDeleted }),
      { wrapper }
    )

    await act(async () => result.current.handleDelete())

    expect(priceListAssignmentApi.delete).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
