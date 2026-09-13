/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Supplier, SupplierOffering } from '../../types'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  supplierUpdate: vi.fn().mockResolvedValue({}),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  suppliersError: false,
}))

const supplier = {
  id: 's1', code: 'MAR', name: 'Mar del Norte', contact_name: 'Ana', email: 'ana@example.com',
  phone: '555', is_active: true, offerings_count: 1,
} satisfies Supplier
const offering = {
  id: 'o1', supplier: { id: 's1', code: 'MAR', name: 'Mar del Norte' }, supplier_code: 'BOX-1',
  quoted_price: 480, currency: 'MXN', valid_from: null, valid_until: null, minimum_order_quantity: 2,
  lead_time_days: 3, is_active: true,
  presentation: {
    id: 'pp1', package_barcode: null,
    template: { id: 't1', code: 'BOX', name: 'Caja', package_type: 'BOX', base_unit_quantity: 12 },
    variant: { id: 'v1', code: 'SAL', name: 'Entero', product: { id: 'p1', name: 'Salmón' } },
  },
} satisfies SupplierOffering

const refetchSuppliers = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'suppliers'
    ? { data: { data: { data: [supplier] } }, isLoading: false, isError: mocks.suppliersError, refetch: refetchSuppliers }
    : { data: { data: { data: [offering] } }, isLoading: false },
  useMutation: (config: { mutationFn: (value: Supplier) => Promise<unknown>; onSuccess: () => void }) => ({
    mutate: async (value: Supplier) => {
      await config.mutationFn(value)
      config.onSuccess()
    },
  }),
  keepPreviousData: Symbol('keepPreviousData'),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { can: () => boolean }) => boolean) => selector({ can: () => true }),
}))
vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError }),
}))
vi.mock('../../api/supplier-api', () => ({
  supplierApi: { list: vi.fn(), update: mocks.supplierUpdate },
  supplierOfferingApi: { list: vi.fn() },
}))

import { useSuppliersPage } from '../use-suppliers-page'

describe('useSuppliersPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.suppliersError = false
  })

  it('exposes suppliersError from the query and lets the page retry it', () => {
    mocks.suppliersError = true
    const { result } = renderHook(() => useSuppliersPage())

    expect(result.current.suppliersError).toBe(true)
    result.current.refetchSuppliers()
    expect(refetchSuppliers).toHaveBeenCalledOnce()
  })

  it('reports hasActiveFilters and clears search/status together', () => {
    const { result } = renderHook(() => useSuppliersPage())
    expect(result.current.hasActiveFilters).toBe(false)

    act(() => result.current.setSearch('Mar'))
    expect(result.current.hasActiveFilters).toBe(true)

    act(() => result.current.clearFilters())
    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.search).toBe('')
  })

  it('owns supplier and offering panel state', () => {
    const { result } = renderHook(() => useSuppliersPage())

    act(() => result.current.openSupplier(supplier))
    expect(result.current.selectedSupplier).toEqual(supplier)

    act(() => result.current.openNewOffering())
    expect(result.current.offeringFormOpen).toBe(true)

    act(() => result.current.openOffering(offering))
    expect(result.current.selectedOffering).toEqual(offering)
  })

  it('deactivates the selected supplier and preserves it in local detail state', async () => {
    const { result } = renderHook(() => useSuppliersPage())
    act(() => result.current.openSupplier(supplier))

    await act(async () => result.current.deactivateSelectedSupplier())

    expect(mocks.supplierUpdate).toHaveBeenCalledWith('s1', { is_active: false })
    expect(result.current.selectedSupplier?.is_active).toBe(false)
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['suppliers'] })
    expect(mocks.showSuccess).toHaveBeenCalled()
  })
})
