/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StockTransferForm } from '../stock-transfer-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('../../api/stock-transfer-api', () => ({ stockTransferApi: apiMocks }))

const formMutation = vi.hoisted(() => ({ validationErrors: {} as Record<string, string> }))
vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: { mutationFn: (v: unknown) => Promise<unknown>; onSuccess: (d: unknown) => void }) => ({
    execute: async (values: unknown) => config.onSuccess(await config.mutationFn(values)),
    validationErrors: formMutation.validationErrors,
    isPending: false,
  }),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (config: { queryKey: unknown[] }) => {
    // The assigned-variant query for the "dst" destination — variant "v-a" only.
    if (config.queryKey[0] === 'stock-transfer-form' && config.queryKey[2] === 'dst') {
      return {
        data: {
          data: {
            data: [{ item_variant_id: 'v-a', item_variant_name: 'Arroz', item_variant_code: 'RICE' }],
          },
        },
      }
    }
    return { data: undefined }
  },
}))

vi.mock('@/lib/fetch-all-pages', () => ({
  fetchAllPages: (fetchPage: (page: number) => unknown) => fetchPage(1),
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useInventoryLocationsSelect: () => ({
    data: [
      { id: 'src', name: 'Bodega' },
      { id: 'dst', name: 'Cocina' },
      { id: 'dst2', name: 'Barra' },
    ],
  }),
  useUnitsOfMeasureSelect: () => ({ data: [{ id: 'u-kg', code: 'KG', name: 'Kilogramo' }] }),
}))

vi.mock('@/features/inventory/assignments', () => ({
  variantAssignmentApi: { list: vi.fn() },
}))

const draftTransfer = {
  id: 'tr1',
  status: 'DRAFT' as const,
  reference: 'TR-1',
  transfer_date: '2026-09-05',
  notes: null,
  can_mutate: true,
  source_location: { id: 'src', name: 'Bodega' },
  destination_location: { id: 'dst', name: 'Cocina' },
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
      variant: { id: 'v-a', code: 'RICE', name: 'Arroz' },
      entry_uom: { id: 'u-kg', code: 'KG', symbol: 'kg' },
      entry_quantity: 5,
      conversion_factor: 1,
      base_quantity: 5,
      source_unit_cost: null,
    },
  ],
}

describe('StockTransferForm', () => {
  beforeEach(() => {
    formMutation.validationErrors = {}
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('drops the stale variant fallback option once the destination changes', () => {
    const view = render(<StockTransferForm transfer={draftTransfer} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    const variantSelect = view.getByLabelText('Variante línea 1') as HTMLSelectElement
    // The editing draft's own variant renders as a fallback option.
    expect([...variantSelect.options].some((o) => o.value === 'v-a')).toBe(true)

    // Switch the destination — its assigned list (mock) does not include v-a.
    fireEvent.change(view.getByLabelText('Destino'), { target: { value: 'dst2' } })

    const after = view.getByLabelText('Variante línea 1') as HTMLSelectElement
    expect([...after.options].some((o) => o.value === 'v-a')).toBe(false)
  })

  it('surfaces a server-side entry_quantity error on the quantity field', () => {
    formMutation.validationErrors = { 'lines.0.entry_quantity': 'La cantidad excede el máximo permitido.' }

    const view = render(<StockTransferForm transfer={draftTransfer} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(view.getByText('La cantidad excede el máximo permitido.')).toBeDefined()
  })
})
