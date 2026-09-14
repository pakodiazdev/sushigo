import { createLazyFileRoute } from '@tanstack/react-router'
import { StockTransfersPage } from '@/features/inventory/transfers'

export const Route = createLazyFileRoute('/inventario/transferencias')({
  component: StockTransfersPage,
})
