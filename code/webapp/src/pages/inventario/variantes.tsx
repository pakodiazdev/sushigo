import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/variantes')({
  beforeLoad: requirePermission('items.view'),
})
