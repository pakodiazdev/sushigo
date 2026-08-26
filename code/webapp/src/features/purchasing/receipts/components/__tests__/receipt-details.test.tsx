/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { ReceiptDetails } from '../receipt-details'
import type { Receipt } from '../../types'

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

const baseReceipt: Receipt = {
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

describe('ReceiptDetails', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows Edit/Post/Delete actions for a DRAFT receipt and its line totals', () => {
    const view = render(<ReceiptDetails receipt={baseReceipt} {...baseProps()} />)

    expect(view.getByText('Borrador')).toBeDefined()
    expect(view.getByRole('button', { name: /editar/i })).toBeDefined()
    expect(view.getByRole('button', { name: /confirmar recepción/i })).toBeDefined()
    expect(view.getByRole('button', { name: /eliminar/i })).toBeDefined()
    expect(view.queryByRole('button', { name: /revertir/i })).toBeNull()
    expect(view.getByText('Arroz 20kg (RICE-20)')).toBeDefined()
  })

  it('opens the delete confirmation and calls onDelete when confirmed', () => {
    const props = baseProps()
    const view = render(<ReceiptDetails receipt={baseReceipt} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /eliminar/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }))

    expect(props.onDelete).toHaveBeenCalledOnce()
  })

  it('calls onEdit when Editar is clicked', () => {
    const props = baseProps()
    const view = render(<ReceiptDetails receipt={baseReceipt} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /editar/i }))
    expect(props.onEdit).toHaveBeenCalledOnce()
  })

  it('opens the post confirmation and calls onPost when confirmed', () => {
    const props = baseProps()
    const view = render(<ReceiptDetails receipt={baseReceipt} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /confirmar recepción/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^confirmar$/i }))

    expect(props.onPost).toHaveBeenCalledOnce()
  })

  it('closes a confirmation dialog without acting when cancelled', () => {
    const props = baseProps()
    const view = render(<ReceiptDetails receipt={baseReceipt} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /eliminar/i }))
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('shows only Revertir for a POSTED receipt, with the immutable evidence banner', () => {
    const postedReceipt: Receipt = {
      ...baseReceipt,
      status: 'POSTED',
      posted_at: '2026-08-25T12:00:00Z',
      posted_by: { id: 'u1', name: 'Ana Compras' },
    }
    const view = render(<ReceiptDetails receipt={postedReceipt} {...baseProps()} />)

    expect(view.getByText('Confirmada')).toBeDefined()
    expect(view.getByRole('button', { name: /revertir/i })).toBeDefined()
    expect(view.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(view.queryByRole('button', { name: /^eliminar$/i })).toBeNull()
    expect(view.getByText(/por ana compras/i)).toBeDefined()
    expect(view.getByText(/no puede editarse/i)).toBeDefined()
  })

  it('opens the reverse confirmation, captures an optional reason, and calls onReverse', () => {
    const props = baseProps()
    const postedReceipt: Receipt = { ...baseReceipt, status: 'POSTED', posted_at: '2026-08-25T12:00:00Z' }
    const view = render(<ReceiptDetails receipt={postedReceipt} {...props} />)

    fireEvent.click(view.getByRole('button', { name: /revertir/i }))
    fireEvent.change(view.getByLabelText(/motivo/i), { target: { value: 'Recibido por error' } })
    const dialog = view.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^revertir$/i }))

    expect(props.onReverse).toHaveBeenCalledWith('Recibido por error')
  })

  it('shows no action buttons for a REVERSED receipt and displays the reversal evidence', () => {
    const reversedReceipt: Receipt = {
      ...baseReceipt,
      status: 'REVERSED',
      posted_at: '2026-08-25T12:00:00Z',
      reversed_at: '2026-08-26T09:00:00Z',
      reversed_by: { id: 'u2', name: 'Luis Compras' },
      reversal_reason: 'Proveedor equivocado',
    }
    const view = render(<ReceiptDetails receipt={reversedReceipt} {...baseProps()} />)

    expect(view.getByText('Revertida')).toBeDefined()
    expect(view.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(view.queryByRole('button', { name: /confirmar recepción/i })).toBeNull()
    expect(view.queryByRole('button', { name: /^eliminar$/i })).toBeNull()
    expect(view.queryByRole('button', { name: /^revertir$/i })).toBeNull()
    expect(view.getByText(/por luis compras/i)).toBeDefined()
    expect(view.getByText(/proveedor equivocado/i)).toBeDefined()
  })
})
