import { createLazyFileRoute } from '@tanstack/react-router'
import { MovementsPage } from '@/features/inventory/movements'

export const Route = createLazyFileRoute('/inventario/movimientos')({
  component: MovementsPage,
})
