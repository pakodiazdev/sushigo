import type { AssignmentPanelMode } from '../hooks/use-price-list-assignments'
import type { PriceListPanelMode } from '../hooks/use-price-lists'
import type { VariantPricePanelMode } from '../hooks/use-price-list-variant-prices'

const PANEL_TITLE_BY_MODE: Record<PriceListPanelMode, string> = {
  create: 'Nueva lista de precios',
  edit: 'Editar lista de precios',
  detail: 'Detalle de la lista de precios',
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
    return 'Asignación de lista de precios'
  }
  if (panelMode === 'detail' && variantPriceMode !== 'list') {
    return 'Precio de variante'
  }
  return PANEL_TITLE_BY_MODE[panelMode]
}
