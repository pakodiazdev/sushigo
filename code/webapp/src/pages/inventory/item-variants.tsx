import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '@/lib/route-guards'

export const Route = createFileRoute('/inventory/item-variants')({
  beforeLoad: redirectTo('/inventario/variantes'),
})
