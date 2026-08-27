import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isRedirect } from '@tanstack/react-router'

const mockCan = vi.fn<(permission: string) => boolean>(() => false)

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ can: mockCan }) },
  checkIsAdmin: () => false,
  checkIsSuperAdmin: () => false,
}))

import { Route as LegacyProducts } from '@/pages/inventory/products'
import { Route as LegacyItems } from '@/pages/inventory/items'
import { Route as LegacyItemVariants } from '@/pages/inventory/item-variants'
import { Route as LegacyLocations } from '@/pages/inventory/locations'
import { Route as LegacyInventoryIndex } from '@/pages/inventory.index'
import { Route as LegacyStockDashboard } from '@/pages/stock-dashboard'
import { Route as InventarioIndex } from '@/pages/inventario/index'

beforeEach(() => {
  mockCan.mockReset()
  mockCan.mockReturnValue(false)
})

type RouteLike = { options: { beforeLoad?: unknown; component?: unknown } }

function runBeforeLoad(route: RouteLike): unknown {
  const beforeLoad = route.options.beforeLoad as ((ctx?: unknown) => void) | undefined
  expect(typeof beforeLoad).toBe('function')
  try {
    beforeLoad!()
  } catch (error) {
    return error
  }
  return undefined
}

/**
 * Every released English inventory browser URL forwards to its canonical
 * Spanish `/inventario/*` path (#441) so existing bookmarks and links keep
 * working. These stubs must never render feature UI — a redirect only.
 */
const fixedTargets: Array<[string, RouteLike, string]> = [
  ['/inventory/products', LegacyProducts, '/inventario/productos'],
  ['/inventory/items', LegacyItems, '/inventario/insumos'],
  ['/inventory/item-variants', LegacyItemVariants, '/inventario/variantes'],
  ['/inventory/locations', LegacyLocations, '/inventario/ubicaciones'],
  ['/stock-dashboard', LegacyStockDashboard, '/inventario/existencias'],
]

const landingRoutes: Array<[string, RouteLike]> = [
  ['/inventory/', LegacyInventoryIndex],
  ['/inventario/', InventarioIndex],
]

const allRoutes = [...fixedTargets.map(([, r]) => r), ...landingRoutes.map(([, r]) => r)]

describe('legacy inventory route redirects', () => {
  it.each(fixedTargets)('%s redirects to %s', (_from, route, target) => {
    const thrown = runBeforeLoad(route)
    expect(isRedirect(thrown)).toBe(true)
    expect((thrown as { options: { to: string } }).options.to).toBe(target)
  })

  describe.each(landingRoutes)('%s section landing', (_from, route) => {
    it('sends a stock.view user to Existencias', () => {
      mockCan.mockImplementation((p) => p === 'stock.view')
      const thrown = runBeforeLoad(route)
      expect(isRedirect(thrown)).toBe(true)
      expect((thrown as { options: { to: string } }).options.to).toBe('/inventario/existencias')
    })

    it('sends a user without stock.view to the catalog (items.view floor)', () => {
      const thrown = runBeforeLoad(route)
      expect(isRedirect(thrown)).toBe(true)
      expect((thrown as { options: { to: string } }).options.to).toBe('/inventario/productos')
    })
  })

  it.each(allRoutes.map((r, i) => [i, r] as const))('stub #%i does not declare a component', (_i, route) => {
    expect(route.options.component).toBeUndefined()
  })
})
