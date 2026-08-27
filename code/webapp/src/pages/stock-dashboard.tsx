import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '@/lib/route-guards'

export const Route = createFileRoute('/stock-dashboard')({
  beforeLoad: redirectTo('/inventario/existencias'),
})
