/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StockTransfer, StockTransferSummary } from '../../types'

const draftTransfer: StockTransfer = {
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
}

const draftSummary: StockTransferSummary = {
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
}

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  removeQueries: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
    removeQueries: mocks.removeQueries,
  }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey.includes('detail')
      ? { data: { data: { data: draftTransfer } }, isLoading: false, isError: false }
      : {
          data: {
            data: { data: [draftSummary], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } },
          },
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
vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }),
}))
vi.mock('../../api/stock-transfer-api', () => ({
  stockTransferApi: { list: vi.fn(), get: vi.fn(), delete: vi.fn(), post: vi.fn(), reverse: vi.fn() },
}))
vi.mock('@/components/auth', () => ({ CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
interface FakeColumn {
  key: string
  render?: (row: StockTransferSummary) => React.ReactNode
}
vi.mock('@/components/ui/data-grid', () => ({
  DataGrid: ({
    data,
    columns,
    onRowClick,
  }: {
    data: StockTransferSummary[]
    columns: FakeColumn[]
    onRowClick: (value: StockTransferSummary, event: unknown) => void
  }) => (
    <table>
      <tbody>
        {data.map((transfer) => (
          <tr key={transfer.id} onClick={(event) => onRowClick(transfer, event)}>
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(transfer) : null}</td>
            ))}
            <td>
              <button onClick={(event) => onRowClick(transfer, event)}>{transfer.reference}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))
vi.mock('@/components/ui/page-container', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))
vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
}))
vi.mock('@/components/ui/search-input', () => ({ SearchInput: () => <input aria-label="Buscar" /> }))
vi.mock('@/components/ui/filter-select', () => ({ FilterSelect: () => <select aria-label="Estado" /> }))
vi.mock('@/components/ui/slide-panel', () => {
  const Panel = ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    isOpen ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
    ) : null
  Panel.Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Panel.Footer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  return { SlidePanel: Panel }
})
vi.mock('../../components', () => ({
  StockTransferForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: (transfer: StockTransfer) => void
    onCancel: () => void
  }) => (
    <div>
      <button onClick={() => onSuccess(draftTransfer)}>Guardar traslado</button>
      <button onClick={onCancel}>Cancelar traslado</button>
    </div>
  ),
  StockTransferDetails: ({ transfer, onEdit }: { transfer: StockTransfer; onEdit: () => void }) => (
    <div>
      Detalle de {transfer.reference}
      <button onClick={onEdit}>Editar traslado</button>
    </div>
  ),
}))

import { StockTransfersPage } from '../stock-transfers-page'

describe('StockTransfersPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the list and opens the detail panel for a clicked row', () => {
    const view = render(<StockTransfersPage />)
    expect(view.getByRole('heading', { name: 'Transferencias de Inventario', level: 1 })).toBeDefined()

    fireEvent.click(view.getByRole('button', { name: 'TR-0001' }))

    expect(view.getByRole('heading', { name: 'Detalle del traslado', level: 2 })).toBeDefined()
    expect(view.getByText('Detalle de TR-0001')).toBeDefined()
  })

  it('opens the create panel and invalidates the list on success', () => {
    const view = render(<StockTransfersPage />)
    fireEvent.click(view.getByRole('button', { name: /nuevo traslado/i }))

    expect(view.getByRole('heading', { name: 'Nuevo traslado', level: 2 })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar traslado' }))

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-transfers', 'list'] })
  })

  it('switches to edit mode from the detail panel and back to detail on save', () => {
    const view = render(<StockTransfersPage />)
    fireEvent.click(view.getByRole('button', { name: 'TR-0001' }))
    fireEvent.click(view.getByRole('button', { name: 'Editar traslado' }))

    expect(view.getByRole('heading', { name: 'Editar traslado', level: 2 })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: 'Guardar traslado' }))

    expect(view.getByRole('heading', { name: 'Detalle del traslado', level: 2 })).toBeDefined()
  })
})
