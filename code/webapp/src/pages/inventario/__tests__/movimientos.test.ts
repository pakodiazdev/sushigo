import { describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ isAuthenticated: true, can: () => true }) },
}))
vi.mock('@/features/inventory/movements', () => ({ MovementsPage: () => null }))

import { Route } from '@/pages/inventario/movimientos'

const validate = (search: Record<string, unknown>) =>
  (Route.options.validateSearch as (s: Record<string, unknown>) => Record<string, unknown>)(search)

describe('/inventario/movimientos validateSearch', () => {
  it('keeps a positive integer page', () => {
    expect(validate({ page: '3' }).page).toBe(3)
  })

  it('drops a negative, zero or fractional page instead of forwarding it to the API', () => {
    expect(validate({ page: '-2' }).page).toBeUndefined()
    expect(validate({ page: '0' }).page).toBeUndefined()
    expect(validate({ page: '1.5' }).page).toBeUndefined()
    expect(validate({ page: 'abc' }).page).toBeUndefined()
  })

  it('whitelists reason, status and source_type, discarding unknown values', () => {
    expect(validate({ reason: 'TRANSFER', status: 'POSTED', source_type: 'receipt' })).toMatchObject({
      reason: 'TRANSFER',
      status: 'POSTED',
      source_type: 'receipt',
    })
    const cleaned = validate({ reason: 'BOGUS', status: 'NOPE', source_type: 'unicorn' })
    expect(cleaned.reason).toBeUndefined()
    expect(cleaned.status).toBeUndefined()
    expect(cleaned.source_type).toBeUndefined()
  })

  it('passes through the free-text and id filters and the open-movement id', () => {
    expect(
      validate({
        location_id: 'loc-ulid',
        item_variant_id: 'var-ulid',
        date_from: '2026-08-01',
        date_to: '2026-08-31',
        search: 'DOC',
        movement: 'mv-ulid',
      })
    ).toMatchObject({
      location_id: 'loc-ulid',
      item_variant_id: 'var-ulid',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
      search: 'DOC',
      movement: 'mv-ulid',
    })
  })
})
