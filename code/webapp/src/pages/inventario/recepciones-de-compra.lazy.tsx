import { createLazyFileRoute } from '@tanstack/react-router'
import { ReceiptsPage } from '@/features/purchasing/receipts'

export const Route = createLazyFileRoute('/inventario/recepciones-de-compra')({
  component: ReceiptsPage,
})
