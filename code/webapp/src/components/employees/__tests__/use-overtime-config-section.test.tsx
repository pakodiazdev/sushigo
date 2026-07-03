// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { OvertimePayConfig } from '@/types/attendance-payroll'

const mockConfigs: OvertimePayConfig[] = [
  {
    id: 'cfg-1',
    valuation_method: 'AGREED_RATE',
    lft_factor: null,
    hourly_rate: 90,
    effective_from: '2026-01-01',
    effective_to: null,
  },
]

const mockMutate = vi.fn()

vi.mock('@/services/overtime-hooks', () => ({
  useOvertimeConfig: vi.fn(() => ({ data: mockConfigs, isLoading: false })),
  useSetOvertimeConfig: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
}))

import { useOvertimeConfigSection } from '../use-overtime-config-section'
import * as hooks from '@/services/overtime-hooks'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hooks.useOvertimeConfig).mockReturnValue({ data: mockConfigs, isLoading: false } as unknown as ReturnType<typeof hooks.useOvertimeConfig>)
  vi.mocked(hooks.useSetOvertimeConfig).mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof hooks.useSetOvertimeConfig>)
})

describe('useOvertimeConfigSection', () => {
  it('exposes the config active today as current', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.current).toEqual(mockConfigs[0])
  })

  it('returns null for current when configs is empty', () => {
    vi.mocked(hooks.useOvertimeConfig).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof hooks.useOvertimeConfig>)
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.current).toBeNull()
  })

  it('returns null when the only config is in the future', () => {
    const futureConfig = { ...mockConfigs[0], effective_from: '2099-01-01', effective_to: null }
    vi.mocked(hooks.useOvertimeConfig).mockReturnValue({ data: [futureConfig], isLoading: false } as unknown as ReturnType<typeof hooks.useOvertimeConfig>)
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.current).toBeNull()
  })

  it('returns null when all configs are expired', () => {
    const expiredConfig = { ...mockConfigs[0], effective_from: '2020-01-01', effective_to: '2020-12-31' }
    vi.mocked(hooks.useOvertimeConfig).mockReturnValue({ data: [expiredConfig], isLoading: false } as unknown as ReturnType<typeof hooks.useOvertimeConfig>)
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.current).toBeNull()
  })

  it('starts with showForm = false', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.showForm).toBe(false)
  })

  it('setShowForm toggles the form visibility', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)
  })

  it('onSubmit sends lft_factor and omits hourly_rate for LFT_PROPORTIONAL', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    act(() => {
      result.current.onSubmit({
        valuation_method: 'LFT_PROPORTIONAL',
        lft_factor: '2.00',
        hourly_rate: '',
        effective_from: '2026-05-01',
      })
    })
    expect(mockMutate).toHaveBeenCalledWith(
      { valuation_method: 'LFT_PROPORTIONAL', lft_factor: 2, hourly_rate: undefined, effective_from: '2026-05-01' },
      expect.any(Object),
    )
  })

  it('onSubmit sends hourly_rate and omits lft_factor for AGREED_RATE', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    act(() => {
      result.current.onSubmit({
        valuation_method: 'AGREED_RATE',
        lft_factor: '',
        hourly_rate: '90.00',
        effective_from: '2026-05-01',
      })
    })
    expect(mockMutate).toHaveBeenCalledWith(
      { valuation_method: 'AGREED_RATE', lft_factor: undefined, hourly_rate: 90, effective_from: '2026-05-01' },
      expect.any(Object),
    )
  })

  it('isPending reflects setConfig.isPending', () => {
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.isPending).toBe(false)
  })

  it('isLoadingConfigs is true when query is loading', () => {
    vi.mocked(hooks.useOvertimeConfig).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof hooks.useOvertimeConfig>)
    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    expect(result.current.isLoadingConfigs).toBe(true)
  })

  it('onSubmit onSuccess hides the form and resets it', () => {
    let capturedOnSuccess: (() => void) | undefined
    vi.mocked(hooks.useSetOvertimeConfig).mockReturnValue({
      mutate: vi.fn((_, opts) => { capturedOnSuccess = opts?.onSuccess }),
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useSetOvertimeConfig>)

    const { result } = renderHook(() => useOvertimeConfigSection('emp-1'))
    act(() => { result.current.setShowForm(true) })
    expect(result.current.showForm).toBe(true)

    act(() => {
      result.current.onSubmit({
        valuation_method: 'AGREED_RATE',
        lft_factor: '',
        hourly_rate: '90.00',
        effective_from: '2026-05-01',
      })
    })
    act(() => { capturedOnSuccess?.() })

    expect(result.current.showForm).toBe(false)
  })
})
