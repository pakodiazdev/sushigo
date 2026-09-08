/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  can: vi.fn((_p: string) => true),
  refetchStock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'stock-all') {
      return { data: { data: { data: [] } }, isLoading: false, refetch: mocks.refetchStock }
    }
    return { data: { data: { data: [] } }, isLoading: false }
  },
}))

vi.mock('@/lib/route-guards', () => ({ requirePermission: () => () => undefined }))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { can: (p: string) => boolean }) => unknown) =>
    selector({ can: mocks.can }),
}))

vi.mock('@/components/inventory', () => ({
  OpeningBalanceForm: () => <div data-testid="opening-balance-form" />,
}))

vi.mock('@/features/inventory/replenishment', () => ({
  ReplenishmentPoliciesPanel: () => <div data-testid="replenishment-panel" />,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="slide-panel">{children}</div> : null,
}))

import { StockDashboardPage } from '../existencias'

describe('Existencias — Opening Balance entry point (#570)', () => {
  beforeEach(() => {
    mocks.can.mockReset()
    mocks.can.mockImplementation(() => true)
  })
  afterEach(() => cleanup())

  it('shows the "Registrar saldo inicial" action when the user has stock.manage + the catalog reads', () => {
    const { getAllByText } = render(<StockDashboardPage />)
    expect(getAllByText('Registrar saldo inicial').length).toBeGreaterThan(0)
  })

  it('hides the action for a stock.view-only user', () => {
    mocks.can.mockImplementation((p: string) => p !== 'stock.manage')
    const { queryByText } = render(<StockDashboardPage />)
    expect(queryByText('Registrar saldo inicial')).toBeNull()
    expect(mocks.can).toHaveBeenCalledWith('stock.manage')
  })

  it.each(['inventory_locations.view', 'items.view'])(
    'hides the action for a stock.manage user missing %s (the form selects would 403)',
    (missing) => {
      mocks.can.mockImplementation((p: string) => p !== missing)
      const { queryByText } = render(<StockDashboardPage />)
      expect(queryByText('Registrar saldo inicial')).toBeNull()
    }
  )

  it('opens the Opening Balance panel when the action is clicked', () => {
    const { getAllByText, getByTestId } = render(<StockDashboardPage />)
    const [trigger] = getAllByText('Registrar saldo inicial')
    fireEvent.click(trigger as HTMLElement)
    expect(getByTestId('slide-panel')).toBeDefined()
    expect(getByTestId('opening-balance-form')).toBeDefined()
  })
})
