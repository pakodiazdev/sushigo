/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReceiptForm } from '../receipt-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('../../api/receipt-api', () => ({ receiptApi: apiMocks }))

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

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (config: { queryKey: unknown[]; select?: (data: unknown) => unknown }) => {
    const key = config.queryKey
    let data: unknown = { data: { data: [] } }

    if (key[0] === 'receipt-form-suppliers') {
      data = { data: { data: [{ id: 's1', code: 'SUP', name: 'Proveedor Uno' }] } }
    } else if (key[0] === 'inventory' && key[1] === 'locations') {
      data = { data: { data: [
        { id: 'loc1', name: 'Bodega Central', priority: 3, is_active: true, can_receive_purchases: true, operating_unit: { id: 1, name: 'Unidad Norte', type: 'BRANCH_MAIN' } },
        { id: 'loc2', name: 'Bodega Sur', priority: 2, is_active: true, can_receive_purchases: true, operating_unit: { id: 2, name: 'Unidad Sur', type: 'BRANCH_MAIN' } },
        // Same display name as unit 1, different id — must NOT be merged into unit 1's group.
        { id: 'loc3', name: 'Bodega Norte 2', priority: 1, is_active: true, can_receive_purchases: true, operating_unit: { id: 3, name: 'Unidad Norte', type: 'BRANCH_MAIN' } },
      ] } }
    } else if (key[0] === 'receipt-form-products') {
      data = { data: { data: [{ id: 'p1', name: 'Arroz' }] } }
    } else if (key[0] === 'receipt-form-variants') {
      data = { data: { data: [{ id: 'v1', name: 'Arroz 20kg', code: 'RICE-20', is_active: true }] } }
    } else if (key[0] === 'receipt-form-presentations') {
      data = { data: { data: [{ id: 'pp1', is_active: true, template: { name: 'Caja x24', base_unit_quantity: 24 } }] } }
    } else if (key[0] === 'receipt-form-offerings') {
      data = { data: { data: [{ id: 'off1', presentation: { id: 'pp1' }, quoted_price: 480, supplier_code: 'ARROZ' }] } }
    }

    return { data: config.select ? config.select(data) : data, isLoading: false, isError: false }
  },
}))

describe('ReceiptForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the header fields and one new-line row by default', () => {
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(view.getByLabelText(/^proveedor$/i)).toBeDefined()
    expect(view.getByLabelText(/almacén .* ubicación receptora/i)).toBeDefined()
    expect(view.getByLabelText(/fecha de recepción/i)).toBeDefined()
    expect(view.getByLabelText(/producto línea 1/i)).toBeDefined()
    expect(view.getByRole('button', { name: /crear recepción/i })).toBeDefined()
  })

  it('adds and removes lines', () => {
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(view.getByRole('button', { name: /agregar línea/i }))
    expect(view.getByLabelText(/producto línea 2/i)).toBeDefined()

    fireEvent.click(view.getByLabelText(/quitar línea 2/i))
    expect(view.queryByLabelText(/producto línea 2/i)).toBeNull()
  })

  it('calls onCancel without submitting', () => {
    const onCancel = vi.fn()
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(view.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(apiMocks.create).not.toHaveBeenCalled()
  })

  it('submits a new draft receipt with the selected line', async () => {
    apiMocks.create.mockResolvedValue({ data: { data: { id: 'r1' } } })
    const onSuccess = vi.fn()
    const view = render(<ReceiptForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText(/^proveedor$/i), { target: { value: 's1' } })
    fireEvent.change(view.getByLabelText(/almacén .* ubicación receptora/i), { target: { value: 'loc1' } })
    fireEvent.change(view.getByLabelText(/fecha de recepción/i), { target: { value: '2026-08-25' } })

    fireEvent.change(view.getByLabelText(/producto línea 1/i), { target: { value: 'p1' } })
    fireEvent.change(view.getByLabelText(/variante línea 1/i), { target: { value: 'v1' } })
    fireEvent.change(view.getByLabelText(/presentación de compra línea 1/i), { target: { value: 'pp1' } })
    fireEvent.change(view.getByLabelText(/paquetes recibidos línea 1/i), { target: { value: '10' } })
    fireEvent.change(view.getByLabelText(/monto bruto línea 1/i), { target: { value: '4800' } })

    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledWith(expect.objectContaining({
      supplier_id: 's1',
      destination_location_id: 'loc1',
      receipt_date: '2026-08-25',
      lines: [expect.objectContaining({
        variant_purchase_presentation_id: 'pp1',
        received_packages: 10,
        gross_amount: '4800',
      })],
    })))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('submits successfully when the optional cost fields are cleared to blank', async () => {
    apiMocks.create.mockResolvedValue({ data: { data: { id: 'r1' } } })
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText(/^proveedor$/i), { target: { value: 's1' } })
    fireEvent.change(view.getByLabelText(/almacén .* ubicación receptora/i), { target: { value: 'loc1' } })
    fireEvent.change(view.getByLabelText(/fecha de recepción/i), { target: { value: '2026-08-25' } })
    fireEvent.change(view.getByLabelText(/producto línea 1/i), { target: { value: 'p1' } })
    fireEvent.change(view.getByLabelText(/variante línea 1/i), { target: { value: 'v1' } })
    fireEvent.change(view.getByLabelText(/presentación de compra línea 1/i), { target: { value: 'pp1' } })
    fireEvent.change(view.getByLabelText(/paquetes recibidos línea 1/i), { target: { value: '10' } })
    fireEvent.change(view.getByLabelText(/monto bruto línea 1/i), { target: { value: '4800' } })

    fireEvent.change(view.getByLabelText(/descuentos línea 1/i), { target: { value: '' } })
    fireEvent.change(view.getByLabelText(/gastos asignados línea 1/i), { target: { value: '' } })
    fireEvent.change(view.getByLabelText(/impuestos no recuperables línea 1/i), { target: { value: '' } })

    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledWith(expect.objectContaining({
      lines: [expect.objectContaining({
        discounts: null,
        allocated_expenses: null,
        non_recoverable_taxes: null,
      })],
    })))
    expect(view.queryByText(/monto válido/i)).toBeNull()
  })

  it('states that a draft does not alter inventory and confirmation applies cost', () => {
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(view.getByText(/no modifica el inventario/i)).toBeDefined()
  })

  it('groups the receiving-location options by Operating Unit identity, not display name', () => {
    const view = render(<ReceiptForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    const select = view.getByLabelText(/almacén .* ubicación receptora/i)
    const groups = [...select.querySelectorAll('optgroup')]

    // Two distinct units share the name "Unidad Norte" — they stay as two groups.
    expect(groups.map((group) => group.label)).toEqual(['Unidad Norte', 'Unidad Norte', 'Unidad Sur'])

    const groupOf = (optionText: string) =>
      groups.find((group) => [...group.querySelectorAll('option')].some((o) => o.textContent === optionText))
    expect(groupOf('Bodega Central')).not.toBe(groupOf('Bodega Norte 2'))
    expect(view.getByRole('option', { name: 'Bodega Sur' })).toBeDefined()
  })
})
