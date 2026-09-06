import { createFileRoute } from '@tanstack/react-router'
import { StockTransfersPage } from '@/features/inventory/transfers'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/transferencias')({
  // A stock.manage-only role must still reach this page to create transfers — it's
  // the only UI that does, and the write endpoints already accept stock.manage on
  // its own (mirrors the receipts page precedent).
  beforeLoad: requirePermission('stock.view', 'stock.manage'),
  component: StockTransfersPage,
})
