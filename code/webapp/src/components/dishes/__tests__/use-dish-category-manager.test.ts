// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDishCategoryManager } from '../use-dish-category-manager'
import type { DishCategory } from '@/types/dishes'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/dishes-api', () => ({
  dishCategoryApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { dishCategoryApi } from '@/services/dishes-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const rollos: DishCategory = { id: 'cat-rollos', name: 'Rollos', position: 0, is_active: true, dishes_count: 2 }
const ramen: DishCategory = { id: 'cat-ramen', name: 'Ramen', position: 1, is_active: true, dishes_count: 1 }

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

describe('useDishCategoryManager', () => {
  beforeEach(() => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [rollos, ramen], meta: null },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sorts categories by position', async () => {
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [ramen, rollos], meta: null },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    expect(result.current.categories[0]!.name).toBe('Rollos')
    expect(result.current.categories[1]!.name).toBe('Ramen')
  })

  it('does not create a category when the name is blank', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.createCategory()
    })

    expect(dishCategoryApi.create).not.toHaveBeenCalled()
  })

  it('creates a category with the next position and shows a success toast', async () => {
    vi.mocked(dishCategoryApi.create).mockResolvedValue({
      data: { status: 201, data: { id: 'cat-3', name: 'Postres', position: 2, is_active: true } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    act(() => {
      result.current.form.setValue('name', 'Postres')
    })

    await act(async () => {
      await result.current.createCategory()
    })

    expect(dishCategoryApi.create).toHaveBeenCalledWith({ name: 'Postres', position: 2 })
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled())
    expect(result.current.form.getValues('name')).toBe('')
  })

  it('appends after the highest existing position, not categories.length, when positions are sparse', async () => {
    // Both seeded at position 0 (API defaults position to 0 when omitted) — categories.length
    // (2) would collide with neither, but would also silently ignore a legitimately higher
    // existing position elsewhere in a larger sparse set. Using max+1 is the invariant that
    // actually holds regardless of how contiguous the existing positions are.
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [{ ...rollos, position: 0 }, { ...ramen, position: 5 }], meta: null },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    act(() => {
      result.current.form.setValue('name', 'Postres')
    })

    await act(async () => {
      await result.current.createCategory()
    })

    expect(dishCategoryApi.create).toHaveBeenCalledWith({ name: 'Postres', position: 6 })
  })

  it('shows an error toast when creation fails', async () => {
    vi.mocked(dishCategoryApi.create).mockRejectedValue(new Error('boom'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    act(() => {
      result.current.form.setValue('name', 'Postres')
    })

    await act(async () => {
      await result.current.createCategory()
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })

  it('toggles a category active state', async () => {
    vi.mocked(dishCategoryApi.update).mockResolvedValue({
      data: { status: 200, data: { ...rollos, is_active: false } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.toggleActive(rollos)
    })

    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-rollos', { is_active: false })
  })

  it('swaps positions with the next category when moving down', async () => {
    vi.mocked(dishCategoryApi.update).mockResolvedValue({ data: { status: 200, data: rollos } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.move(rollos, 'down')
    })

    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-rollos', { position: 1 })
    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-ramen', { position: 0 })
  })

  it('still reassigns a distinct position when the two categories share the same stored position', async () => {
    // Duplicate positions are possible since the API defaults position to 0 when omitted —
    // swapping the two categories' own (equal) position values would be a no-op. dupeRamen's
    // renumbered position (0) happens to already match its stored value, so only the moved
    // category needs an update.
    const dupeRollos = { ...rollos, position: 0 }
    const dupeRamen = { ...ramen, position: 0 }
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [dupeRollos, dupeRamen], meta: null },
    } as never)
    vi.mocked(dishCategoryApi.update).mockResolvedValue({ data: { status: 200, data: dupeRollos } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.move(dupeRollos, 'down')
    })

    expect(dishCategoryApi.update).toHaveBeenCalledTimes(1)
    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-rollos', { position: 1 })
  })

  it('leaves an unaffected category alone and renumbers only the moved pair when positions are sparse', async () => {
    // Sparse/gapped positions (e.g. left over from earlier operations) must not let a
    // two-way stored-value swap put an untouched third category out of order or collide
    // with one of the moved rows' new values.
    const postres = { id: 'cat-postres', name: 'Postres', position: 50, is_active: true }
    const sparseRollos = { ...rollos, position: 0 }
    const sparseRamen = { ...ramen, position: 20 }
    vi.mocked(dishCategoryApi.list).mockResolvedValue({
      data: { status: 200, data: [sparseRollos, sparseRamen, postres], meta: null },
    } as never)
    vi.mocked(dishCategoryApi.update).mockResolvedValue({ data: { status: 200, data: sparseRollos } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(3))

    await act(async () => {
      await result.current.move(sparseRollos, 'down')
    })

    // Rollos and Ramen (indices 0 and 1) swap; Postres (index 2) already matches its
    // renumbered position (2 ≠ 50, so it still needs updating too) — every row lands on
    // its own sequential index, not a value borrowed from whichever row it swapped with.
    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-rollos', { position: 1 })
    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-ramen', { position: 0 })
    expect(dishCategoryApi.update).toHaveBeenCalledWith('cat-postres', { position: 2 })
    expect(dishCategoryApi.update).toHaveBeenCalledTimes(3)
  })

  it('does nothing when moving the first category up', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.move(rollos, 'up')
    })

    expect(dishCategoryApi.update).not.toHaveBeenCalled()
  })

  it('shows an error toast when reordering fails', async () => {
    vi.mocked(dishCategoryApi.update).mockRejectedValue(new Error('boom'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDishCategoryManager(), { wrapper })

    await waitFor(() => expect(result.current.categories).toHaveLength(2))

    await act(async () => {
      await result.current.move(rollos, 'down')
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })
})
