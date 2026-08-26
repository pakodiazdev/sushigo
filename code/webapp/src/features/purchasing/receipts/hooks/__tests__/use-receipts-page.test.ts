/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Receipt } from '../../types'

const draftReceipt: Receipt = {
  id: 'r1',
  status: 'DRAFT',
  reference: 'FAC-0001',
  receipt_date: '2026-08-25',
  notes: null,
  supplier: { id: 's1', code: 'SUP', name: 'Proveedor Uno' },
  destination_location: { id: 'loc1', name: 'Bodega Central' },
  posted_at: null,
  posted_by: null,
  reversed_at: null,
  reversed_by: null,
  reversal_reason: null,
  created_at: '2026-08-25T00:00:00Z',
  updated_at: '2026-08-25T00:00:00Z',
  lines: [],
}

const postedReceipt: Receipt = { ...draftReceipt, id: 'r2', status: 'POSTED', reference: 'FAC-0002' }

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  delete: vi.fn(),
  post: vi.fn(),
  reverse: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({ data: { data: { data: [draftReceipt, postedReceipt] } }, isLoading: false, isError: false }),
  useMutation: (config: {
    mutationFn: (value: unknown) => Promise<unknown>
    onSuccess: (data: unknown, variables: unknown) => void
    onError: (error: unknown) => void
  }) => ({
    mutate: async (value: unknown) => {
      try {
        const data = await config.mutationFn(value)
        config.onSuccess(data, value)
      } catch (error) {
        config.onError(error)
      }
    },
    isPending: false,
  }),
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }),
}))

vi.mock('../../api/receipt-api', () => ({
  receiptApi: { list: vi.fn(), delete: mocks.delete, post: mocks.post, reverse: mocks.reverse },
}))

import { useReceiptsPage } from '../use-receipts-page'

describe('useReceiptsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('filters the loaded receipts client-side by reference/supplier/location', () => {
    const { result } = renderHook(() => useReceiptsPage())

    expect(result.current.receipts).toHaveLength(2)

    act(() => result.current.setSearchQuery('0002'))
    expect(result.current.receipts.map((receipt) => receipt.id)).toEqual(['r2'])
  })

  it('opens the create panel and the detail panel for a row click', () => {
    const { result } = renderHook(() => useReceiptsPage())

    act(() => result.current.handleNewReceipt())
    expect(result.current.panelMode).toBe('create')
    expect(result.current.isPanelOpen).toBe(true)

    act(() => result.current.handleRowClick(draftReceipt))
    expect(result.current.panelMode).toBe('detail')
    expect(result.current.selectedReceipt).toEqual(draftReceipt)
  })

  it('deletes the selected draft and closes the panel on success', async () => {
    mocks.delete.mockResolvedValue({})
    const { result } = renderHook(() => useReceiptsPage())

    act(() => result.current.handleRowClick(draftReceipt))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    expect(mocks.delete).toHaveBeenCalledWith('r1')
    expect(result.current.isPanelOpen).toBe(false)
    expect(mocks.showSuccess).toHaveBeenCalled()
  })

  it('posts the selected draft and shows the returned receipt in detail mode', async () => {
    mocks.post.mockResolvedValue({ data: { data: postedReceipt } })
    const { result } = renderHook(() => useReceiptsPage())

    act(() => result.current.handleRowClick(draftReceipt))
    await act(async () => {
      result.current.handlePost()
      await Promise.resolve()
    })

    expect(mocks.post).toHaveBeenCalledWith('r1')
    expect(result.current.selectedReceipt).toEqual(postedReceipt)
    expect(result.current.panelMode).toBe('detail')
  })

  it('reverses the selected posted receipt with the given reason', async () => {
    const reversedReceipt = { ...postedReceipt, status: 'REVERSED' as const }
    mocks.reverse.mockResolvedValue({ data: { data: reversedReceipt } })
    const { result } = renderHook(() => useReceiptsPage())

    act(() => result.current.handleRowClick(postedReceipt))
    await act(async () => {
      result.current.handleReverse('Recibido por error')
      await Promise.resolve()
    })

    expect(mocks.reverse).toHaveBeenCalledWith('r2', { reason: 'Recibido por error' })
    expect(result.current.selectedReceipt?.status).toBe('REVERSED')
  })

  it('reports an API error via the error toast instead of throwing', async () => {
    mocks.delete.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useReceiptsPage())

    act(() => result.current.handleRowClick(draftReceipt))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    expect(mocks.showError).toHaveBeenCalled()
  })
})
