import { addMoney } from '@/lib/money'

/**
 * Mirrors ReceiptService::createLine() on the backend exactly (code/api/app/Services/Inventory/ReceiptService.php)
 * so the UI preview always matches the canonical posted evidence — never a client-side approximation.
 *
 * `netAcquisitionAmount` uses `addMoney()` (#415, per TD-05) instead of raw `+`/`-` so the
 * preview never drifts from the backend's exact `Money` arithmetic on the same inputs —
 * `baseUnitsReceived`/`effectiveUnitCost` stay plain float division for this phase, matching
 * the backend's own Phase-1 scope (see doc/architecture/finance/monetary-value-contract.en.md).
 *
 * This function runs on every keystroke as a live preview (`ReceiptLineFields` calls it
 * straight from `watch()`ed field values, ahead of the form's own async zod validation
 * settling) — a user can transiently type an all-digit amount large enough for `Number(...)`
 * to become `Infinity` before validation ever flags it. `addMoney()`/`moneyToMinorUnits()`
 * intentionally throw on a non-finite amount for their normal callers (a real defect at that
 * boundary should fail loud, not silently coerce), so a *preview* input is sanitized to `0`
 * here first rather than weakening that primitive's contract for every other caller.
 */
function toFiniteMoneyInput(value: number): number {
  return Number.isFinite(value) ? value : 0
}
export interface ReceiptLineTotalsInput {
  receivedPackages: number
  presentationFactor: number
  grossAmount: number
  discounts: number
  allocatedExpenses: number
  nonRecoverableTaxes: number
}

export interface ReceiptLineTotals {
  baseUnitsReceived: number
  netAcquisitionAmount: number
  effectiveUnitCost: number
}

export function computeReceiptLineTotals({
  receivedPackages,
  presentationFactor,
  grossAmount,
  discounts,
  allocatedExpenses,
  nonRecoverableTaxes,
}: ReceiptLineTotalsInput): ReceiptLineTotals {
  const baseUnitsReceived = receivedPackages * presentationFactor
  const netAcquisitionAmount = addMoney(
    toFiniteMoneyInput(grossAmount),
    -toFiniteMoneyInput(discounts),
    toFiniteMoneyInput(allocatedExpenses),
    toFiniteMoneyInput(nonRecoverableTaxes)
  )
  const effectiveUnitCost = baseUnitsReceived > 0 ? netAcquisitionAmount / baseUnitsReceived : 0

  return { baseUnitsReceived, netAcquisitionAmount, effectiveUnitCost }
}
