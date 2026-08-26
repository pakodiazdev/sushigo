import { describe, expect, it } from 'vitest'
import { computeReceiptLineTotals } from '../compute-receipt-line-totals'

describe('computeReceiptLineTotals', () => {
  it('reproduces the backend example: a box x24 receipt with allocated expenses', () => {
    const totals = computeReceiptLineTotals({
      receivedPackages: 10,
      presentationFactor: 24,
      grossAmount: 4800,
      discounts: 0,
      allocatedExpenses: 150,
      nonRecoverableTaxes: 0,
    })

    expect(totals.baseUnitsReceived).toBe(240)
    expect(totals.netAcquisitionAmount).toBe(4950)
    expect(totals.effectiveUnitCost).toBeCloseTo(20.625, 6)
  })

  it('lowers effective unit cost when bonus packages inflate base units without inflating gross amount', () => {
    const baseline = computeReceiptLineTotals({
      receivedPackages: 10,
      presentationFactor: 24,
      grossAmount: 4800,
      discounts: 0,
      allocatedExpenses: 0,
      nonRecoverableTaxes: 0,
    })
    const withBonus = computeReceiptLineTotals({
      receivedPackages: 10, // 8 paid + 2 bonus, same total received
      presentationFactor: 24,
      grossAmount: 3840, // only the 8 paid packages are billed
      discounts: 0,
      allocatedExpenses: 0,
      nonRecoverableTaxes: 0,
    })

    expect(baseline.effectiveUnitCost).toBe(20)
    expect(withBonus.effectiveUnitCost).toBe(16)
  })

  it('never divides by zero when received packages is zero', () => {
    const totals = computeReceiptLineTotals({
      receivedPackages: 0,
      presentationFactor: 24,
      grossAmount: 0,
      discounts: 0,
      allocatedExpenses: 0,
      nonRecoverableTaxes: 0,
    })

    expect(totals.baseUnitsReceived).toBe(0)
    expect(totals.effectiveUnitCost).toBe(0)
  })

  it('subtracts discounts and adds expenses and non-recoverable taxes into the net amount', () => {
    const totals = computeReceiptLineTotals({
      receivedPackages: 5,
      presentationFactor: 10,
      grossAmount: 1000,
      discounts: 100,
      allocatedExpenses: 50,
      nonRecoverableTaxes: 25,
    })

    expect(totals.netAcquisitionAmount).toBe(975)
    expect(totals.baseUnitsReceived).toBe(50)
    expect(totals.effectiveUnitCost).toBe(19.5)
  })
})
