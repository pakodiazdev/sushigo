import { createFileRoute } from '@tanstack/react-router'
import { ReceiptsPage } from '@/features/purchasing/receipts'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/recepciones-de-compra')({
  // A receipts.manage-only role (e.g. a receiving clerk) must still reach this page to create
  // receipts — it's the only UI that does, and the create/lookup endpoints already accept
  // receipts.manage on its own (#505 precedent).
  beforeLoad: requirePermission('receipts.view', 'receipts.manage'),
  component: ReceiptsPage,
})
