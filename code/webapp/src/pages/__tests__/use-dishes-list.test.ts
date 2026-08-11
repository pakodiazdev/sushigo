// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDishesList } from '../use-dishes-list'
import type { Dish, DishCategory } from '@/types/dishes'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/dishes-api', () => ({
  dishApi: {
    list: vi.fn(),
    delete: vi.fn(),
  },
  dishCategoryApi: {
    list: vi.fn(),
  },
}))

import { dishApi, dishCategoryApi } from '@/services/dishes-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const rollos: DishCategory = { id: 'cat-rollos', name: 'Rollos', position: 0, is_active: true }
const ramen: DishCategory = { id: 'cat-ramen', name: 'Ramen', position: 1, is_active: true }

const californiaRoll: Dish = {
  id: 'dish-1',
  dish_category_id: 'cat-rollos',
  name: 'California Roll',
  base_price: 120,
  is_active: true,
  position: 0,
  photo_url: null,
}

const tonkotsuRamen: Dish = {
  id: 'dish-2',
  dish_category_id: 'cat-ramen',
  name: 'Tonkotsu Ramen',
  base_price: 145,
  is_active: true,
  position: 0,
  photo_url: null,
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

describe('useDishesList', () => {
  beforeEach(() => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [rollos, ramen], meta: null },
    } as never)
    vi.mocked(dishApi.list).mockResolvedValue({
      data: { status: 200, data: [californiaRoll, tonkotsuRamen], meta: null },
    } as never)
    vi.mocked(dishApi.delete).mockResolvedValue({ data: { status: 204 } } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('stays loading until both dishes and categories have resolved', async () => {
    let resolveCategories: (value: unknown) => void = () => {}
    vi.mocked(dishCategoryApi.list).mockReturnValue(
      new Promise((resolve) => {
        resolveCategories = resolve
      }) as never
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    // Dishes resolve immediately (mocked above); categories are still pending.
    await waitFor(() => expect(result.current.groups).toEqual([]))
    expect(result.current.isLoading).toBe(true)

    resolveCategories({ data: { status: 200, data: [rollos, ramen], meta: null } })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('falls back to an ungrouped list and shows an error toast when categories fail to load', async () => {
    vi.mocked(dishCategoryApi.list).mockRejectedValue(new Error('network error'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0]!.category.name).toBe('All Dishes')
    expect(result.current.groups[0]!.dishes).toEqual([californiaRoll, tonkotsuRamen])
    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })

  it('shows no groups (not a false "All Dishes" group) when both categories and dishes are empty', async () => {
    vi.mocked(dishCategoryApi.list).mockRejectedValue(new Error('network error'))
    vi.mocked(dishApi.list).mockResolvedValue({ data: { status: 200, data: [], meta: null } } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.groups).toHaveLength(0)
  })

  it('groups dishes by category in category display order', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.groups).toHaveLength(2)
    expect(result.current.groups[0]!.category.name).toBe('Rollos')
    expect(result.current.groups[0]!.dishes).toEqual([californiaRoll])
    expect(result.current.groups[1]!.category.name).toBe('Ramen')
    expect(result.current.groups[1]!.dishes).toEqual([tonkotsuRamen])
  })

  it('omits categories with no dishes in the current result set', async () => {
    vi.mocked(dishApi.list).mockResolvedValue({
      data: { status: 200, data: [californiaRoll], meta: null },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0]!.category.name).toBe('Rollos')
  })

  it('re-fetches dishes when the search query changes', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setSearchQuery('roll')
    })

    await waitFor(() => {
      expect(dishApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'roll' })
      )
    })
  })

  it('opens the details panel with the selected dish on row click', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.handleRowClick(californiaRoll)
    })

    expect(result.current.selectedDish).toEqual(californiaRoll)
    expect(result.current.isDetailsPanelOpen).toBe(true)
  })

  it('opens the form panel for a new dish with no selection', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.handleRowClick(californiaRoll)
    })
    act(() => {
      result.current.handleNewDish()
    })

    expect(result.current.selectedDish).toBeNull()
    expect(result.current.isFormPanelOpen).toBe(true)
  })

  it('deletes a dish after the user confirms and shows a success toast', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.handleDelete('dish-1')
    })

    await waitFor(() => expect(dishApi.delete).toHaveBeenCalledWith('dish-1'))
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled())
    vi.unstubAllGlobals()
  })

  it('does not delete when the user cancels the confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishesList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.handleDelete('dish-1')
    })

    expect(dishApi.delete).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
