// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAttendanceGridFlip } from '@/pages/attendance/-use-attendance-grid-flip'

// jsdom has no layout engine — getBoundingClientRect() always returns zeros
// and there is no real ResizeObserver/DOMMatrix. Everything below is stubbed
// so the hook's own measurement/transform logic can be exercised directly,
// independent of a real browser's layout pipeline.

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  setTimeout(() => cb(0), 0)
  return 0
})

// jsdom's getComputedStyle() echoes back whatever was assigned to
// `el.style.transform` verbatim (it does not normalize to `matrix(...)`, as
// real browsers do) — and this hook only ever assigns `translate(Npx, Mpx)`
// (see -use-attendance-grid-flip.ts), so this stub only needs to parse that
// one format to behave equivalently to the real DOMMatrix for these tests.
class FakeDOMMatrix {
  m41 = 0
  m42 = 0
  constructor(transform?: string) {
    if (!transform || transform === 'none') return
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
    if (match) {
      this.m41 = Number(match[1])
      this.m42 = Number(match[2])
    }
  }
}
vi.stubGlobal('DOMMatrix', FakeDOMMatrix)

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

function makeCardEl(rect: { top: number; left: number }): HTMLDivElement {
  const el = document.createElement('div')
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => ({
    top: rect.top, left: rect.left, width: 100, height: 100,
    right: rect.left + 100, bottom: rect.top + 100, x: rect.left, y: rect.top,
    toJSON() { return {} },
  }))
  return el
}

function makeContainerEl(): HTMLDivElement {
  const el = document.createElement('div')
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 0, left: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0,
    toJSON() { return {} },
  } as DOMRect)
  return el
}

describe('useAttendanceGridFlip', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('applies an inverted transform on reorder, then releases it via rAF + the 320ms transition', () => {
    // Only fake setTimeout/clearTimeout — our requestAnimationFrame stub
    // above already delegates to setTimeout, and letting Vitest's fake timers
    // ALSO take over requestAnimationFrame itself would replace our stub with
    // its own frame-paced implementation that advanceTimersByTime(0) doesn't
    // reliably drive.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // Mounts with an empty id list so refs can be attached BEFORE the
    // baseline-establishing render — the layout effect only re-runs when
    // `orderKey` (derived from `ids`) actually changes, so re-rendering with
    // the SAME ids used at mount would never re-measure the now-attached refs.
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useAttendanceGridFlip(ids),
      { initialProps: { ids: [] as string[] } },
    )

    const container = makeContainerEl()
    result.current.containerRef.current = container
    const cardA = makeCardEl({ top: 0, left: 0 })
    const cardB = makeCardEl({ top: 100, left: 0 })
    act(() => {
      result.current.setCardRef('a')(cardA)
      result.current.setCardRef('b')(cardB)
    })

    // orderKey changes '' -> 'a|b' — establishes the baseline (nothing to
    // diff against yet, so no transform is applied).
    act(() => rerender({ ids: ['a', 'b'] }))
    expect(cardB.style.transform).toBe('')

    // Card b "moves" to where a used to be (e.g. a left the grid) — same
    // orderKey elements, new measured position.
    vi.spyOn(cardB, 'getBoundingClientRect').mockImplementation(() => ({
      top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON() { return {} },
    }))
    act(() => rerender({ ids: ['b'] }))

    // Inverted immediately, before the rAF release — b is placed back at its
    // OLD screen position (100px below where it now actually sits).
    expect(cardB.style.transform).toBe('translate(0px, 100px)')
    expect(cardB.style.transition).toBe('none')

    // rAF (stubbed as setTimeout(0)) releases it with a transition.
    act(() => vi.advanceTimersByTime(0))
    expect(cardB.style.transform).toBe('')
    expect(cardB.style.transition).toBe('transform 320ms cubic-bezier(0.22, 1, 0.36, 1)')
  })

  it('folds the residual in-flight translate into a second invert started before the first settles', () => {
    // Only fake setTimeout/clearTimeout — our requestAnimationFrame stub
    // above already delegates to setTimeout, and letting Vitest's fake timers
    // ALSO take over requestAnimationFrame itself would replace our stub with
    // its own frame-paced implementation that advanceTimersByTime(0) doesn't
    // reliably drive.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useAttendanceGridFlip(ids),
      { initialProps: { ids: [] as string[] } },
    )

    const container = makeContainerEl()
    result.current.containerRef.current = container
    const cardA = makeCardEl({ top: 0, left: 0 })
    const cardB = makeCardEl({ top: 100, left: 0 })
    act(() => {
      result.current.setCardRef('a')(cardA)
      result.current.setCardRef('b')(cardB)
    })
    act(() => rerender({ ids: ['a', 'b'] })) // establishes baseline

    // First move: b's layout position changes from top:100 to top:0.
    vi.spyOn(cardB, 'getBoundingClientRect').mockImplementation(() => ({
      top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON() { return {} },
    }))
    act(() => rerender({ ids: ['b'] }))
    act(() => vi.advanceTimersByTime(0)) // rAF fires — transition now running, transform reset to ''

    // Still mid-transition (well before the 320ms settle timer). Simulate the
    // browser having interpolated the transition partway: the computed style
    // (read via getComputedStyle -> our DOMMatrix stub) currently shows a
    // residual translate, even though el.style.transform is the target ''.
    cardB.style.transform = 'translate(0px, 40px)'

    // Second move within the animation window: b's true layout position
    // changes again, from top:0 to top:50 (dy = -50 once recovered). Real
    // getBoundingClientRect() would report the RENDERED box — layout
    // position plus whatever translate is still actively applied — so the
    // mock must include that same 40px residual on top of the new layout
    // value (90 = 50 true layout + 40 still-in-flight offset); the hook
    // itself is what recovers the pure 50 by subtracting the residual back
    // out (see measurePositions).
    vi.spyOn(cardB, 'getBoundingClientRect').mockImplementation(() => ({
      top: 90, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON() { return {} },
    }))
    act(() => rerender({ ids: ['a', 'b'] }))

    // Without folding the residual in, the new invert would only be
    // translate(0px, -50px) — jumping the card to its layout position before
    // sliding again. The residual (40px still in flight) must be added in:
    // -50 (new layout delta) + 40 (residual) = -10.
    expect(cardB.style.transform).toBe('translate(0px, -10px)')
  })

  it('cancels the pending rAF on unmount instead of leaving it to fire on a discarded card', () => {
    const rafCallbacks = new Map<number, FrameRequestCallback>()
    let nextFrameId = 1
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      const id = nextFrameId++
      rafCallbacks.set(id, cb)
      return id
    })
    const cafSpy = vi.fn((id: number) => {
      rafCallbacks.delete(id)
    })
    vi.stubGlobal('requestAnimationFrame', rafSpy)
    vi.stubGlobal('cancelAnimationFrame', cafSpy)

    const { result, rerender, unmount } = renderHook(
      ({ ids }: { ids: string[] }) => useAttendanceGridFlip(ids),
      { initialProps: { ids: [] as string[] } },
    )

    const container = makeContainerEl()
    result.current.containerRef.current = container
    const cardA = makeCardEl({ top: 0, left: 0 })
    const cardB = makeCardEl({ top: 100, left: 0 })
    act(() => {
      result.current.setCardRef('a')(cardA)
      result.current.setCardRef('b')(cardB)
    })
    act(() => rerender({ ids: ['a', 'b'] })) // establishes baseline

    // b's layout position changes — schedules a rAF to release the invert.
    vi.spyOn(cardB, 'getBoundingClientRect').mockImplementation(() => ({
      top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON() { return {} },
    }))
    act(() => rerender({ ids: ['b'] }))

    expect(rafSpy).toHaveBeenCalledTimes(1)
    expect(cafSpy).not.toHaveBeenCalled()

    unmount()

    // The frame scheduled above must be cancelled, not left pending —
    // otherwise it fires later and writes styles onto a detached cardB.
    expect(cafSpy).toHaveBeenCalledTimes(1)
    expect(rafCallbacks.size).toBe(0)

    // Restore the module-level stub other tests in this file rely on.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0)
      return 0
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })
})
