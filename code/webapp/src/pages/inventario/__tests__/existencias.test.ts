// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { computeStockSummary } from '../existencias'
import type { Stock } from '@/types/inventory'

function row(overrides: Partial<Stock>): Stock {
  return {
    id: 'ASSIGN',
    assignment_id: 'ASSIGN',
    stock_id: 'STOCK',
    inventory_location_id: 'LOC',
    item_variant_id: 'VAR',
    on_hand: 0,
    reserved: 0,
    available: 0,
    weighted_avg_cost: 0,
    total_value: 0,
    min_stock: null,
    max_stock: null,
    is_low_stock: false,
    ...overrides,
  } as Stock
}

describe('computeStockSummary (#571)', () => {
  it('counts every assigned Variant, including never-received zero rows', () => {
    const summary = computeStockSummary([
      row({ assignment_id: 'a1', stock_id: 'S1', on_hand: 100, reserved: 10, weighted_avg_cost: 5 }),
      row({ assignment_id: 'a2', stock_id: null }), // assigned, never received
      row({ assignment_id: 'a3', stock_id: null, is_low_stock: true }), // zero + low policy
    ])

    expect(summary.total_variants).toBe(3)
    expect(summary.total_items_on_hand).toBe(100)
    expect(summary.total_items_available).toBe(90)
    expect(summary.total_inventory_value).toBe(500)
    expect(summary.low_stock_items).toBe(1)
  })

  it('a projected zero row contributes nothing to on-hand or value', () => {
    const summary = computeStockSummary([row({ stock_id: null })])

    expect(summary.total_variants).toBe(1)
    expect(summary.total_items_on_hand).toBe(0)
    expect(summary.total_inventory_value).toBe(0)
  })
})
