import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'

export const Route = createFileRoute('/inventario/ubicaciones')({
  // stock.view alone must reach this page too (#569): the Location detail
  // panel embeds VariantAssignmentsPanel, which reads variant-assignments
  // under that same permission — a stock.view-only user held only items.view
  // as a gate would never be able to open it.
  beforeLoad: requirePermission('items.view', 'stock.view'),
})
