/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { forbiddenError } from '@/lib/__tests__/axios-error-fixtures'

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  can: vi.fn((_p: string) => true),
  lastQueryKey: [] as unknown[],
  queryState: {
    data: { data: { data: [], meta: { last_page: 1 } } },
    isLoading: false,
    isError: false,
    isRefetching: false,
    error: undefined,
  } as {
    data: unknown
    isLoading: boolean
    isError: boolean
    isRefetching: boolean
    error: unknown
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: unknown[] }) => {
    mocks.lastQueryKey = opts.queryKey
    return { ...mocks.queryState, refetch: mocks.refetch }
  },
  useMutation: (opts: { onSuccess?: () => void }) => ({
    mutate: () => opts.onSuccess?.(),
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  keepPreviousData: Symbol('keepPreviousData'),
}))

vi.mock('@/lib/route-guards', () => ({ requirePermission: () => () => undefined }))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: mocks.can, isAdmin: false, isSuperAdmin: false }),
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

import { InventoryItemsPage } from '../insumos'

describe('InventoryItemsPage — state contract', () => {
  afterEach(() => {
    cleanup()
    mocks.refetch.mockClear()
    mocks.can.mockReset()
    mocks.can.mockImplementation(() => true)
    mocks.queryState.isLoading = false
    mocks.queryState.isError = false
    mocks.queryState.isRefetching = false
    mocks.queryState.error = undefined
  })

  it('shows the Spanish empty state with no active filters (never the DataGrid English default)', () => {
    const { getByText, queryByText } = render(<InventoryItemsPage />)
    expect(getByText('Aún no hay registros')).toBeDefined()
    expect(queryByText('No data available')).toBeNull()
  })

  it('renders an error state with a working retry action instead of the empty message', () => {
    mocks.queryState.isError = true
    const { getByRole, queryByText } = render(<InventoryItemsPage />)
    expect(queryByText('Aún no hay registros')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Reintentar' }))
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })

  it('shows the refetching indicator while keeping previously-loaded rows visible', () => {
    mocks.queryState.isRefetching = true
    mocks.queryState.data = {
      data: { data: [{ id: '1', sku: 'SKU-1', name: 'Salsa de soya', type: 'INSUMO', is_active: true }], meta: { last_page: 1 } },
    }
    const { getByText } = render(<InventoryItemsPage />)
    expect(getByText('Actualizando…')).toBeDefined()
    expect(getByText('Salsa de soya')).toBeDefined()
  })

  it('hides the create action for a user without items.create', () => {
    mocks.can.mockImplementation((p: string) => p !== 'items.create')
    const { queryByText } = render(<InventoryItemsPage />)
    expect(queryByText('Item Rápido')).toBeNull()
  })

  it('shows the create action for a user with items.create', () => {
    const { getByText } = render(<InventoryItemsPage />)
    expect(getByText('Item Rápido')).toBeDefined()
  })

  it('resets to page 1 when a filter changes while on a later page (Codex review finding)', () => {
    mocks.queryState.data = {
      data: {
        data: [{ id: '1', sku: 'SKU-1', name: 'Salsa de soya', type: 'INSUMO', is_active: true }],
        meta: { last_page: 3 },
      },
    }
    const { getAllByText, getAllByRole } = render(<InventoryItemsPage />)

    // DataGrid renders one pagination <nav> per breakpoint, so multiple "2" buttons exist.
    fireEvent.click(getAllByText('2')[0] as HTMLElement)
    expect(mocks.lastQueryKey[1]).toBe(2)

    // The status <select> (StatusFilterSelect, rendered after the Tipo filter) applies
    // immediately, unlike the debounced SearchInput, so it's the simplest way to trigger a
    // filter change synchronously.
    const [, statusSelect] = getAllByRole('combobox')
    fireEvent.change(statusSelect as HTMLElement, { target: { value: 'active' } })
    expect(mocks.lastQueryKey[1]).toBe(1)
  })

  it('blocks the grid on a 403 even with cached rows, instead of the retryable stale-data state (Codex review finding)', () => {
    mocks.queryState.isError = true
    mocks.queryState.error = forbiddenError()
    mocks.queryState.data = {
      data: { data: [{ id: '1', sku: 'SKU-1', name: 'Salsa de soya', type: 'INSUMO', is_active: true }], meta: { last_page: 1 } },
    }
    const { getByText, queryByText, queryByRole } = render(<InventoryItemsPage />)
    expect(getByText('No tienes permiso para ver esta información')).toBeDefined()
    expect(queryByText('Salsa de soya')).toBeNull()
    expect(queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })
})
