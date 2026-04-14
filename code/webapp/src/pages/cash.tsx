import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/cash')({
  beforeLoad: requirePermission('cash_registers.view'),
  component: CashLayout,
})

function CashLayout() {
  return <Outlet />
}
