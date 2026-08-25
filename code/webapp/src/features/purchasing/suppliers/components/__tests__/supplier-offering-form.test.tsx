/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupplierOfferingForm } from '../supplier-offering-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../api/supplier-api', () => ({ supplierOfferingApi: apiMocks }))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: { mutationFn: (values: unknown) => Promise<unknown>; onSuccess: () => void }) => ({
    execute: async (values: unknown) => {
      await config.mutationFn(values)
      config.onSuccess()
    },
    validationErrors: {},
    isPending: false,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'supplier-form-products') return { data: { data: { data: [{ id: 'p1', name: 'Salmón' }] } } }
    if (queryKey[0] === 'supplier-form-variants') return { data: { data: { data: [{ id: 'v1', name: 'Entero', code: 'SAL-1', is_active: true }] } } }
    return { data: { data: { data: [{ id: 'pp1', is_active: true, template: { name: 'Caja', package_type: 'BOX', base_unit_quantity: 12 } }] } } }
  },
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

describe('SupplierOfferingForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('explains that the quote is a reference and exposes commercial fields', () => {
    const view = render(<SupplierOfferingForm supplierId="s1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(view.getByText(/no registra el costo real/i)).toBeDefined()
    expect(view.getByLabelText(/^producto$/i)).toBeDefined()
    expect(view.getByLabelText(/precio cotizado/i)).toBeDefined()
    expect(view.getByLabelText(/moneda/i)).toBeDefined()
    expect(view.getByLabelText(/cantidad mínima/i)).toBeDefined()
  })

  it('creates an offering from the product presentation cascade', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const view = render(<SupplierOfferingForm supplierId="s1" onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText(/^producto$/i), { target: { value: 'p1' } })
    fireEvent.change(view.getByLabelText(/^variante$/i), { target: { value: 'v1' } })
    fireEvent.change(view.getByLabelText(/presentación de compra/i), { target: { value: 'pp1' } })
    fireEvent.change(view.getByLabelText(/precio cotizado/i), { target: { value: '480.25' } })
    fireEvent.change(view.getByLabelText(/entrega/i), { target: { value: '3' } })
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledWith('s1', expect.objectContaining({
      variant_purchase_presentation_id: 'pp1',
      quoted_price: 480.25,
      currency: 'MXN',
      minimum_order_quantity: 1,
      lead_time_days: 3,
    })))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('updates an offering without allowing its presentation to change', async () => {
    apiMocks.update.mockResolvedValue({})
    const offering = {
      id: 'o1',
      supplier: { id: 's1', code: 'SUP', name: 'Supplier' },
      presentation: {
        id: 'pp1',
        package_barcode: null,
        template: { id: 't1', code: 'BOX', name: 'Caja', package_type: 'BOX' as const, base_unit_quantity: 12 },
        variant: { id: 'v1', code: 'SAL-1', name: 'Entero', product: { id: 'p1', name: 'Salmón' } },
      },
      supplier_code: null,
      quoted_price: 480,
      currency: 'MXN',
      valid_from: null,
      valid_until: null,
      minimum_order_quantity: 1,
      lead_time_days: null,
      is_active: true,
    }
    const view = render(<SupplierOfferingForm supplierId="s1" offering={offering} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(view.queryByLabelText(/^producto$/i)).toBeNull()
    fireEvent.change(view.getByLabelText(/precio cotizado/i), { target: { value: '450' } })
    fireEvent.click(view.getByLabelText(/oferta activa/i))
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.update).toHaveBeenCalledWith('s1', 'o1', expect.objectContaining({
      quoted_price: 450,
      is_active: false,
    })))
  })

  it('falls back to a readable presentation summary when the variant or template is missing', () => {
    const offering = {
      id: 'o1',
      supplier: { id: 's1', code: 'SUP', name: 'Supplier' },
      presentation: { id: 'pp1', package_barcode: null, template: null, variant: null },
      supplier_code: null,
      quoted_price: 480,
      currency: 'MXN',
      valid_from: null,
      valid_until: null,
      minimum_order_quantity: 1,
      lead_time_days: null,
      is_active: true,
    }
    const view = render(<SupplierOfferingForm supplierId="s1" offering={offering} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(view.getByText(/Producto no disponible · Variante no disponible · Presentación no disponible/)).toBeDefined()
  })
})
