import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventory')({
  beforeLoad: requirePermission('items.view'),
  component: InventoryLayout,
})

function InventoryLayout() {
  return <Outlet />
}
