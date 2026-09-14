import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/listas-de-precios')({
  beforeLoad: requirePermission('price_lists.view'),
})
