// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProductForm } from '../use-product-form'
import type { Brand, InventoryCategory, Product } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  productApi: {
    create: vi.fn(),
    update: vi.fn(),
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
const discontinuedCategory: InventoryCategory = { id: 'cat-old', name: 'Discontinued', position: 1, is_active: false }

const cocaCola: Brand = { id: 'brand-coca-cola', name: 'Coca-Cola', is_active: true }
const discontinuedBrand: Brand = { id: 'brand-old', name: 'Old Brand', is_active: false }

const existingProduct: Product = {
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

describe('useProductForm', () => {
  beforeEach(() => {
    vi.mocked(brandApi.list).mockResolvedValue({ data: { status: 200, data: [cocaCola] } } as never)
    vi.mocked(inventoryCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [beverages] },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to create mode with no product', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.isEditing).toBe(false)
  })

  it('is in editing mode with an existing product', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: existingProduct, onSuccess: vi.fn() }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.isEditing).toBe(true)
  })

  it('includes inactive categories but excludes inactive brands from the pickers in create mode', async () => {
    // CreateProductRequest/UpdateProductRequest only reject a soft-deleted category, not
    // merely an inactive one (unlike brand_id, which requires is_active) — so the
    // category picker must offer inactive-but-not-deleted rows too, while brands stay
    // active-only.
    vi.mocked(inventoryCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [beverages, discontinuedCategory] },
    } as never)
    vi.mocked(brandApi.list).mockResolvedValue({
      data: { status: 200, data: [cocaCola, discontinuedBrand] },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories.length).toBeGreaterThan(0))

    expect(result.current.categories).toEqual([beverages, discontinuedCategory])
    expect(result.current.brands).toEqual([cocaCola])
  })

  it("keeps the product's own inactive brand selectable when editing", async () => {
    // The real backend filters is_active=true server-side for brands (see
    // ListBrandsController), so once the product's assigned brand goes inactive, the
    // list endpoint never returns it at all — mock that faithfully instead of
    // unrealistically still including it. Categories aren't filtered this way (see
    // above), so no merge is needed on that side.
    vi.mocked(inventoryCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [beverages] },
    } as never)
    vi.mocked(brandApi.list).mockResolvedValue({
      data: { status: 200, data: [] },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: existingProduct, onSuccess: vi.fn() }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.categories[0]!.id).toBe('cat-beverages')
    expect(result.current.brands[0]!.id).toBe('brand-coca-cola')
  })

  it('does not duplicate the current assignment when the API still returns it', async () => {
    vi.mocked(inventoryCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [beverages] },
    } as never)
    vi.mocked(brandApi.list).mockResolvedValue({
      data: { status: 200, data: [cocaCola] },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: existingProduct, onSuccess: vi.fn() }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.brands).toHaveLength(1)
  })

  it('rejects a name shorter than 2 characters with a friendly message', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    act(() => {
      result.current.setValue('name', 'A')
      result.current.setValue('inventory_category_id', 'cat-beverages')
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(productApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.name).toBe('Name must be at least 2 characters')
  })

  it('requires a category', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    act(() => {
      result.current.setValue('name', 'New Product')
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(productApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.inventory_category_id).toBe('Category is required')
  })

  it('creates the product on submit and calls onSuccess with the saved Product', async () => {
    const created: Product = { ...existingProduct, id: 99, name: 'New Soda' }
    vi.mocked(productApi.create).mockResolvedValue({ data: { status: 201, data: created } } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        name: 'New Soda',
        inventory_category_id: 'cat-beverages',
        brand_id: '',
        description: '',
        is_active: true,
      })
    })

    expect(productApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Soda',
        inventory_category_id: 'cat-beverages',
        brand_id: null,
      })
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created))
  })

  it('sends the selected brand_id when one is chosen', async () => {
    vi.mocked(productApi.create).mockResolvedValue({
      data: { status: 201, data: existingProduct },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        name: 'New Soda',
        inventory_category_id: 'cat-beverages',
        brand_id: 'brand-coca-cola',
        description: '',
        is_active: true,
      })
    })

    expect(productApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ brand_id: 'brand-coca-cola' })
    )
  })

  it('updates the product on submit when editing, including clearing a brand', async () => {
    vi.mocked(productApi.update).mockResolvedValue({
      data: { status: 200, data: existingProduct },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: existingProduct, onSuccess }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        name: 'Coca-Cola Original 600 ml',
        inventory_category_id: 'cat-beverages',
        brand_id: '',
        description: '',
        is_active: true,
      })
    })

    expect(productApi.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ brand_id: null })
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('surfaces server-side validation errors alongside client ones', async () => {
    const error = new AxiosError(
      'Validation failed',
      '422',
      undefined,
      undefined,
      {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as never,
        data: { status: 422, message: 'Validation failed', errors: { name: ['Name already taken'] } },
      } as never
    )
    vi.mocked(productApi.create).mockRejectedValue(error)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductForm({ product: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        name: 'Duplicate Name',
        inventory_category_id: 'cat-beverages',
        brand_id: '',
        description: '',
        is_active: true,
      })
    })

    await waitFor(() => expect(result.current.allErrors.name).toBe('Name already taken'))
  })
})
