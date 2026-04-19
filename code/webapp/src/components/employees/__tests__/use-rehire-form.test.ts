// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockCurrentBranch = vi.fn()
const mockAvailableBranches = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { currentBranch: unknown; availableBranches: unknown[] }) => unknown) =>
    selector({
      currentBranch: mockCurrentBranch(),
      availableBranches: mockAvailableBranches(),
    }),
}))

import { useRehireForm } from '../use-rehire-form'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRehireForm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00'))
    mockCurrentBranch.mockReturnValue({ id: 1, name: 'Central' })
    mockAvailableBranches.mockReturnValue([{ id: 1, name: 'Central' }])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns today as current date', () => {
    const { result } = renderHook(() => useRehireForm())
    expect(result.current.today).toBe('2026-04-15')
  })

  it('returns form with default start_date set to today', () => {
    const { result } = renderHook(() => useRehireForm())
    expect(result.current.form.getValues('start_date')).toBe('2026-04-15')
  })

  it('returns currentBranch as effectiveBranch when available', () => {
    mockCurrentBranch.mockReturnValue({ id: 1, name: 'Central' })

    const { result } = renderHook(() => useRehireForm())

    expect(result.current.effectiveBranch).toEqual({ id: 1, name: 'Central' })
  })

  it('falls back to first available branch when currentBranch is null', () => {
    mockCurrentBranch.mockReturnValue(null)
    mockAvailableBranches.mockReturnValue([{ id: 2, name: 'Norte' }])

    const { result } = renderHook(() => useRehireForm())

    expect(result.current.effectiveBranch).toEqual({ id: 2, name: 'Norte' })
  })

  it('returns null effectiveBranch when no branches available', () => {
    mockCurrentBranch.mockReturnValue(null)
    mockAvailableBranches.mockReturnValue([])

    const { result } = renderHook(() => useRehireForm())

    expect(result.current.effectiveBranch).toBeNull()
  })

  it('accepts valid past date', async () => {
    const { result } = renderHook(() => useRehireForm())

    await act(async () => {
      result.current.form.setValue('start_date', '2026-04-10')
    })

    // Past dates should be valid
    const isValid = await result.current.form.trigger('start_date')
    expect(isValid).toBe(true)
  })

  it('accepts current date', async () => {
    const { result } = renderHook(() => useRehireForm())

    await act(async () => {
      result.current.form.setValue('start_date', '2026-04-15')
    })

    // Current date should be valid
    const isValid = await result.current.form.trigger('start_date')
    expect(isValid).toBe(true)
  })
})
