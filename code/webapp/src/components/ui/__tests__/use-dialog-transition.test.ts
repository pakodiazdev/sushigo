// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useDialogTransition } from '@/components/ui/use-dialog-transition'

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  setTimeout(() => cb(0), 0)
  return 0
})

describe('useDialogTransition', () => {
  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('starts with visible false when isOpen is false', () => {
    const { result } = renderHook(() => useDialogTransition(false))

    expect(result.current.visible).toBe(false)
    expect(result.current.backdropCls).toBe('')
    expect(result.current.panelCls).toBe('')
  })

  it('sets visible true and applies enter classes when isOpen becomes true', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDialogTransition(isOpen),
      { initialProps: { isOpen: false } },
    )

    rerender({ isOpen: true })
    expect(result.current.visible).toBe(true)

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
      await vi.runOnlyPendingTimersAsync()
    })

    expect(result.current.backdropCls).toBe('animate-dialog-backdrop-in')
    expect(result.current.panelCls).toBe('animate-dialog-in')
    vi.useRealTimers()
  })

  it('does not lock body scroll by default', () => {
    renderHook(() => useDialogTransition(true))
    expect(document.body.style.overflow).toBe('')
  })

  it('locks and unlocks body scroll when lockScroll is true', () => {
    const { rerender, unmount } = renderHook(
      ({ isOpen }) => useDialogTransition(isOpen, { lockScroll: true }),
      { initialProps: { isOpen: true } },
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender({ isOpen: false })
    expect(document.body.style.overflow).toBe('unset')

    unmount()
  })

  it('calls onEscape when Escape is pressed while open', () => {
    const onEscape = vi.fn()
    renderHook(() => useDialogTransition(true, { onEscape }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('does not call onEscape when closed', () => {
    const onEscape = vi.fn()
    renderHook(() => useDialogTransition(false, { onEscape }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('animates out then calls onExitComplete after the exit duration', () => {
    vi.useFakeTimers()
    const onExitComplete = vi.fn()
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDialogTransition(isOpen, { onExitComplete }),
      { initialProps: { isOpen: true } },
    )

    rerender({ isOpen: false })

    expect(result.current.backdropCls).toBe('animate-dialog-backdrop-out')
    expect(result.current.panelCls).toBe('animate-dialog-out')
    expect(onExitComplete).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.visible).toBe(false)
    expect(result.current.backdropCls).toBe('')
    expect(onExitComplete).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
