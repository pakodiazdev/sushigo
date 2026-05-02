// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PunctualityBonusGroup } from '@/types/punctuality'

const mockMutate = vi.fn()

const fakeGroups: PunctualityBonusGroup[] = [
  { id: 'grp-1', name: 'Grupo $110', weekly_bonus_amount: 110, working_days_divisor: 6, daily_bonus_amount: 18.33, is_active: true },
]

vi.mock('@/services/punctuality-config-hooks', () => ({
  useBonusGroups: vi.fn(() => ({ data: fakeGroups, isLoading: false })),
  useCreateBonusGroup: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
}))

import { useBonusGroupsSection } from '../use-bonus-groups-section'
import * as hooks from '@/services/punctuality-config-hooks'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hooks.useBonusGroups).mockReturnValue({ data: fakeGroups, isLoading: false } as unknown as ReturnType<typeof hooks.useBonusGroups>)
  vi.mocked(hooks.useCreateBonusGroup).mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof hooks.useCreateBonusGroup>)
})

describe('useBonusGroupsSection', () => {
  it('exposes groups list', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    expect(result.current.groups).toEqual(fakeGroups)
  })

  it('starts with showForm = false', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    expect(result.current.showForm).toBe(false)
  })

  it('setShowForm(true) opens the form', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)
  })

  it('setShowForm(false) closes the form', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    act(() => { result.current.setShowForm(true) })
    act(() => { result.current.setShowForm(false) })
    expect(result.current.showForm).toBe(false)
  })

  it('isLoading reflects query loading state', () => {
    vi.mocked(hooks.useBonusGroups).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof hooks.useBonusGroups>)
    const { result } = renderHook(() => useBonusGroupsSection())
    expect(result.current.isLoading).toBe(true)
  })

  it('isPending reflects create.isPending', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    expect(result.current.isPending).toBe(false)
  })

  it('onSubmit calls create.mutate with form values', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    const values = { name: 'Grupo Test', weekly_bonus_amount: 150, working_days_divisor: 6 }
    act(() => { result.current.onSubmit(values) })
    expect(mockMutate).toHaveBeenCalledWith(values, expect.any(Object))
  })

  it('onSubmit onSuccess closes the form and resets it', () => {
    let capturedOnSuccess: (() => void) | undefined
    vi.mocked(hooks.useCreateBonusGroup).mockReturnValue({
      mutate: vi.fn((_, opts) => { capturedOnSuccess = opts?.onSuccess }),
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useCreateBonusGroup>)

    const { result } = renderHook(() => useBonusGroupsSection())
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)

    const values = { name: 'Grupo Test', weekly_bonus_amount: 150, working_days_divisor: 6 }
    act(() => { result.current.onSubmit(values) })
    act(() => { capturedOnSuccess?.() })

    expect(result.current.showForm).toBe(false)
  })

  it('exposes form object', () => {
    const { result } = renderHook(() => useBonusGroupsSection())
    expect(result.current.form).toBeDefined()
    expect(typeof result.current.form.handleSubmit).toBe('function')
  })
})
