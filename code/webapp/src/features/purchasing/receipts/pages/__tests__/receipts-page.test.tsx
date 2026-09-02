/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Receipt, ReceiptSummary } from '../../types'

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

const draftSummary: ReceiptSummary = {
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
}

const mocks = vi.hoisted(() => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn(), showSuccess: vi.fn(), showError: vi.fn() }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries, setQueryData: mocks.setQueryData }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey.includes('detail')
      ? { data: { data: { data: draftReceipt } }, isLoading: false, isError: false }
      : {
          data: { data: { data: [draftSummary], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } } },
          isLoading: false,
          isError: false,
        },
  useMutation: (config: { mutationFn: (value: unknown) => Promise<unknown>; onSuccess: (data: unknown) => void }) => ({
    mutate: async (value: unknown) => {
      const data = await config.mutationFn(value)
      config.onSuccess(data)
    },
    isPending: false,
  }),
}))
vi.mock('@/components/ui/toast-context', () => ({ useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }) }))
vi.mock('../../api/receipt-api', () => ({ receiptApi: { list: vi.fn(), get: vi.fn(), delete: vi.fn(), post: vi.fn(), reverse: vi.fn() } }))
vi.mock('@/components/auth', () => ({ CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/ui/data-grid', () => ({
  DataGrid: ({ data, onRowClick }: { data: ReceiptSummary[]; onRowClick: (value: ReceiptSummary, event: unknown) => void }) => (
    <div>{data.map((receipt) => <button key={receipt.id} onClick={(event) => onRowClick(receipt, event)}>{receipt.reference}</button>)}</div>
  ),
}))
vi.mock('@/components/ui/page-container', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => <header><h1>{title}</h1>{action}</header> }))
vi.mock('@/components/ui/search-input', () => ({ SearchInput: () => <input aria-label="Buscar" /> }))
vi.mock('@/components/ui/filter-select', () => ({ FilterSelect: () => <select aria-label="Estado" /> }))
vi.mock('@/components/ui/slide-panel', () => {
  const Panel = ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    isOpen ? <section><h2>{title}</h2>{children}</section> : null
  Panel.Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Panel.Footer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  return { SlidePanel: Panel }
})
vi.mock('../../components', () => ({
  ReceiptForm: ({ onSuccess, onCancel }: { onSuccess: (receipt: Receipt) => void; onCancel: () => void }) => (
    <div>
      <button onClick={() => onSuccess(draftReceipt)}>Guardar recepción</button>
      <button onClick={onCancel}>Cancelar recepción</button>
    </div>
  ),
  ReceiptDetails: ({ receipt, onEdit }: { receipt: Receipt; onEdit: () => void }) => (
    <div>
      Detalle de {receipt.reference}
      <button onClick={onEdit}>Editar recepción</button>
    </div>
  ),
}))

import { ReceiptsPage } from '../receipts-page'

describe('ReceiptsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens the detail panel for a clicked receipt row', () => {
    const view = render(<ReceiptsPage />)
    fireEvent.click(view.getByRole('button', { name: 'FAC-0001' }))

    expect(view.getByRole('heading', { name: 'Detalle de la recepción', level: 2 })).toBeDefined()
    expect(view.getByText('Detalle de FAC-0001')).toBeDefined()
  })

  it('opens the create panel and invalidates the list on success', () => {
    const view = render(<ReceiptsPage />)
    fireEvent.click(view.getByRole('button', { name: /nueva recepción/i }))

    expect(view.getByRole('heading', { name: 'Nueva recepción', level: 2 })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar recepción' }))

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['receipts', 'list'] })
  })

  it('switches to edit mode from the detail panel and back to detail on save', () => {
    const view = render(<ReceiptsPage />)
    fireEvent.click(view.getByRole('button', { name: 'FAC-0001' }))
    fireEvent.click(view.getByRole('button', { name: 'Editar recepción' }))

    expect(view.getByRole('heading', { name: 'Editar recepción', level: 2 })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar recepción' }))

    expect(view.getByRole('heading', { name: 'Detalle de la recepción', level: 2 })).toBeDefined()
  })
})
