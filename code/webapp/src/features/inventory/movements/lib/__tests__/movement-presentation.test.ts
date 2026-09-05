import { describe, expect, it } from 'vitest'
import {
  directionPresentation,
  formatMovementSource,
  formatMovementTimestamp,
  movementLocationLabel,
  reasonLabels,
} from '../movement-presentation'
import type { StockMovementSummary } from '../../types'

const row = (over: Partial<StockMovementSummary>): StockMovementSummary => ({
  id: 'm1',
  reason: 'PURCHASE_RECEIPT',
  status: 'POSTED',
  direction: 'entry',
  is_reversal: false,
  quantity: 5,
  reference: null,
  from_location: null,
  to_location: null,
  variant: null,
  actor: null,
  source: null,
  posted_at: null,
  created_at: '2026-08-01T00:00:00+00:00',
  updated_at: '2026-08-01T00:00:00+00:00',
  ...over,
})

describe('movement-presentation', () => {
  it('has a Spanish label for every backend reason code', () => {
    expect(reasonLabels.PURCHASE_RECEIPT_REVERSAL).toBe('Reversa de recepción')
    expect(Object.keys(reasonLabels)).toHaveLength(9)
  })

  it('gives each direction its own distinct badge class and glyph', () => {
    const classes = Object.values(directionPresentation).map((d) => d.badgeClass)
    const glyphs = Object.values(directionPresentation).map((d) => d.glyph)
    expect(new Set(classes).size).toBe(4)
    expect(new Set(glyphs).size).toBe(4)
  })

  describe('movementLocationLabel', () => {
    it('shows the destination for an inbound entry', () => {
      expect(movementLocationLabel(row({ to_location: { id: 'l1', name: 'Bodega' } }))).toBe('Bodega')
    })

    it('shows the source for an outbound exit', () => {
      expect(movementLocationLabel(row({ from_location: { id: 'l1', name: 'Cocina' } }))).toBe('Cocina')
    })

    it('shows "origen → destino" for a transfer', () => {
      expect(
        movementLocationLabel(
          row({
            from_location: { id: 'l1', name: 'Bodega' },
            to_location: { id: 'l2', name: 'Barra' },
          })
        )
      ).toBe('Bodega → Barra')
    })

    it('falls back to a dash when neither endpoint is present', () => {
      expect(movementLocationLabel(row({}))).toBe('—')
    })
  })

  it('formats a null timestamp as a dash', () => {
    expect(formatMovementTimestamp(null)).toBe('—')
  })

  describe('formatMovementSource', () => {
    it('labels a null source as a manual movement', () => {
      expect(formatMovementSource(null)).toBe('Movimiento manual')
    })

    it('shows only the type when the source id did not survive', () => {
      expect(formatMovementSource({ type: 'receipt', id: null })).toBe('receipt')
    })

    it('joins the type and public id when both are present', () => {
      expect(formatMovementSource({ type: 'receipt', id: '01J9ABC' })).toBe('receipt · 01J9ABC')
    })
  })
})
