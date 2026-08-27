// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useProductsList } from '../use-products-list'
import { useProductVariants } from '@/components/products/use-product-variants'
import type { Brand, InventoryCategory, Product } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  productApi: {
    list: vi.fn(),
    delete: vi.fn(),
  },
  brandApi: {
    list: vi.fn(),
  },
  inventoryCategoryApi: {
    list: vi.fn(),
  },
  productVariantApi: {
    list: vi.fn(),
  },
}))

import { brandApi, inventoryCategoryApi, productApi, productVariantApi } from '@/services/inventory-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const beverages: InventoryCategory = { id: 'cat-beverages', name: 'Beverages', position: 0, is_active: true }
const cocaCola: Brand = { id: 'brand-coca-cola', name: 'Coca-Cola', is_active: true }

const cocaColaProduct: Product = {
  id: '42',
  name: 'Coca-Cola Original 600 ml',
  description: null,
  is_active: true,
  brand: { id: 'brand-coca-cola', name: 'Coca-Cola' },
  inventory_category: { id: 'cat-beverages', name: 'Beverages' },
  photo_url: null,
  variants_count: 0,
  warnings: [],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useProductsList', () => {
  beforeEach(() => {
    vi.mocked(brandApi.list).mockResolvedValue({ data: { status: 200, data: [cocaCola] } } as never)
    vi.mocked(inventoryCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [beverages] },
    } as never)
    vi.mocked(productApi.list).mockResolvedValue({
      data: { status: 200, data: [cocaColaProduct], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)
    vi.mocked(productApi.delete).mockResolvedValue({ data: { status: 200 } } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads products, brands and categories', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    expect(result.current.products[0]!.name).toBe('Coca-Cola Original 600 ml')
    expect(result.current.brands).toEqual([cocaCola])
    expect(result.current.categories).toEqual([beverages])
  })

  it('surfaces a toast and isError when the product list fails to load, instead of silently rendering empty', async () => {
    vi.mocked(productApi.list).mockRejectedValue(new Error('Network Error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.products).toEqual([])
    expect(mockShowError).toHaveBeenCalled()
  })

  it('fetches brands and categories unfiltered, so inactive assignments stay selectable in the list filters', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    // Unlike useProductForm's active-only queries, the list filter must let the user
    // narrow down to a brand/category that's since gone inactive — a Product can stay
    // assigned to one and still show up in the list (see ListProductsController).
    expect(brandApi.list).toHaveBeenCalledWith()
    expect(inventoryCategoryApi.list).toHaveBeenCalledWith()
  })

  it('starts with the panel closed', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    expect(result.current.isPanelOpen).toBe(false)
  })

  it('opens the panel in create mode on New Product', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleNewProduct())

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('create')
    expect(result.current.selectedProduct).toBeNull()
  })

  it('opens the panel in detail mode on a row click', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('detail')
    expect(result.current.selectedProduct).toEqual(cocaColaProduct)
  })

  it('transitions from create to detail mode in the same panel instance on a successful create', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleNewProduct())
    expect(result.current.panelMode).toBe('create')
    expect(result.current.isPanelOpen).toBe(true)

    const created: Product = { ...cocaColaProduct, id: '99', name: 'New Soda' }
    act(() => result.current.handleCreated(created))

    // Same panel instance stays open — this is the whole point of the issue.
    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('detail')
    expect(result.current.selectedProduct).toEqual(created)
  })

  it('switches to edit mode without closing the panel', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.handleEdit())

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('edit')
  })

  it('cancelling an edit returns to detail mode, not a second panel', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.handleEdit())
    act(() => result.current.cancelEdit())

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('detail')
  })

  it('updating a product returns to detail mode with the fresh data', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.handleEdit())

    const updated: Product = { ...cocaColaProduct, name: 'Coca-Cola Zero 600 ml' }
    act(() => result.current.handleUpdated(updated))

    expect(result.current.panelMode).toBe('detail')
    expect(result.current.selectedProduct).toEqual(updated)
  })

  it('closes the panel without clearing its content, so the exit animation keeps showing it', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.closePanel())

    expect(result.current.isPanelOpen).toBe(false)
    expect(result.current.selectedProduct).toEqual(cocaColaProduct)
    expect(result.current.panelMode).toBe('detail')
  })

  it('resets to a blank create form the next time it opens for a new product', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.closePanel())
    act(() => result.current.handleNewProduct())

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.selectedProduct).toBeNull()
    expect(result.current.panelMode).toBe('create')
  })

  it('deletes the selected product and closes the panel on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))

    await act(async () => {
      result.current.handleDelete()
    })

    expect(productApi.delete).toHaveBeenCalledWith('42')
    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
    confirmSpy.mockRestore()
  })

  it('excludes the deleted product\'s own Variant query from the post-delete invalidation', async () => {
    // Regression for a real race: closePanel() (called right after invalidateQueries in
    // deleteMutation.onSuccess) only flips isPanelOpen, and that state update hasn't
    // rendered yet at invalidation time — so useProductVariants' own `enabled` gate is
    // still true at this exact point. A plain ['products'] prefix invalidation would
    // therefore still refetch the just-deleted product's Variant query, 404, and surface
    // a spurious error toast right after the delete success toast. Mounts a real, still-
    // enabled observer for that Variant query (mirroring useProductVariants) alongside
    // useProductsList, so this exercises TanStack Query's actual active-refetch behavior
    // rather than just inspecting invalidation flags.
    const variantsFetch = vi.fn().mockResolvedValue({ data: { data: [] } })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = makeWrapper()

    function useProductsListWithVariantObserver() {
      const productsList = useProductsList()
      useQuery({ queryKey: ['products', '42', 'variants'], queryFn: variantsFetch, enabled: true })
      return productsList
    }

    const { result } = renderHook(() => useProductsListWithVariantObserver(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))
    await waitFor(() => expect(variantsFetch).toHaveBeenCalledTimes(1))

    act(() => result.current.handleRowClick(cocaColaProduct))

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
    // Let any (incorrectly) triggered refetch settle before asserting it never happened.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(variantsFetch).toHaveBeenCalledTimes(1)
    // The top-level products list query, which does have its own live observer, must still
    // be targeted by the same invalidation and therefore refetch.
    await waitFor(() => expect(vi.mocked(productApi.list).mock.calls.length).toBeGreaterThan(1))
    confirmSpy.mockRestore()
  })

  it('does not surface an error toast when an already in-flight Variant fetch resolves 404 after a delete', async () => {
    // Regression for a narrower version of the same race: if the user opens a Product and
    // deletes it before its *initial* Variant GET has resolved, the predicate-based
    // invalidation above only stops a *new* refetch — it can't stop one already underway.
    // That in-flight request can still resolve (here, reject, mimicking the 404 the now-
    // deleted product's endpoint would return) after the delete succeeds, and
    // useProductVariants' own isError effect would surface a spurious toast. handleDelete
    // must cancel that query before deleting so TanStack Query discards the late result.
    let rejectVariantsFetch: (error: unknown) => void = () => {}
    vi.mocked(productVariantApi.list).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectVariantsFetch = reject
      }) as never
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = makeWrapper()

    function useProductsListWithVariants() {
      const productsList = useProductsList()
      useProductVariants(productsList.selectedProduct?.id ?? null, productsList.isPanelOpen)
      return productsList
    }

    const { result } = renderHook(() => useProductsListWithVariants(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.handleRowClick(cocaColaProduct))
    await waitFor(() => expect(productVariantApi.list).toHaveBeenCalled())

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))

    // The in-flight GET, still pending this whole time, finally settles well after the
    // delete already succeeded and the panel closed.
    await act(async () => {
      rejectVariantsFetch(new Error('Not Found'))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mockShowError).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('calls onDeleted after a successful delete, so the page can restore focus to a visible control', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDeleted = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList({ onDeleted }), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    confirmSpy.mockRestore()
  })

  it('steps back a page when the last row on a later page is deleted', async () => {
    vi.mocked(productApi.list).mockResolvedValue({
      data: { status: 200, data: [cocaColaProduct], meta: { current_page: 2, total: 16, last_page: 2 } },
    } as never)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.setCurrentPage(2))
    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.handleRowClick(cocaColaProduct))

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(result.current.currentPage).toBe(1))
    confirmSpy.mockRestore()
  })

  it('does not delete when the confirmation is declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))
    act(() => result.current.handleDelete())

    expect(productApi.delete).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows a friendly error when delete fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(productApi.delete).mockRejectedValue(new Error('boom'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    act(() => result.current.handleRowClick(cocaColaProduct))

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('refetches the Variant query after a failed delete, since handleDelete had cancelled it', async () => {
    // Regression: handleDelete cancels the in-flight Variant query before the delete request
    // goes out (see the two tests above) so a slow fetch can't resolve into a spurious toast
    // after a *successful* delete. If the delete then fails instead — e.g. a 409 because the
    // Product still has Variants — that cancellation must not leave the query stuck with no
    // data and no pending fetch on the still-open panel; onError must refetch it.
    vi.mocked(productApi.delete).mockRejectedValue(new Error('Product has existing variants'))
    let resolveFirstFetch: (value: unknown) => void = () => {}
    vi.mocked(productVariantApi.list)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstFetch = resolve
        }) as never
      )
      .mockResolvedValue({ data: { data: [] } } as never)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = makeWrapper()

    function useProductsListWithVariants() {
      const productsList = useProductsList()
      useProductVariants(productsList.selectedProduct?.id ?? null, productsList.isPanelOpen)
      return productsList
    }

    const { result } = renderHook(() => useProductsListWithVariants(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.handleRowClick(cocaColaProduct))
    await waitFor(() => expect(productVariantApi.list).toHaveBeenCalledTimes(1))

    await act(async () => {
      result.current.handleDelete()
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    // The panel stays open since the delete failed — its Variant query must recover.
    expect(result.current.isPanelOpen).toBe(true)
    await waitFor(() => expect(productVariantApi.list).toHaveBeenCalledTimes(2))

    resolveFirstFetch({ data: { data: [] } })
    confirmSpy.mockRestore()
  })

  it('sends brand/category/status/search filters to the API', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => {
      result.current.setSearchQuery('Coca')
      result.current.setBrandFilter('brand-coca-cola')
      result.current.setCategoryFilter('cat-beverages')
      result.current.setStatusFilter('active')
    })

    await waitFor(() =>
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Coca',
          brand_id: 'brand-coca-cola',
          inventory_category_id: 'cat-beverages',
          is_active: true,
        })
      )
    )
  })

  it('resets to page one whenever a filter or the search text changes', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductsList(), { wrapper })

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.setCurrentPage(3))
    expect(result.current.currentPage).toBe(3)

    act(() => result.current.setSearchQuery('Coca'))
    expect(result.current.currentPage).toBe(1)

    act(() => result.current.setCurrentPage(3))
    act(() => result.current.setBrandFilter('brand-coca-cola'))
    expect(result.current.currentPage).toBe(1)

    act(() => result.current.setCurrentPage(3))
    act(() => result.current.setCategoryFilter('cat-beverages'))
    expect(result.current.currentPage).toBe(1)

    act(() => result.current.setCurrentPage(3))
    act(() => result.current.setStatusFilter('active'))
    expect(result.current.currentPage).toBe(1)
  })
})
