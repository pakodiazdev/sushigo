/** @vitest-environment jsdom */
import React from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStockTransferLinePreview } from '../use-stock-transfer-line-preview'

vi.mock('../../api/stock-transfer-api', () => ({
  stockTransferApi: { preview: vi.fn() },
}))

import { stockTransferApi } from '../../api/stock-transfer-api'

const PREVIEW = {
  source_on_hand: 100,
  source_reserved: 15,
  source_available: 85,
  entry_quantity: 25000,
  entry_uom: 'GR',
  base_quantity: 25,
  base_uom: 'KG',
  conversion_applies: true,
  conversion_factor: 0.001,
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return Wrapper
}

describe('useStockTransferLinePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(stockTransferApi.preview).mockResolvedValue({
      data: { status: 200, data: PREVIEW },
    } as never)
  })
  afterEach(() => cleanup())

  it('does not request a preview until source, variant, uom and a positive quantity are all set', async () => {
    const Wrapper = makeWrapper()
    const { result } = renderHook(
      () =>
        useStockTransferLinePreview({
          sourceLocationId: '',
          itemVariantId: '',
          entryUomId: '',
          entryQuantity: 0,
        }),
      { wrapper: Wrapper }
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(stockTransferApi.preview).not.toHaveBeenCalled()
    expect(result.current.preview).toBeUndefined()
  })

  it('requests and returns the preview once every input is present', async () => {
    const Wrapper = makeWrapper()
    const { result } = renderHook(
      () =>
        useStockTransferLinePreview({
          sourceLocationId: 'loc-1',
          itemVariantId: 'var-1',
          entryUomId: 'uom-gr',
          entryQuantity: 25000,
        }),
      { wrapper: Wrapper }
    )

    await waitFor(() => expect(stockTransferApi.preview).toHaveBeenCalledWith({
      source_location_id: 'loc-1',
      item_variant_id: 'var-1',
      entry_uom_id: 'uom-gr',
      entry_quantity: 25000,
    }), { timeout: 2000 })
    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW), { timeout: 2000 })
  })

  it('withholds the loaded preview and reports loading the instant the quantity outpaces the debounce', async () => {
    const Wrapper = makeWrapper()
    const { result, rerender } = renderHook(
      (props: { entryQuantity: number }) =>
        useStockTransferLinePreview({
          sourceLocationId: 'loc-1',
          itemVariantId: 'var-1',
          entryUomId: 'uom-gr',
          entryQuantity: props.entryQuantity,
        }),
      { wrapper: Wrapper, initialProps: { entryQuantity: 25000 } }
    )

    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW), { timeout: 2000 })

    act(() => {
      rerender({ entryQuantity: 30000 })
    })

    expect(result.current.preview).toBeUndefined()
    expect(result.current.previewLoading).toBe(true)
  })

  it('surfaces an API error as previewErrorMessage', async () => {
    vi.mocked(stockTransferApi.preview).mockRejectedValue(new Error('boom'))
    const Wrapper = makeWrapper()
    const { result } = renderHook(
      () =>
        useStockTransferLinePreview({
          sourceLocationId: 'loc-1',
          itemVariantId: 'var-1',
          entryUomId: 'uom-l',
          entryQuantity: 10,
        }),
      { wrapper: Wrapper }
    )

    await waitFor(
      () => expect(result.current.previewErrorMessage).toBeDefined(),
      { timeout: 2000 }
    )
  })
})
