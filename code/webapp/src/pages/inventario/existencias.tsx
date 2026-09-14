import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/existencias')({
  beforeLoad: requirePermission('stock.view'),
})
