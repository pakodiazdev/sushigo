/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { StockTransferDetails } from '../stock-transfer-details'
import type { StockTransfer } from '../../types'

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

const baseLine: StockTransfer['lines'][number] = {
  id: 'l1',
  variant: { id: 'v1', code: 'RICE-20', name: 'Arroz 20kg' },
  entry_uom: { id: 'u1', code: 'KG', symbol: 'kg' },
  entry_quantity: 12,
  conversion_factor: 1,
  base_quantity: 12,
  source_unit_cost: null,
}

const baseTransfer: StockTransfer = {
  id: 'tr1',
  status: 'DRAFT',
  reference: 'TR-0001',
  transfer_date: '2026-09-05',
  notes: null,
  can_mutate: true,
  source_location: { id: 'loc-src', name: 'Bodega Central' },
  destination_location: { id: 'loc-dst', name: 'Cocina' },
  posted_at: null,
  posted_by: null,
  reversed_at: null,
  reversed_by: null,
  reversal_reason: null,
  created_at: '2026-09-05T00:00:00Z',
  updated_at: '2026-09-05T00:00:00Z',
  lines: [baseLine],
}

function baseProps() {
  return {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPost: vi.fn(),
    onReverse: vi.fn(),
    isDeleting: false,
    isPosting: false,
    isReversing: false,
  }
}

describe('StockTransferDetails', () => {
  afterEach(cleanup)

  it('shows the route, the line and the DRAFT actions', () => {
    const view = render(<StockTransferDetails transfer={baseTransfer} {...baseProps()} />)

    expect(view.getByText('Bodega Central')).toBeDefined()
    expect(view.getByText('Cocina')).toBeDefined()
    expect(view.getByText('Arroz 20kg (RICE-20)')).toBeDefined()
    expect(view.getByRole('button', { name: /confirmar traslado/i })).toBeDefined()
    expect(view.getByRole('button', { name: /editar/i })).toBeDefined()
    expect(view.queryByRole('button', { name: /revertir/i })).toBeNull()
  })

  it('opens the post confirm dialog and calls onPost when confirmed', () => {
    const props = baseProps()
    const view = render(<StockTransferDetails transfer={baseTransfer} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /confirmar traslado/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^confirmar$/i }))

    expect(props.onPost).toHaveBeenCalledOnce()
  })

  it('hides every mutation action when can_mutate is false', () => {
    const draft: StockTransfer = { ...baseTransfer, can_mutate: false }
    const posted: StockTransfer = { ...baseTransfer, status: 'POSTED', can_mutate: false, posted_at: '2026-09-05T10:00:00Z' }

    const draftView = render(<StockTransferDetails transfer={draft} {...baseProps()} />)
    expect(draftView.queryByRole('button', { name: /confirmar traslado/i })).toBeNull()
    expect(draftView.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(draftView.queryByRole('button', { name: /eliminar/i })).toBeNull()
    cleanup()

    const postedView = render(<StockTransferDetails transfer={posted} {...baseProps()} />)
    expect(postedView.queryByRole('button', { name: /revertir/i })).toBeNull()
    // The read-only evidence banner is still shown to a partial-unit viewer.
    expect(postedView.getByText(/no puede editarse/i)).toBeDefined()
  })

  it('shows only Revertir once POSTED and hides edit/delete', () => {
    const posted: StockTransfer = {
      ...baseTransfer,
      status: 'POSTED',
      posted_at: '2026-09-05T10:00:00Z',
      posted_by: { id: 1, name: 'Ada' },
      lines: [{ ...baseLine, source_unit_cost: 20.5 }],
    }

    const view = render(<StockTransferDetails transfer={posted} {...baseProps()} />)

    expect(view.getByRole('button', { name: /revertir/i })).toBeDefined()
    expect(view.queryByRole('button', { name: /confirmar traslado/i })).toBeNull()
    expect(view.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(view.getByText(/costo origen:/i)).toBeDefined()
    expect(view.getByText(/por ada/i)).toBeDefined()
  })

  it('calls onEdit and runs the delete confirm flow', () => {
    const props = baseProps()
    const view = render(<StockTransferDetails transfer={baseTransfer} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /^editar$/i }))
    expect(props.onEdit).toHaveBeenCalledOnce()

    fireEvent.click(view.getByRole('button', { name: /eliminar/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }))
    expect(props.onDelete).toHaveBeenCalledOnce()
  })

  it('cancels the post confirm dialog without calling onPost', () => {
    const props = baseProps()
    const view = render(<StockTransferDetails transfer={baseTransfer} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /confirmar traslado/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(props.onPost).not.toHaveBeenCalled()
  })

  it('runs the reverse flow with a typed reason from the POSTED view', () => {
    const props = baseProps()
    const posted: StockTransfer = { ...baseTransfer, status: 'POSTED', posted_at: '2026-09-05T10:00:00Z' }
    const view = render(<StockTransferDetails transfer={posted} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /revertir/i }))
    const reason = view.getByPlaceholderText(/registrado por error/i)
    fireEvent.change(reason, { target: { value: 'Traslado duplicado' } })
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^revertir$/i }))

    expect(props.onReverse).toHaveBeenCalledWith('Traslado duplicado')
  })

  it('renders the reversed-evidence banner with the reversal reason', () => {
    const reversed: StockTransfer = {
      ...baseTransfer,
      status: 'REVERSED',
      posted_at: '2026-09-05T10:00:00Z',
      reversed_at: '2026-09-06T09:00:00Z',
      reversed_by: { id: 2, name: 'Bob' },
      reversal_reason: 'Error de captura',
    }

    const view = render(<StockTransferDetails transfer={reversed} {...baseProps()} />)

    expect(view.getByText(/revertido el/i)).toBeDefined()
    expect(view.getByText(/error de captura/i)).toBeDefined()
    expect(view.queryByRole('button', { name: /revertir/i })).toBeNull()
  })
})
