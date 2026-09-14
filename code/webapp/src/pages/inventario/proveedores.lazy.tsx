import { createLazyFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/purchasing/suppliers'

export const Route = createLazyFileRoute('/inventario/proveedores')({
  component: SuppliersPage,
})
