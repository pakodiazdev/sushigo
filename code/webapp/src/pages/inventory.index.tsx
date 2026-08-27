import { createFileRoute } from '@tanstack/react-router'
import { redirectToFirstAllowed } from '@/lib/route-guards'

// The old `/inventory/` landing was a card grid duplicating the sidebar's
// Inventario submenu — an unreachable-by-design duplicate (#441). It forwards
// to the first Inventory section the user can open (Existencias with
// `stock.view`, else the catalog), preserving the old landing's `items.view`
// permission floor rather than always sending them to the `stock.view` page.
export const Route = createFileRoute('/inventory/')({
  beforeLoad: redirectToFirstAllowed('stock.view', '/inventario/existencias', '/inventario/productos'),
})
