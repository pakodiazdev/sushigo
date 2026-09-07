/** @vitest-environment jsdom */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Receipt, ReceiptSummary } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/receipt-api', () => ({
  receiptApi: {
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    reverse: vi.fn(),
  },
}))

import { receiptApi } from '../../api/receipt-api'
import { useReceiptsPage } from '../use-receipts-page'

type ListResult = Awaited<ReturnType<typeof receiptApi.list>>
type EntityResult = Awaited<ReturnType<typeof receiptApi.get>>

const summary = (over: Partial<ReceiptSummary> = {}): ReceiptSummary => ({
  id: 'r1',
  status: 'DRAFT',
  reference: 'FAC-0001',
  receipt_date: '2026-08-25',
  notes: null,
  total: 4950,
  supplier: { id: 's1', code: 'SUP', name: 'Proveedor Uno' },
  destination_location: { id: 'loc1', name: 'Bodega Central' },
  posted_at: null,
  reversed_at: null,
  created_at: '2026-08-25T00:00:00Z',
  updated_at: '2026-08-25T00:00:00Z',
  ...over,
})

const fullReceipt = (over: Partial<Receipt> = {}): Receipt => ({
  id: 'r1',
  status: 'DRAFT',
  reference: 'FAC-0001',
  receipt_date: '2026-08-25',
  notes: null,
  supplier: { id: 's1', code: 'SUP', name: 'Proveedor Uno' },
  destination_location: { id: 'loc1', name: 'Bodega Central' },
  lines: [],
  posted_at: null,
  posted_by: null,
  reversed_at: null,
  reversed_by: null,
  reversal_reason: null,
  created_at: '2026-08-25T00:00:00Z',
  updated_at: '2026-08-25T00:00:00Z',
  ...over,
})

function listResult(
  data: ReceiptSummary[],
  meta: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {}
): ListResult {
  return {
    data: {
      status: 200,
      data,
      meta: { current_page: 1, last_page: 1, per_page: 15, total: data.length, ...meta },
    },
  } as unknown as ListResult
}

function entityResult(receipt: Receipt): EntityResult {
  return { data: { status: 200, data: receipt } } as unknown as EntityResult
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useReceiptsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads the current page of receipt summaries and exposes totalPages from meta', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(
      listResult([summary(), summary({ id: 'r2', reference: 'FAC-0002' })], { last_page: 3 })
    )

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.receipts).toHaveLength(2))
    expect(result.current.totalPages).toBe(3)
  })

  it('sends server-side page/status/search params and resets to page 1 when a filter changes', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(receiptApi.list).toHaveBeenCalled())

    act(() => result.current.setCurrentPage(2))
    await waitFor(() =>
      expect(receiptApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    )

    act(() => result.current.setStatusFilter('POSTED'))
    await waitFor(() =>
      expect(receiptApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: 'POSTED' })
      )
    )

    act(() => result.current.setSearchQuery('0002'))
    await waitFor(() =>
      expect(receiptApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: '0002' })
      )
    )
  })

  it('clamps currentPage down when a mutation shrinks the result set below the current page', async () => {
    let lastPage = 3
    vi.mocked(receiptApi.list).mockImplementation(() =>
      Promise.resolve(listResult([summary()], { last_page: lastPage }))
    )
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))
    vi.mocked(receiptApi.post).mockResolvedValue(entityResult(fullReceipt({ status: 'POSTED' })))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.totalPages).toBe(3))

    act(() => result.current.setCurrentPage(3))
    await waitFor(() => expect(result.current.currentPage).toBe(3))

    act(() => result.current.handleRowClick(summary()))
    lastPage = 1
    await act(async () => {
      result.current.handlePost()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.currentPage).toBe(1))
  })

  it('fetches the full receipt from the detail endpoint when a summary row is opened', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    expect(result.current.panelMode).toBe('detail')

    await waitFor(() => expect(receiptApi.get).toHaveBeenCalledWith('r1'))
    await waitFor(() => expect(result.current.selectedReceipt?.id).toBe('r1'))
  })

  it('deletes the selected receipt and closes the panel on success', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))
    vi.mocked(receiptApi.delete).mockResolvedValue({} as Awaited<ReturnType<typeof receiptApi.delete>>)

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
    expect(receiptApi.delete).toHaveBeenCalledWith('r1')
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('posts the selected draft and shows the returned receipt in detail mode', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))
    vi.mocked(receiptApi.post).mockResolvedValue(entityResult(fullReceipt({ status: 'POSTED' })))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handlePost()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.selectedReceipt?.status).toBe('POSTED'))
    expect(result.current.panelMode).toBe('detail')
  })

  it('reverses the selected posted receipt with the given reason', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary({ status: 'POSTED' })]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt({ status: 'POSTED' })))
    vi.mocked(receiptApi.reverse).mockResolvedValue(entityResult(fullReceipt({ status: 'REVERSED' })))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary({ status: 'POSTED' })))
    await act(async () => {
      result.current.handleReverse('Recibido por error')
      await Promise.resolve()
    })

    expect(receiptApi.reverse).toHaveBeenCalledWith('r1', { reason: 'Recibido por error' })
    await waitFor(() => expect(result.current.selectedReceipt?.status).toBe('REVERSED'))
  })

  it('invalidates the Stock, assignment and movement read models after posting (#572)', async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')

    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))
    vi.mocked(receiptApi.post).mockResolvedValue(entityResult(fullReceipt({ status: 'POSTED' })))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handlePost()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.selectedReceipt?.status).toBe('POSTED'))

    const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) =>
      JSON.stringify((arg as { queryKey: unknown[] })?.queryKey)
    )
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-all']))
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-by-location']))
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-by-variant']))
    expect(invalidatedKeys).toContain(JSON.stringify(['variant-assignments']))
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-movements']))

    invalidateSpy.mockRestore()
  })

  it('reports an API error via the error toast instead of throwing', async () => {
    vi.mocked(receiptApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(receiptApi.get).mockResolvedValue(entityResult(fullReceipt()))
    vi.mocked(receiptApi.delete).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useReceiptsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.receipts).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })
})
