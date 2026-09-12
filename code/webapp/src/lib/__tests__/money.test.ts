import { describe, expect, it } from 'vitest'
import { addMoney, minorUnitsToMoney, moneyToMinorUnits } from '../money'

describe('moneyToMinorUnits / minorUnitsToMoney', () => {
  it('round-trips exact amounts', () => {
    expect(moneyToMinorUnits(100)).toBe(10000)
    expect(moneyToMinorUnits(1.23)).toBe(123)
    expect(minorUnitsToMoney(10000)).toBe(100)
    expect(minorUnitsToMoney(123)).toBe(1.23)
  })

  it('rounds half-up to the nearest cent', () => {
    expect(moneyToMinorUnits(1.005)).toBe(101)
    expect(moneyToMinorUnits(1.235)).toBe(124)
  })

  it('rejects a non-finite amount', () => {
    expect(() => moneyToMinorUnits(Number.NaN)).toThrow(TypeError)
    expect(() => moneyToMinorUnits(Number.POSITIVE_INFINITY)).toThrow(TypeError)
  })
})

describe('addMoney', () => {
  it('sums exactly for values that drift under raw binary-float arithmetic', () => {
    expect(0 + 0.1 + 0.2).not.toBe(0.3)
    expect(addMoney(0, 0.1, 0.2)).toBe(0.3)
  })

  it('subtracts via a negated amount', () => {
    expect(addMoney(10, -3.5)).toBe(6.5)
  })

  it('sums an arbitrary number of amounts, including none', () => {
    expect(addMoney()).toBe(0)
    expect(addMoney(1, 2, 3, 4)).toBe(10)
  })
})
