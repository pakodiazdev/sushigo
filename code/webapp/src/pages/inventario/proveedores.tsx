import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/purchasing/suppliers'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/proveedores')({
  beforeLoad: requirePermission('suppliers.view'),
  component: SuppliersPage,
})
