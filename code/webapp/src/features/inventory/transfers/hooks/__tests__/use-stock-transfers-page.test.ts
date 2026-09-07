/** @vitest-environment jsdom */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StockTransfer, StockTransferSummary } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/stock-transfer-api', () => ({
  stockTransferApi: {
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    reverse: vi.fn(),
  },
}))

import { stockTransferApi } from '../../api/stock-transfer-api'
import { useStockTransfersPage } from '../use-stock-transfers-page'

type ListResult = Awaited<ReturnType<typeof stockTransferApi.list>>
type EntityResult = Awaited<ReturnType<typeof stockTransferApi.get>>

const summary = (over: Partial<StockTransferSummary> = {}): StockTransferSummary => ({
  id: 'tr1',
  status: 'DRAFT',
  reference: 'TR-0001',
  transfer_date: '2026-09-05',
  notes: null,
  line_count: 1,
  source_location: { id: 'src', name: 'Bodega' },
  destination_location: { id: 'dst', name: 'Cocina' },
  posted_at: null,
  reversed_at: null,
  created_at: '2026-09-05T00:00:00Z',
  updated_at: '2026-09-05T00:00:00Z',
  ...over,
})

const fullTransfer = (over: Partial<StockTransfer> = {}): StockTransfer => ({
  id: 'tr1',
  status: 'DRAFT',
  reference: 'TR-0001',
  transfer_date: '2026-09-05',
  notes: null,
  can_mutate: true,
  source_location: { id: 'src', name: 'Bodega' },
  destination_location: { id: 'dst', name: 'Cocina' },
  lines: [],
  posted_at: null,
  posted_by: null,
  reversed_at: null,
  reversed_by: null,
  reversal_reason: null,
  created_at: '2026-09-05T00:00:00Z',
  updated_at: '2026-09-05T00:00:00Z',
  ...over,
})

function listResult(
  data: StockTransferSummary[],
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

function entityResult(transfer: StockTransfer): EntityResult {
  return { data: { status: 200, data: transfer } } as unknown as EntityResult
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useStockTransfersPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads the current page of summaries and exposes totalPages from meta', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(
      listResult([summary(), summary({ id: 'tr2', reference: 'TR-0002' })], { last_page: 3 })
    )

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.transfers).toHaveLength(2))
    expect(result.current.totalPages).toBe(3)
  })

  it('sends page/status/search params and resets to page 1 when a filter changes', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(stockTransferApi.list).toHaveBeenCalled())

    act(() => result.current.setCurrentPage(2))
    await waitFor(() =>
      expect(stockTransferApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    )

    act(() => result.current.setStatusFilter('POSTED'))
    await waitFor(() =>
      expect(stockTransferApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: 'POSTED' })
      )
    )

    act(() => result.current.setSearchQuery('0002'))
    await waitFor(() =>
      expect(stockTransferApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: '0002' })
      )
    )
  })

  it('clamps currentPage down when a mutation shrinks the result set', async () => {
    let lastPage = 3
    vi.mocked(stockTransferApi.list).mockImplementation(() =>
      Promise.resolve(listResult([summary()], { last_page: lastPage }))
    )
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))
    vi.mocked(stockTransferApi.post).mockResolvedValue(entityResult(fullTransfer({ status: 'POSTED' })))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
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

  it('fetches the full transfer from the detail endpoint when a row is opened', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    expect(result.current.panelMode).toBe('detail')

    await waitFor(() => expect(stockTransferApi.get).toHaveBeenCalledWith('tr1'))
    await waitFor(() => expect(result.current.selectedTransfer?.id).toBe('tr1'))
  })

  it('opens the create panel and toggles edit / cancel-edit', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleNewTransfer())
    expect(result.current.panelMode).toBe('create')
    expect(result.current.isPanelOpen).toBe(true)

    act(() => result.current.handleRowClick(summary()))
    act(() => result.current.handleEdit())
    expect(result.current.panelMode).toBe('edit')

    act(() => result.current.cancelEdit())
    expect(result.current.panelMode).toBe('detail')

    act(() => result.current.closePanel())
    expect(result.current.isPanelOpen).toBe(false)
  })

  it('deletes the selected transfer and closes the panel on success', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))
    vi.mocked(stockTransferApi.delete).mockResolvedValue(
      {} as Awaited<ReturnType<typeof stockTransferApi.delete>>
    )

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
    expect(stockTransferApi.delete).toHaveBeenCalledWith('tr1')
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('posts the selected draft and shows the returned transfer in detail mode', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))
    vi.mocked(stockTransferApi.post).mockResolvedValue(entityResult(fullTransfer({ status: 'POSTED' })))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handlePost()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.selectedTransfer?.status).toBe('POSTED'))
    expect(result.current.panelMode).toBe('detail')
  })

  it('reverses the selected posted transfer with the given reason', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary({ status: 'POSTED' })]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer({ status: 'POSTED' })))
    vi.mocked(stockTransferApi.reverse).mockResolvedValue(
      entityResult(fullTransfer({ status: 'REVERSED' }))
    )

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleRowClick(summary({ status: 'POSTED' })))
    await act(async () => {
      result.current.handleReverse('Registrado por error')
      await Promise.resolve()
    })

    expect(stockTransferApi.reverse).toHaveBeenCalledWith('tr1', { reason: 'Registrado por error' })
    await waitFor(() => expect(result.current.selectedTransfer?.status).toBe('REVERSED'))
  })

  it('reports API errors via the error toast instead of throwing', async () => {
    vi.mocked(stockTransferApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(stockTransferApi.get).mockResolvedValue(entityResult(fullTransfer()))
    vi.mocked(stockTransferApi.delete).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.transfers).toHaveLength(1))

    act(() => result.current.handleRowClick(summary()))
    await act(async () => {
      result.current.handleDelete()
      await Promise.resolve()
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })

  it('surfaces a list-load failure through the error toast', async () => {
    vi.mocked(stockTransferApi.list).mockRejectedValue(new Error('list boom'))

    const { result } = renderHook(() => useStockTransfersPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })
})
