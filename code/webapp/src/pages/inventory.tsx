import { createFileRoute, Outlet } from '@tanstack/react-router'

// Passthrough layout for the legacy `/inventory/*` browser routes, which are
// now redirect-only stubs pointing at the canonical Spanish `/inventario/*`
// tree (#441). No permission guard here — each redirect child forwards before
// any page renders, and gating a redirect behind `items.view` would send a
// stock-only user to `/unauthorized` instead of their destination.
export const Route = createFileRoute('/inventory')({
  component: InventoryLegacyLayout,
})

function InventoryLegacyLayout() {
  return <Outlet />
}
