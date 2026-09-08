import { createFileRoute } from '@tanstack/react-router'
import { StockTransfersPage } from '@/features/inventory/transfers'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/transferencias')({
  // Gate on stock.view, the shared inventory-read permission — same as Existencias
  // and Movimientos. The form's own lookups (variant-assignments list, location
  // select) require stock.view / inventory_locations.view server-side, so a
  // stock.manage-only role could never construct a transfer here anyway; every
  // real inventory-operator role bundles stock.view with stock.manage. If the
  // location lookup does 403 (a custom role without inventory_locations.view),
  // StockTransferForm now shows an explanatory banner instead of empty selects.
  beforeLoad: requirePermission('stock.view'),
  component: StockTransfersPage,
})
