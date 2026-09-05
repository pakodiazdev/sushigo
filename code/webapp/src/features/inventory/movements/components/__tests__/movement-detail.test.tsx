/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MovementDetail } from '../movement-detail'
import type { StockMovement } from '../../types'

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

const base: StockMovement = {
  id: 'm1',
  reason: 'PURCHASE_RECEIPT',
  status: 'POSTED',
  direction: 'entry',
  is_reversal: false,
  quantity: 12,
  reference: 'DOC-77',
  from_location: null,
  to_location: { id: 'l1', name: 'Bodega Central' },
  variant: {
    id: 'v1',
    code: 'SAL-1',
    name: 'Salmón',
    base_uom: { id: 'u1', code: 'KG', name: 'Kilogramo', symbol: 'kg' },
  },
  actor: { id: 7, name: 'Ana López' },
  source: { type: 'receipt', id: '01JKXYZ1234567890ABCDEFGH' },
  posted_at: '2026-08-10T10:00:00+00:00',
  notes: 'Recepción parcial',
  reverses: null,
  reversed_by: null,
  reversed_at: null,
  reversal_reason: null,
  created_at: '2026-08-10T10:00:00+00:00',
  updated_at: '2026-08-10T10:00:00+00:00',
}

describe('MovementDetail', () => {
  afterEach(cleanup)

  it('renders direction, quantity with base UOM, origin document, actor and notes', () => {
    render(<MovementDetail movement={base} />)

    expect(screen.getByText('Entrada')).toBeDefined()
    expect(screen.getByTestId('movement-quantity').textContent).toBe('12 kg')
    expect(screen.getByText('Recepción de compra')).toBeDefined()
    expect(screen.getByText('receipt · 01JKXYZ1234567890ABCDEFGH')).toBeDefined()
    expect(screen.getByText('Ana López')).toBeDefined()
    expect(screen.getByText('Recepción parcial')).toBeDefined()
  })

  it('shows source → destination with an external end when a location is null', () => {
    render(<MovementDetail movement={base} />)
    expect(screen.getByText('Externo')).toBeDefined()
    expect(screen.getByText('Bodega Central')).toBeDefined()
  })

  it('labels a movement with no source document as manual', () => {
    render(<MovementDetail movement={{ ...base, source: null }} />)
    expect(screen.getByText('Movimiento manual')).toBeDefined()
  })

  it('renders the compensating-reversal linkage and follows it when clicked', () => {
    const onOpenLinked = vi.fn()
    render(
      <MovementDetail
        movement={{
          ...base,
          status: 'REVERSED',
          reversed_at: '2026-08-12T09:00:00+00:00',
          reversal_reason: 'Registrada por error',
          reversed_by: {
            id: 'm2',
            reason: 'PURCHASE_RECEIPT_REVERSAL',
            status: 'POSTED',
            posted_at: '2026-08-12T09:00:00+00:00',
          },
        }}
        onOpenLinked={onOpenLinked}
      />
    )

    expect(screen.getByText('Revertido por')).toBeDefined()
    expect(screen.getByText(/Registrada por error/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Ver/ }))
    expect(onOpenLinked).toHaveBeenCalledWith('m2')
  })

  it('renders the "revierte a" linkage on a compensating reversal row (no follow button when no handler)', () => {
    render(
      <MovementDetail
        movement={{
          ...base,
          is_reversal: true,
          reason: 'PURCHASE_RECEIPT_REVERSAL',
          reverses: {
            id: 'm0',
            reason: 'PURCHASE_RECEIPT',
            status: 'REVERSED',
            posted_at: '2026-08-09T09:00:00+00:00',
          },
        }}
      />
    )

    expect(screen.getByText('Este movimiento revierte a')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Ver/ })).toBeNull()
  })

  it('marks a reversal row with the reversal badge', () => {
    render(<MovementDetail movement={{ ...base, is_reversal: true, reason: 'PURCHASE_RECEIPT_REVERSAL' }} />)
    expect(screen.getByText('Reversa')).toBeDefined()
  })
})
