/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStockTransferForm } from '../use-stock-transfer-form'
import type { StockTransfer } from '../../types'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../api/stock-transfer-api', () => ({ stockTransferApi: apiMocks }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: {
    mutationFn: (values: unknown) => Promise<unknown>
    onSuccess: (data: unknown) => void
  }) => ({
    execute: async (values: unknown) => {
      const data = await config.mutationFn(values)
      config.onSuccess(data)
    },
    validationErrors: {},
    isPending: false,
  }),
}))

const draftTransfer: StockTransfer = {
  id: 'tr1',
  status: 'DRAFT',
  reference: 'TR-0001',
  transfer_date: '2026-09-05',
  notes: null,
  source_location: { id: 'loc-src', name: 'Bodega Central' },
  destination_location: { id: 'loc-dst', name: 'Cocina' },
  posted_at: null,
  posted_by: null,
  reversed_at: null,
  reversed_by: null,
  reversal_reason: null,
  created_at: '2026-09-05T00:00:00Z',
  updated_at: '2026-09-05T00:00:00Z',
  lines: [
    {
      id: 'l1',
      variant: { id: 'v1', code: 'RICE-20', name: 'Arroz 20kg' },
      entry_uom: { id: 'u1', code: 'KG', symbol: 'kg' },
      entry_quantity: 12,
      conversion_factor: 1,
      base_quantity: 12,
      source_unit_cost: null,
    },
  ],
}

describe('useStockTransferForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('starts a new draft with a single empty line', () => {
    const { result } = renderHook(() => useStockTransferForm({ onSuccess: vi.fn() }))

    expect(result.current.isEditing).toBe(false)
    expect(result.current.fields).toHaveLength(1)
    expect(result.current.watch('lines.0.entry_quantity')).toBe(1)
  })

  it('maps an existing draft into form values', () => {
    const { result } = renderHook(() => useStockTransferForm({ transfer: draftTransfer, onSuccess: vi.fn() }))

    expect(result.current.isEditing).toBe(true)
    expect(result.current.watch('source_location_id')).toBe('loc-src')
    expect(result.current.watch('destination_location_id')).toBe('loc-dst')
    expect(result.current.watch('lines.0.item_variant_id')).toBe('v1')
    expect(result.current.watch('lines.0._label')).toBe('Arroz 20kg (RICE-20)')
  })

  it('adds and removes lines, never dropping below one line', () => {
    const { result } = renderHook(() => useStockTransferForm({ onSuccess: vi.fn() }))

    act(() => result.current.addLine())
    expect(result.current.fields).toHaveLength(2)

    act(() => result.current.removeLine(1))
    expect(result.current.fields).toHaveLength(1)

    act(() => result.current.removeLine(0))
    expect(result.current.fields).toHaveLength(1)
  })

  it('clears every line variant when the destination changes', () => {
    const { result } = renderHook(() => useStockTransferForm({ transfer: draftTransfer, onSuccess: vi.fn() }))

    act(() => result.current.onDestinationChange('loc-other'))

    expect(result.current.watch('destination_location_id')).toBe('loc-other')
    expect(result.current.watch('lines.0.item_variant_id')).toBe('')
  })

  it('submits a create payload with the resolved line data', async () => {
    apiMocks.create.mockResolvedValue({ data: { data: draftTransfer } })
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useStockTransferForm({ onSuccess }))

    await act(async () => {
      await result.current.onSubmit({
        source_location_id: 'loc-src',
        destination_location_id: 'loc-dst',
        reference: '',
        transfer_date: '2026-09-05',
        notes: '',
        lines: [{ item_variant_id: 'v1', entry_uom_id: 'u1', entry_quantity: 5 }],
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith({
      source_location_id: 'loc-src',
      destination_location_id: 'loc-dst',
      reference: null,
      transfer_date: '2026-09-05',
      notes: null,
      lines: [{ item_variant_id: 'v1', entry_uom_id: 'u1', entry_quantity: 5 }],
    })
    expect(onSuccess).toHaveBeenCalledWith(draftTransfer)
  })
})
