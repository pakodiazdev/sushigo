import type { AssignmentPanelMode } from '../hooks/use-price-list-assignments'
import type { PriceListPanelMode } from '../hooks/use-price-lists'
import type { VariantPricePanelMode } from '../hooks/use-price-list-variant-prices'

const PANEL_TITLE_BY_MODE: Record<PriceListPanelMode, string> = {
  create: 'New Price List',
  edit: 'Edit Price List',
  detail: 'Price List Detail',
}

// Assignments and Variant Prices are sibling sections sharing the same top-level SlidePanel.
// At most one nested form should take the panel over, but this resolver stays deterministic
// even if both modes are accidentally active.
export function resolvePanelTitle(
  panelMode: PriceListPanelMode,
  assignmentMode: AssignmentPanelMode,
  variantPriceMode: VariantPricePanelMode
): string {
  if (panelMode === 'detail' && assignmentMode !== 'list') {
    return 'Price List Assignment'
  }
  if (panelMode === 'detail' && variantPriceMode !== 'list') {
    return 'Variant Price'
  }
  return PANEL_TITLE_BY_MODE[panelMode]
}
