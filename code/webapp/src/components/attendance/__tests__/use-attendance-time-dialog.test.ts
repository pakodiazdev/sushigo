// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createTimeSchema, useAttendanceTimeDialog } from '../use-attendance-time-dialog'

// ── createTimeSchema tests ────────────────────────────────────────────────────

describe('createTimeSchema', () => {
  it('validates empty time as invalid', () => {
    const schema = createTimeSchema('18:00')
    const result = schema.safeParse({ time: '' })
    expect(result.success).toBe(false)
  })

  it('validates valid time format', () => {
    const schema = createTimeSchema('18:00')
    const result = schema.safeParse({ time: '09:30' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid time format', () => {
    const schema = createTimeSchema('18:00')
    const result = schema.safeParse({ time: '9:30' })
    expect(result.success).toBe(false)
  })

  it('rejects time after maxTime', () => {
    const schema = createTimeSchema('14:00')
    const result = schema.safeParse({ time: '14:30' })
    expect(result.success).toBe(false)
  })

  it('accepts time equal to maxTime', () => {
    const schema = createTimeSchema('14:00')
    const result = schema.safeParse({ time: '14:00' })
    expect(result.success).toBe(true)
  })

  it('accepts time before maxTime', () => {
    const schema = createTimeSchema('14:00')
    const result = schema.safeParse({ time: '13:59' })
    expect(result.success).toBe(true)
  })
})

// ── useAttendanceTimeDialog tests ─────────────────────────────────────────────

describe('useAttendanceTimeDialog', () => {
  const onConfirm = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultParams = {
    isOpen: true,
    initialTime: '09:00',
    maxTime: '18:00',
    onConfirm,
    onClose,
  }

  it('initializes with provided time', () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    expect(result.current.time).toBe('09:00')
  })

  it('returns isValid true for valid time', async () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    await waitFor(() => {
      expect(result.current.isValid).toBe(true)
    })
  })

  it('resets form when dialog opens', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen, initialTime }) =>
        useAttendanceTimeDialog({ ...defaultParams, isOpen, initialTime }),
      { initialProps: { isOpen: false, initialTime: '10:00' } },
    )

    // Open the dialog
    rerender({ isOpen: true, initialTime: '10:00' })

    await waitFor(() => {
      expect(result.current.time).toBe('10:00')
    })
  })

  it('handleClose resets form and calls onClose', async () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    act(() => {
      result.current.handleClose()
    })

    expect(onClose).toHaveBeenCalled()
    expect(result.current.time).toBe('')
  })

  it('handleConfirm calls onConfirm with time value', async () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    await act(async () => {
      await result.current.handleConfirm()
    })

    expect(onConfirm).toHaveBeenCalledWith('09:00')
  })

  it('provides register function', () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    expect(result.current.register).toBeDefined()
    expect(typeof result.current.register).toBe('function')
  })

  it('errors is empty for valid time', async () => {
    const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

    await waitFor(() => {
      expect(result.current.errors.time).toBeUndefined()
    })
  })
})
