// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockClockState = {
  business_date: '2026-04-15',
  business_now: '2026-04-15T12:30:00-06:00',
  business_timezone: 'America/Mexico_City',
  is_simulated: false,
}

const mockFetchClock = vi.fn()
const mockSetClockTime = vi.fn()
const mockResetClockToSystem = vi.fn()

vi.mock('@/stores/clock.store', () => ({
  useApplicationClockStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      clockState: mockClockState,
      isAvailable: true,
      isLoading: false,
      fetchClock: mockFetchClock,
      setClockTime: mockSetClockTime,
      resetClockToSystem: mockResetClockToSystem,
    }
    return selector(state)
  },
  selectIsSimulated: (state: Record<string, unknown>) =>
    (state.clockState as typeof mockClockState | null)?.is_simulated ?? false,
}))

import { useClockBadge } from '../use-clock-badge'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useClockBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns clock state from store', () => {
    const { result } = renderHook(() => useClockBadge())

    expect(result.current.clockState).toEqual(mockClockState)
    expect(result.current.isAvailable).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches clock on mount', () => {
    renderHook(() => useClockBadge())

    expect(mockFetchClock).toHaveBeenCalled()
  })

  it('initializes with panel closed', () => {
    const { result } = renderHook(() => useClockBadge())

    expect(result.current.isPanelOpen).toBe(false)
  })

  it('togglePanel opens and closes panel', () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.togglePanel()
    })
    expect(result.current.isPanelOpen).toBe(true)

    act(() => {
      result.current.togglePanel()
    })
    expect(result.current.isPanelOpen).toBe(false)
  })

  it('closePanel closes the panel', () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.togglePanel()
    })
    expect(result.current.isPanelOpen).toBe(true)

    act(() => {
      result.current.closePanel()
    })
    expect(result.current.isPanelOpen).toBe(false)
  })

  it('initializes date/time inputs when panel opens', async () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.togglePanel()
    })

    await waitFor(() => {
      expect(result.current.dateInput).toBe('2026-04-15')
      expect(result.current.timeInput).toMatch(/\d{2}:\d{2}/)
    })
  })

  it('setDateInput updates date input', () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.setDateInput('2026-05-01')
    })

    expect(result.current.dateInput).toBe('2026-05-01')
  })

  it('setTimeInput updates time input', () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.setTimeInput('14:00')
    })

    expect(result.current.timeInput).toBe('14:00')
  })

  it('handleSetTime calls setClockTime with formatted datetime', async () => {
    mockSetClockTime.mockResolvedValue(true)
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.setDateInput('2026-04-20')
      result.current.setTimeInput('15:30')
    })

    await act(async () => {
      await result.current.handleSetTime()
    })

    expect(mockSetClockTime).toHaveBeenCalledWith('2026-04-20 15:30:00')
  })

  it('handleSetTime does nothing if date or time is empty', async () => {
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.setDateInput('')
      result.current.setTimeInput('15:30')
    })

    await act(async () => {
      await result.current.handleSetTime()
    })

    expect(mockSetClockTime).not.toHaveBeenCalled()
  })

  it('handleSetTime closes panel on success', async () => {
    mockSetClockTime.mockResolvedValue(true)
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.togglePanel()
      result.current.setDateInput('2026-04-20')
      result.current.setTimeInput('15:30')
    })
    expect(result.current.isPanelOpen).toBe(true)

    await act(async () => {
      await result.current.handleSetTime()
    })

    expect(result.current.isPanelOpen).toBe(false)
  })

  it('handleReset calls resetClockToSystem', async () => {
    mockResetClockToSystem.mockResolvedValue(true)
    const { result } = renderHook(() => useClockBadge())

    await act(async () => {
      await result.current.handleReset()
    })

    expect(mockResetClockToSystem).toHaveBeenCalled()
  })

  it('handleReset closes panel on success', async () => {
    mockResetClockToSystem.mockResolvedValue(true)
    const { result } = renderHook(() => useClockBadge())

    act(() => {
      result.current.togglePanel()
    })
    expect(result.current.isPanelOpen).toBe(true)

    await act(async () => {
      await result.current.handleReset()
    })

    expect(result.current.isPanelOpen).toBe(false)
  })

  it('returns panelRef', () => {
    const { result } = renderHook(() => useClockBadge())

    expect(result.current.panelRef).toBeDefined()
    expect(result.current.panelRef.current).toBeNull() // Not attached to DOM
  })

  it('returns businessTime formatted', () => {
    const { result } = renderHook(() => useClockBadge())

    // Should return a time string formatted in es-MX locale
    expect(result.current.businessTime).toMatch(/\d{1,2}:\d{2}/)
  })
})
