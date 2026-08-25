/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  supplierUpdate: vi.fn().mockResolvedValue({}),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

const supplier = {
  id: 's1', code: 'MAR', name: 'Mar del Norte', contact_name: 'Ana', email: 'ana@example.com',
  phone: '555', is_active: true, offerings_count: 1,
}
const offering = {
  id: 'o1', supplier: { id: 's1', code: 'MAR', name: 'Mar del Norte' }, supplier_code: 'BOX-1',
  quoted_price: 480, currency: 'MXN', valid_from: null, valid_until: null, minimum_order_quantity: 2,
  lead_time_days: 3, is_active: true,
  presentation: {
    id: 'pp1', package_barcode: null,
    template: { id: 't1', code: 'BOX', name: 'Caja', package_type: 'BOX' as const, base_unit_quantity: 12 },
    variant: { id: 'v1', code: 'SAL', name: 'Entero', product: { id: 'p1', name: 'Salmón' } },
  },
}
const offeringWithMissingCatalogRefs = {
  ...offering,
  id: 'o2',
  quoted_price: 510,
  presentation: { id: 'pp2', package_barcode: null, template: null, variant: null },
}

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'suppliers'
    ? { data: { data: { data: [supplier] } }, isLoading: false }
    : { data: { data: { data: [offering, offeringWithMissingCatalogRefs] } }, isLoading: false },
  useMutation: (config: { mutationFn: (value: typeof supplier) => Promise<unknown>; onSuccess: () => void }) => ({
    mutate: async (value: typeof supplier) => {
      await config.mutationFn(value)
      config.onSuccess()
    },
  }),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (selector: (state: { can: () => boolean }) => boolean) => selector({ can: () => true }) }))
vi.mock('@/components/ui/toast-context', () => ({ useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }) }))
vi.mock('../../api/supplier-api', () => ({
  supplierApi: { list: vi.fn(), update: mocks.supplierUpdate },
  supplierOfferingApi: { list: vi.fn() },
}))
vi.mock('@/components/ui/data-grid', () => ({
  DataGrid: ({ data, onRowClick }: { data: typeof supplier[]; onRowClick: (value: typeof supplier) => void }) => (
    <div>{data.map((value) => <button key={value.id} onClick={() => onRowClick(value)}>{value.name}</button>)}</div>
  ),
}))
vi.mock('@/components/ui/page-container', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => <header><h1>{title}</h1>{action}</header> }))
vi.mock('@/components/ui/search-input', () => ({ SearchInput: () => <input aria-label="Buscar" /> }))
vi.mock('@/components/ui/filter-select', () => ({ FilterSelect: () => <select aria-label="Estado" /> }))
vi.mock('@/components/ui/slide-panel', () => {
  const Panel = ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => isOpen ? <section><h2>{title}</h2>{children}</section> : null
  Panel.Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Panel.Footer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  return { SlidePanel: Panel }
})
vi.mock('../../components', () => ({
  SupplierForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => <div><button onClick={onSuccess}>Guardar proveedor</button><button onClick={onCancel}>Cancelar proveedor</button></div>,
  SupplierOfferingForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => <div><button onClick={onSuccess}>Guardar oferta</button><button onClick={onCancel}>Cancelar oferta</button></div>,
}))

import { SuppliersPage } from '../suppliers-page'

describe('SuppliersPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens supplier detail, shows its quotation, and deactivates it', async () => {
    const view = render(<SuppliersPage />)
    fireEvent.click(view.getByRole('button', { name: 'Mar del Norte' }))

    expect(view.getByText('Detalle del proveedor')).toBeDefined()
    expect(view.getByText(/Salmón · Entero/)).toBeDefined()
    expect(view.getByText(/MXN 480/)).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Desactivar' }))

    expect(mocks.supplierUpdate).toHaveBeenCalledWith('s1', { is_active: false })
  })

  it('falls back to a readable label when an offering has no linked variant or template', () => {
    const view = render(<SuppliersPage />)
    fireEvent.click(view.getByRole('button', { name: 'Mar del Norte' }))

    expect(view.getByText(/Producto no disponible · Variante no disponible/)).toBeDefined()
    expect(view.getByText(/Presentación no disponible/)).toBeDefined()
  })

  it('opens and completes supplier and offering forms', () => {
    const view = render(<SuppliersPage />)
    fireEvent.click(view.getByRole('button', { name: /nuevo proveedor/i }))
    expect(view.getByRole('heading', { name: 'Nuevo proveedor', level: 2 })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar proveedor' }))
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['suppliers'] })

    fireEvent.click(view.getByRole('button', { name: 'Mar del Norte' }))
    fireEvent.click(view.getByRole('button', { name: /oferta/i }))
    expect(view.getByText('Nueva oferta')).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar oferta' }))
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['supplier-offerings', 's1'] })
  })
})
