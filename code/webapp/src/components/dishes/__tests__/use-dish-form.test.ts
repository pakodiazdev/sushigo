// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDishForm } from '../use-dish-form'
import type { Dish, DishCategory } from '@/types/dishes'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/dishes-api', () => ({
  dishApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
  dishCategoryApi: {
    list: vi.fn(),
  },
  dishExtraGroupApi: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  dishExtraOptionApi: {
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

import { dishApi, dishCategoryApi, dishExtraGroupApi, dishExtraOptionApi } from '@/services/dishes-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const rollos: DishCategory = { id: 'cat-rollos', name: 'Rollos', position: 0, is_active: true }
const discontinued: DishCategory = { id: 'cat-discontinued', name: 'Discontinued', position: 1, is_active: false }

const existingDish: Dish = {
  id: 'dish-1',
  dish_category_id: 'cat-rollos',
  name: 'California Roll',
  base_price: 120,
  is_active: true,
  position: 0,
  photo_url: null,
  extra_groups: [],
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

describe('useDishForm', () => {
  beforeEach(() => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [rollos], meta: null },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('excludes inactive categories from the picker in create mode', async () => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [rollos, discontinued], meta: null },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories.length).toBeGreaterThan(0))

    expect(result.current.categories).toEqual([rollos])
  })

  it('keeps the dish\'s own category selectable even if it has since gone inactive', async () => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [{ ...rollos, is_active: false }], meta: null },
    } as never)
    const dishInInactiveCategory: Dish = { ...existingDish, dish_category_id: 'cat-rollos' }
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useDishForm({ dish: dishInInactiveCategory, onSuccess: vi.fn() }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.categories[0]!.id).toBe('cat-rollos')
  })

  it('shows a friendly message (not a raw zod type error) when base price is left empty', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    act(() => {
      // Mirrors what an emptied <input type="number"> + valueAsNumber produces.
      result.current.setValue('base_price', NaN)
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(dishApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.base_price).toBe('Base price is required')
  })

  it('defaults to create mode with no dish', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.isEditing).toBe(false)
    expect(result.current.extraGroups).toEqual([])
  })

  it('is in editing mode with an existing dish and seeds extra groups', async () => {
    const dishWithExtras: Dish = {
      ...existingDish,
      extra_groups: [
        {
          id: 'group-1',
          dish_id: 'dish-1',
          name: 'Elige tu salsa',
          is_required: true,
          selection_type: 'SINGLE',
          options: [],
        },
      ],
    }
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: dishWithExtras, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    expect(result.current.isEditing).toBe(true)
    expect(result.current.extraGroups).toHaveLength(1)
    expect(result.current.extraGroups[0]!.name).toBe('Elige tu salsa')
  })

  it('creates the dish on submit and calls onSuccess', async () => {
    vi.mocked(dishApi.create).mockResolvedValue({
      data: { status: 201, data: { ...existingDish, id: 'dish-new' } },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: null, onSuccess }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        dish_category_id: 'cat-rollos',
        name: 'Spicy Tuna Roll',
        description: '',
        base_price: 135,
        is_active: true,
      })
    })

    expect(dishApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Spicy Tuna Roll', base_price: 135 })
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('files a new dish after the existing ones in its category instead of always at position 0', async () => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [{ ...rollos, dishes_count: 3 }], meta: null },
    } as never)
    vi.mocked(dishApi.create).mockResolvedValue({
      data: { status: 201, data: { ...existingDish, id: 'dish-new' } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: null, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        dish_category_id: 'cat-rollos',
        name: 'Spicy Tuna Roll',
        description: '',
        base_price: 135,
        is_active: true,
      })
    })

    expect(dishApi.create).toHaveBeenCalledWith(expect.objectContaining({ position: 3 }))
  })

  it('does not send a position when updating an existing dish', async () => {
    vi.mocked(dishApi.update).mockResolvedValue({ data: { status: 200, data: existingDish } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: existingDish, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        dish_category_id: 'cat-rollos',
        name: 'California Roll',
        description: '',
        base_price: 120,
        is_active: true,
      })
    })

    expect(dishApi.update).toHaveBeenCalledWith(
      'dish-1',
      expect.not.objectContaining({ position: expect.anything() })
    )
  })

  it('updates the dish on submit when editing', async () => {
    vi.mocked(dishApi.update).mockResolvedValue({
      data: { status: 200, data: existingDish },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: existingDish, onSuccess }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.onSubmit({
        dish_category_id: 'cat-rollos',
        name: 'California Roll Updated',
        description: '',
        base_price: 130,
        is_active: true,
      })
    })

    expect(dishApi.update).toHaveBeenCalledWith(
      'dish-1',
      expect.objectContaining({ name: 'California Roll Updated' })
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('adds an extra group and appends it to local state', async () => {
    vi.mocked(dishExtraGroupApi.create).mockResolvedValue({
      data: {
        status: 201,
        data: {
          id: 'group-2',
          dish_id: 'dish-1',
          name: 'Nivel de picor',
          is_required: false,
          selection_type: 'SINGLE',
        },
      },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: existingDish, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))

    await act(async () => {
      await result.current.addExtraGroup({ name: 'Nivel de picor', selectionType: 'SINGLE', isRequired: false })
    })

    expect(dishExtraGroupApi.create).toHaveBeenCalledWith({
      dish_id: 'dish-1',
      name: 'Nivel de picor',
      selection_type: 'SINGLE',
      is_required: false,
    })
    expect(result.current.extraGroups).toHaveLength(1)
    expect(result.current.extraGroups[0]!.name).toBe('Nivel de picor')
  })

  it('removes an extra group from local state', async () => {
    const dishWithExtras: Dish = {
      ...existingDish,
      extra_groups: [
        {
          id: 'group-1',
          dish_id: 'dish-1',
          name: 'Elige tu salsa',
          is_required: true,
          selection_type: 'SINGLE',
          options: [],
        },
      ],
    }
    vi.mocked(dishExtraGroupApi.delete).mockResolvedValue({ data: { status: 204 } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: dishWithExtras, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.extraGroups).toHaveLength(1))

    await act(async () => {
      await result.current.removeExtraGroup('group-1')
    })

    expect(dishExtraGroupApi.delete).toHaveBeenCalledWith('group-1')
    expect(result.current.extraGroups).toHaveLength(0)
  })

  it('adds an option to the right group', async () => {
    const dishWithExtras: Dish = {
      ...existingDish,
      extra_groups: [
        {
          id: 'group-1',
          dish_id: 'dish-1',
          name: 'Elige tu salsa',
          is_required: true,
          selection_type: 'SINGLE',
          options: [],
        },
      ],
    }
    vi.mocked(dishExtraOptionApi.create).mockResolvedValue({
      data: {
        status: 201,
        data: {
          id: 'opt-1',
          dish_extra_group_id: 'group-1',
          name: 'Soya',
          price_delta: 0,
          is_active: true,
          position: 0,
        },
      },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: dishWithExtras, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.extraGroups).toHaveLength(1))

    await act(async () => {
      await result.current.addExtraOption('group-1', { name: 'Soya', priceDelta: 0 })
    })

    expect(dishExtraOptionApi.create).toHaveBeenCalledWith({
      dish_extra_group_id: 'group-1',
      name: 'Soya',
      price_delta: 0,
    })
    expect(result.current.extraGroups[0]!.options).toHaveLength(1)
  })

  it('removes an option from the right group', async () => {
    const dishWithExtras: Dish = {
      ...existingDish,
      extra_groups: [
        {
          id: 'group-1',
          dish_id: 'dish-1',
          name: 'Elige tu salsa',
          is_required: true,
          selection_type: 'SINGLE',
          options: [
            { id: 'opt-1', dish_extra_group_id: 'group-1', name: 'Soya', price_delta: 0, is_active: true, position: 0 },
          ],
        },
      ],
    }
    vi.mocked(dishExtraOptionApi.delete).mockResolvedValue({ data: { status: 204 } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishForm({ dish: dishWithExtras, onSuccess: vi.fn() }), { wrapper })

    await waitFor(() => expect(result.current.extraGroups[0]!.options).toHaveLength(1))

    await act(async () => {
      await result.current.removeExtraOption('group-1', 'opt-1')
    })

    expect(dishExtraOptionApi.delete).toHaveBeenCalledWith('opt-1')
    expect(result.current.extraGroups[0]!.options).toHaveLength(0)
  })
})
