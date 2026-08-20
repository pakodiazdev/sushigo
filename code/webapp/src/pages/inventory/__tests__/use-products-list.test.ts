// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProductsList } from '../use-products-list'
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
}))

import { brandApi, inventoryCategoryApi, productApi } from '@/services/inventory-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const beverages: InventoryCategory = { id: 'cat-beverages', name: 'Beverages', position: 0, is_active: true }
const cocaCola: Brand = { id: 'brand-coca-cola', name: 'Coca-Cola', is_active: true }

const cocaColaProduct: Product = {
  id: 42,
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

    const created: Product = { ...cocaColaProduct, id: 99, name: 'New Soda' }
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

    expect(productApi.delete).toHaveBeenCalledWith(42)
    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
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
