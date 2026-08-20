import { describe, it, expect } from 'vitest'
import { isEffectivelyActive } from '../product-status'

describe('isEffectivelyActive', () => {
  it('is true when the product is active and has no warnings', () => {
    expect(isEffectivelyActive({ is_active: true, warnings: [] })).toBe(true)
  })

  it('is false when the product flag is inactive', () => {
    expect(isEffectivelyActive({ is_active: false, warnings: [] })).toBe(false)
  })

  it('is false when the flag is active but the backend attached a warning', () => {
    // e.g. the product's own flag is true but its category is inactive/deleted —
    // ListProductsController's is_active filter already excludes it from "active".
    expect(
      isEffectivelyActive({
        is_active: true,
        warnings: ['The assigned category "Discontinued" is inactive; this product will not appear as active until it is reactivated.'],
      })
    ).toBe(false)
  })
})
