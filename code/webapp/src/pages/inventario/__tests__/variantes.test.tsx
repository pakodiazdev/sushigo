/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  can: vi.fn((_p: string) => true),
  lastQueryKey: [] as unknown[],
  queryState: {
    data: { data: { data: [], meta: { last_page: 1 } } },
    isLoading: false,
    isError: false,
    isRefetching: false,
  } as {
    data: unknown
    isLoading: boolean
    isError: boolean
    isRefetching: boolean
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

import { ItemVariantsPage } from '../variantes'

describe('ItemVariantsPage — state contract', () => {
  afterEach(() => {
    cleanup()
    mocks.refetch.mockClear()
    mocks.can.mockReset()
    mocks.can.mockImplementation(() => true)
    mocks.queryState.isLoading = false
    mocks.queryState.isError = false
    mocks.queryState.isRefetching = false
  })

  it('shows the Spanish empty state with no active filters', () => {
    const { getByText, queryByText } = render(<ItemVariantsPage />)
    expect(getByText('Aún no hay registros')).toBeDefined()
    expect(queryByText('No data available')).toBeNull()
  })

  it('renders an error state with a working retry action', () => {
    mocks.queryState.isError = true
    const { getByRole } = render(<ItemVariantsPage />)
    fireEvent.click(getByRole('button', { name: 'Reintentar' }))
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })

  it('hides the create action for a user without items.create', () => {
    mocks.can.mockImplementation((p: string) => p !== 'items.create')
    const { queryByText } = render(<ItemVariantsPage />)
    expect(queryByText('Nueva Variante')).toBeNull()
  })

  it('resets to page 1 when the status filter changes while on a later page (Codex review finding)', () => {
    mocks.queryState.data = {
      data: {
        data: [{ id: '1', code: 'V1', name: 'Variante', is_active: true }],
        meta: { last_page: 3 },
      },
    }
    const { getAllByText, getByRole } = render(<ItemVariantsPage />)

    fireEvent.click(getAllByText('2')[0] as HTMLElement)
    expect(mocks.lastQueryKey[1]).toBe(2)

    fireEvent.change(getByRole('combobox'), { target: { value: 'active' } })
    expect(mocks.lastQueryKey[1]).toBe(1)
  })
})
