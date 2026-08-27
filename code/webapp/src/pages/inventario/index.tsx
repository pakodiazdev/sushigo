import { createFileRoute } from '@tanstack/react-router'
import { redirectToFirstAllowed } from '@/lib/route-guards'

// `/inventario` has no landing screen of its own (#441). Send each user to the
// first section they can actually open: Existencias if they hold `stock.view`,
// otherwise the catalog (`items.view`) — matching the permission floor of the
// old card-grid landing this replaced.
export const Route = createFileRoute('/inventario/')({
  beforeLoad: redirectToFirstAllowed('stock.view', '/inventario/existencias', '/inventario/productos'),
})
