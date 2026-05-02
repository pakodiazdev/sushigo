// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { EmployeeBonusConfig, PunctualityBonusGroup } from '@/types/punctuality'

const mockConfigs: EmployeeBonusConfig[] = [
  {
    id: 'cfg-1',
    bonus_group_id: 'grp-1',
    bonus_group_name: 'Grupo $110',
    weekly_bonus_amount: 110,
    daily_bonus_amount: 18.33,
    effective_from: '2026-01-01',
    effective_to: null,
  },
]

const mockGroups: PunctualityBonusGroup[] = [
  { id: 'grp-1', name: 'Grupo $110', weekly_bonus_amount: 110, working_days_divisor: 6, daily_bonus_amount: 18.33, is_active: true },
]

const mockMutate = vi.fn()

vi.mock('@/services/punctuality-config-hooks', () => ({
  useEmployeeBonusConfig: vi.fn(() => ({ data: mockConfigs, isLoading: false })),
  useBonusGroups: vi.fn(() => ({ data: mockGroups, isLoading: false })),
  useAssignBonusConfig: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
}))

import { useBonusConfigSection } from '../use-bonus-config-section'
import * as hooks from '@/services/punctuality-config-hooks'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hooks.useEmployeeBonusConfig).mockReturnValue({ data: mockConfigs, isLoading: false } as unknown as ReturnType<typeof hooks.useEmployeeBonusConfig>)
  vi.mocked(hooks.useBonusGroups).mockReturnValue({ data: mockGroups, isLoading: false } as unknown as ReturnType<typeof hooks.useBonusGroups>)
  vi.mocked(hooks.useAssignBonusConfig).mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof hooks.useAssignBonusConfig>)
})

describe('useBonusConfigSection', () => {
  it('exposes the first config as current', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.current).toEqual(mockConfigs[0])
  })

  it('returns null for current when configs is empty', () => {
    vi.mocked(hooks.useEmployeeBonusConfig).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof hooks.useEmployeeBonusConfig>)
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.current).toBeNull()
  })

  it('exposes groups list', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.groups).toEqual(mockGroups)
  })

  it('starts with showForm = false', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.showForm).toBe(false)
  })

  it('setShowForm toggles the form visibility', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)
  })

  it('onSubmit calls assign.mutate with form values', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    const values = { bonus_group_id: 'grp-1', effective_from: '2026-05-01' }
    act(() => { result.current.onSubmit(values) })
    expect(mockMutate).toHaveBeenCalledWith(values, expect.any(Object))
  })

  it('isPending reflects assign.isPending', () => {
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.isPending).toBe(false)
  })

  it('isLoadingConfigs is true when query is loading', () => {
    vi.mocked(hooks.useEmployeeBonusConfig).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof hooks.useEmployeeBonusConfig>)
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.isLoadingConfigs).toBe(true)
  })

  it('isLoadingGroups is true when groups query is loading', () => {
    vi.mocked(hooks.useBonusGroups).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof hooks.useBonusGroups>)
    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    expect(result.current.isLoadingGroups).toBe(true)
  })

  it('onSubmit onSuccess hides the form and resets it', () => {
    let capturedOnSuccess: (() => void) | undefined
    vi.mocked(hooks.useAssignBonusConfig).mockReturnValue({
      mutate: vi.fn((_, opts) => { capturedOnSuccess = opts?.onSuccess }),
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useAssignBonusConfig>)

    const { result } = renderHook(() => useBonusConfigSection('emp-1'))
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)

    const values = { bonus_group_id: 'grp-1', effective_from: '2026-05-01' }
    act(() => { result.current.onSubmit(values) })
    act(() => { capturedOnSuccess?.() })

    expect(result.current.showForm).toBe(false)
  })
})
