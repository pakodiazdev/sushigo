import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '@/lib/route-guards'

export const Route = createFileRoute('/inventory/items')({
  beforeLoad: redirectTo('/inventario/insumos'),
})
