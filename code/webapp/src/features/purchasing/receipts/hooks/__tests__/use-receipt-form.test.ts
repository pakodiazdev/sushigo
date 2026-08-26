/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReceiptForm } from '../use-receipt-form'
import type { Receipt } from '../../types'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../api/receipt-api', () => ({ receiptApi: apiMocks }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: { mutationFn: (values: unknown) => Promise<unknown>; onSuccess: (data: unknown) => void }) => ({
    execute: async (values: unknown) => {
      const data = await config.mutationFn(values)
      config.onSuccess(data)
    },
    validationErrors: {},
    isPending: false,
  }),
}))

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
  lines: [
    {
      id: 1,
      variant_purchase_presentation_id: 'pp1',
      variant: { id: 'v1', code: 'RICE-20', name: 'Arroz 20kg' },
      supplier_offering_id: 'off1',
      ordered_packages: 10,
      received_packages: 10,
      bonus_packages: 0,
      presentation_factor: 24,
      gross_amount: 4800,
      discounts: 0,
      allocated_expenses: 150,
      non_recoverable_taxes: 0,
      net_acquisition_amount: 4950,
      base_units_received: 240,
      effective_unit_cost: 20.625,
    },
  ],
}

describe('useReceiptForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('starts a new draft with a single empty, new-flagged line', () => {
    const { result } = renderHook(() => useReceiptForm({ onSuccess: vi.fn() }))

    expect(result.current.isEditing).toBe(false)
    expect(result.current.fields).toHaveLength(1)
    expect(result.current.watch('lines.0._isNew')).toBe(true)
    expect(result.current.watch('lines.0.received_packages')).toBe(1)
  })

  it('maps an existing draft receipt into form values, marking lines as not-new', () => {
    const { result } = renderHook(() => useReceiptForm({ receipt: draftReceipt, onSuccess: vi.fn() }))

    expect(result.current.isEditing).toBe(true)
    expect(result.current.watch('supplier_id')).toBe('s1')
    expect(result.current.watch('destination_location_id')).toBe('loc1')
    expect(result.current.watch('lines.0._isNew')).toBe(false)
    expect(result.current.watch('lines.0._label')).toBe('Arroz 20kg (RICE-20)')
    expect(result.current.watch('lines.0.gross_amount')).toBe('4800')
  })

  it('adds and removes lines, never dropping below one line', () => {
    const { result } = renderHook(() => useReceiptForm({ onSuccess: vi.fn() }))

    act(() => result.current.addLine())
    expect(result.current.fields).toHaveLength(2)

    act(() => result.current.removeLine(1))
    expect(result.current.fields).toHaveLength(1)

    act(() => result.current.removeLine(0))
    expect(result.current.fields).toHaveLength(1)
  })

  it('clears every line’s supplier offering when the header supplier changes', () => {
    const { result } = renderHook(() => useReceiptForm({ onSuccess: vi.fn() }))

    act(() => {
      result.current.setValue('lines.0.supplier_offering_id', 'off-from-old-supplier')
      result.current.addLine()
      result.current.setValue('lines.1.supplier_offering_id', 'off-2-from-old-supplier')
    })
    expect(result.current.watch('lines.0.supplier_offering_id')).toBe('off-from-old-supplier')
    expect(result.current.watch('lines.1.supplier_offering_id')).toBe('off-2-from-old-supplier')

    act(() => result.current.onSupplierChange('new-supplier-id'))

    expect(result.current.watch('supplier_id')).toBe('new-supplier-id')
    expect(result.current.watch('lines.0.supplier_offering_id')).toBe('')
    expect(result.current.watch('lines.1.supplier_offering_id')).toBe('')
  })

  it('sends null for blank optional cost fields instead of an empty string', async () => {
    apiMocks.create.mockResolvedValue({ data: { data: draftReceipt } })
    const { result } = renderHook(() => useReceiptForm({ onSuccess: vi.fn() }))

    await act(async () => {
      await result.current.onSubmit({
        supplier_id: 's1',
        destination_location_id: 'loc1',
        reference: '',
        receipt_date: '2026-08-25',
        notes: '',
        lines: [
          {
            variant_purchase_presentation_id: 'pp1',
            supplier_offering_id: '',
            ordered_packages: Number.NaN,
            received_packages: 10,
            bonus_packages: Number.NaN,
            presentation_factor: 24,
            gross_amount: '4800',
            discounts: '',
            allocated_expenses: '',
            non_recoverable_taxes: '',
          },
        ],
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith(expect.objectContaining({
      lines: [expect.objectContaining({
        discounts: null,
        allocated_expenses: null,
        non_recoverable_taxes: null,
      })],
    }))
  })

  it('builds a create payload with money fields as strings and nulls for blank optionals', async () => {
    apiMocks.create.mockResolvedValue({ data: { data: draftReceipt } })
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useReceiptForm({ onSuccess }))

    await act(async () => {
      await result.current.onSubmit({
        supplier_id: 's1',
        destination_location_id: 'loc1',
        reference: '',
        receipt_date: '2026-08-25',
        notes: '',
        lines: [
          {
            _isNew: true,
            variant_purchase_presentation_id: 'pp1',
            supplier_offering_id: '',
            ordered_packages: Number.NaN,
            received_packages: 10,
            bonus_packages: Number.NaN,
            presentation_factor: 24,
            gross_amount: '4800',
            discounts: '0',
            allocated_expenses: '150',
            non_recoverable_taxes: '0',
          },
        ],
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith({
      supplier_id: 's1',
      destination_location_id: 'loc1',
      reference: null,
      receipt_date: '2026-08-25',
      notes: null,
      lines: [
        {
          variant_purchase_presentation_id: 'pp1',
          supplier_offering_id: null,
          ordered_packages: null,
          received_packages: 10,
          bonus_packages: 0,
          gross_amount: '4800',
          discounts: '0',
          allocated_expenses: '150',
          non_recoverable_taxes: '0',
        },
      ],
    })
    expect(onSuccess).toHaveBeenCalledWith(draftReceipt)
  })

  it('updates an existing draft instead of creating a new one', async () => {
    apiMocks.update.mockResolvedValue({ data: { data: draftReceipt } })
    const { result } = renderHook(() => useReceiptForm({ receipt: draftReceipt, onSuccess: vi.fn() }))

    await act(async () => {
      await result.current.onSubmit({
        supplier_id: 's1',
        destination_location_id: 'loc1',
        reference: 'FAC-0001',
        receipt_date: '2026-08-25',
        notes: '',
        lines: [
          {
            variant_purchase_presentation_id: 'pp1',
            supplier_offering_id: 'off1',
            ordered_packages: 10,
            received_packages: 10,
            bonus_packages: 0,
            presentation_factor: 24,
            gross_amount: '4800',
            discounts: '0',
            allocated_expenses: '150',
            non_recoverable_taxes: '0',
          },
        ],
      })
    })

    expect(apiMocks.update).toHaveBeenCalledWith('r1', expect.objectContaining({ reference: 'FAC-0001' }))
    expect(apiMocks.create).not.toHaveBeenCalled()
  })
})
