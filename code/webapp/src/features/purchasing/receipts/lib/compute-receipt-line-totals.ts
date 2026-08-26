/**
 * Mirrors ReceiptService::createLine() on the backend exactly (code/api/app/Services/Inventory/ReceiptService.php)
 * so the UI preview always matches the canonical posted evidence — never a client-side approximation.
 */
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
  const netAcquisitionAmount = grossAmount - discounts + allocatedExpenses + nonRecoverableTaxes
  const effectiveUnitCost = baseUnitsReceived > 0 ? netAcquisitionAmount / baseUnitsReceived : 0

  return { baseUnitsReceived, netAcquisitionAmount, effectiveUnitCost }
}
