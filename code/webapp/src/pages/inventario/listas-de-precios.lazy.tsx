import { createLazyFileRoute } from '@tanstack/react-router'
import { PriceListsPage } from '@/features/pricing/price-lists'

export const Route = createLazyFileRoute('/inventario/listas-de-precios')({
  component: PriceListsPage,
})
