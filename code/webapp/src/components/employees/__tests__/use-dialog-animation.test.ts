// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useDialogAnimation } from '@/components/employees/use-dialog-animation'

// Mock requestAnimationFrame to run immediately in sequence
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  setTimeout(() => cb(0), 0)
  return 0
})

describe('useDialogAnimation', () => {
  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('starts with visible false when isOpen is false', () => {
    const mockClose = vi.fn()
    const { result } = renderHook(() => useDialogAnimation(false, mockClose))

    expect(result.current.visible).toBe(false)
    expect(result.current.backdropCls).toBe('')
    expect(result.current.panelCls).toBe('')
  })

  it('sets visible true when isOpen becomes true', async () => {
    const mockClose = vi.fn()
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDialogAnimation(isOpen, mockClose),
      { initialProps: { isOpen: false } }
    )

    expect(result.current.visible).toBe(false)

    rerender({ isOpen: true })

    expect(result.current.visible).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('calls close on Escape key press when dialog is open', () => {
    const mockClose = vi.fn()
    renderHook(() => useDialogAnimation(true, mockClose))

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)
    })

    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('cleans up body overflow on unmount', () => {
    const mockClose = vi.fn()
    document.body.style.overflow = 'hidden'

    const { unmount } = renderHook(() => useDialogAnimation(true, mockClose))

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('animates out when closing', async () => {
    vi.useFakeTimers()
    const mockClose = vi.fn()
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDialogAnimation(isOpen, mockClose),
      { initialProps: { isOpen: true } }
    )

    expect(result.current.visible).toBe(true)

    rerender({ isOpen: false })

    // Animation starts - should show exit classes
    expect(result.current.backdropCls).toBe('animate-dialog-backdrop-out')
    expect(result.current.panelCls).toBe('animate-dialog-out')
    expect(document.body.style.overflow).toBe('')

    // After animation completes
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.visible).toBe(false)
    expect(result.current.backdropCls).toBe('')
    expect(result.current.panelCls).toBe('')

    vi.useRealTimers()
  })
})
