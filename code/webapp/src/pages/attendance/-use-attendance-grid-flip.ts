import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

interface Position {
  top: number
  left: number
}

// Positions are measured relative to the grid's own container, not
// "absolute" document coordinates. `getBoundingClientRect()` is always
// viewport-relative, and the WINDOW itself never scrolls in this app's
// layout — the root is `flex h-screen overflow-hidden` and the actual
// scrolling happens inside `<main className="overflow-y-auto">` (see
// components/layout/Layout.tsx). Adding window.scrollX/scrollY is a no-op
// here, since it's always 0 — the real scroll offset lives on that `<main>`
// panel's scrollTop/scrollLeft instead. Rather than coupling this hook to
// which specific ancestor happens to scroll, measuring each card relative
// to the grid CONTAINER sidesteps the problem entirely: every tracked card
// scrolls together with its container (none of them scroll independently
// relative to their siblings), so a card's position relative to the
// container is unaffected by any ancestor's scroll offset — window, `main`,
// or otherwise — and only changes when the grid's actual layout does.

// getBoundingClientRect() on a card mid FLIP-transition (see
// animatingEmployeeIds below) includes its in-progress CSS transform, which
// would return an interpolated, not the true current CSS Grid layout
// position. Reading the transform actually being rendered right now (via
// getComputedStyle, not el.style — the specified target is already back to
// identity while the transition is still interpolating toward it) and
// subtracting it out yields the untransformed layout position without ever
// touching the element's `transition`/`transform` inline styles — doing that
// used to be how this measured, but assigning `transition: none` forces the
// browser to cancel the running transition and jump straight to its target
// value, snapping the card instead of letting it keep sliding.
//
// This hook was ported unchanged from a prior spike (9 review rounds, 0 open
// bugs) — do not "simplify" the residual-translate folding or the
// ResizeObserver initial-notification skip below; they look redundant but
// each one closes a specific, previously-found bug (stale FLIP timers not
// cancelled, residual in-flight translate dropped on rapid re-moves, the
// measurement itself cancelling a card's own running transition,
// window.scroll* instead of container-relative coordinates, and the
// ResizeObserver's unconditional initial notification contaminating the
// baseline). See the design-validation notes in the issue this hook shipped
// under for the full list.
function getCurrentTranslate(el: HTMLDivElement): Position {
  const transform = getComputedStyle(el).transform
  if (!transform || transform === 'none') return { top: 0, left: 0 }
  const matrix = new DOMMatrix(transform)
  return { top: matrix.m42, left: matrix.m41 }
}

function measurePositions(
  cardRefs: Map<string, HTMLDivElement>,
  container: HTMLElement | null,
  animatingEmployeeIds: Set<string> = new Set(),
): Map<string, Position> {
  const positions = new Map<string, Position>()
  if (!container) return positions
  const containerRect = container.getBoundingClientRect()
  cardRefs.forEach((el, employeeId) => {
    const rect = el.getBoundingClientRect()
    const translate = animatingEmployeeIds.has(employeeId) ? getCurrentTranslate(el) : { top: 0, left: 0 }
    positions.set(employeeId, {
      top: rect.top - containerRect.top - translate.top,
      left: rect.left - containerRect.left - translate.left,
    })
  })
  return positions
}

// CSS Grid recalculates item positions in a single discrete layout pass — when
// a card leaves the grid (exit animation finishes, tab filter changes, etc.)
// every card after it snaps straight to its new slot with no transition,
// which reads as an abrupt jump. This hook FLIP-animates that reflow: after
// each layout, every tracked card is instantly placed back at its OLD screen
// position (no transition), then released to its real position on the next
// frame with a transition — turning the snap into a fluid slide.
export function useAttendanceGridFlip(orderedEmployeeIds: string[]) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevPositions = useRef(new Map<string, Position>())
  // Employee ids whose card is currently mid FLIP-transition (between the
  // inverted starting transform being applied and its 320ms transition
  // finishing). getBoundingClientRect() includes any in-progress transform,
  // so a ResizeObserver notification that lands in that window (e.g. a
  // background refetch changing an UNRELATED card's content height) must
  // not re-measure these — the layout effect already stored their correct
  // target position when the animation started; overwriting it with a
  // still-interpolating one would make the NEXT reflow animate from a
  // visually wrong, transform-contaminated baseline.
  const animatingEmployeeIds = useRef(new Set<string>())
  // The timer that clears an employee out of animatingEmployeeIds, keyed by
  // employee id. A card moved a second time before its FIRST timer fires
  // gets a new 320ms transition, but the stale timer would otherwise still
  // land mid-way through it and delete the id early — making the rest of
  // this hook (and the ResizeObserver skip below) treat a still-animating
  // card as settled. Tracked per id so the layout effect can cancel the
  // stale one before scheduling the new one.
  const animationTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // The requestAnimationFrame handle scheduled to release a card into its
  // transition, keyed by employee id — tracked so it can be cancelled both
  // on unmount (a queued frame fires on discarded elements otherwise, since
  // rAF is not itself tied to component lifetime) and before scheduling a
  // new one for the same card on a rapid second reflow (the same "stale
  // timer" hazard animationTimers guards against, one step earlier).
  const animationFrames = useRef(new Map<string, number>())

  useEffect(() => {
    const timers = animationTimers.current
    const frames = animationFrames.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      frames.forEach((frameId) => cancelAnimationFrame(frameId))
      frames.clear()
    }
  }, [])

  const setCardRef = useCallback((employeeId: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(employeeId, el)
    else cardRefs.current.delete(employeeId)
  }, [])

  const orderKey = orderedEmployeeIds.join('|')

  useLayoutEffect(() => {
    // A second reflow can start while a card from a PRIOR reflow is still
    // mid-transition (e.g. two employees acted on within 320ms of each
    // other) — passing animatingEmployeeIds subtracts those cards' in-progress
    // transform before reading, so this reflow's baseline reflects their
    // true current CSS Grid layout position, not an interpolated one.
    const nextPositions = measurePositions(cardRefs.current, containerRef.current, animatingEmployeeIds.current)

    nextPositions.forEach((position, employeeId) => {
      const prevPosition = prevPositions.current.get(employeeId)
      const el = cardRefs.current.get(employeeId)
      if (!prevPosition || !el) return

      const dx = prevPosition.left - position.left
      const dy = prevPosition.top - position.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      // If this card is already mid FLIP-transition from a PRIOR move, dx/dy
      // above (pure layout delta) only accounts for where its box moved TO —
      // not where it is currently painted, which still carries a residual
      // translate left over from that earlier transition. Starting the new
      // invert from dx/dy alone would jump the card to prevPosition before
      // sliding again; folding the residual translate back in keeps the
      // start of this new slide continuous with wherever it visually is
      // right now.
      const residual = animatingEmployeeIds.current.has(employeeId) ? getCurrentTranslate(el) : { top: 0, left: 0 }
      const startDx = dx + residual.left
      const startDy = dy + residual.top

      const staleTimer = animationTimers.current.get(employeeId)
      if (staleTimer !== undefined) clearTimeout(staleTimer)
      const staleFrame = animationFrames.current.get(employeeId)
      if (staleFrame !== undefined) cancelAnimationFrame(staleFrame)

      animatingEmployeeIds.current.add(employeeId)

      el.style.transition = 'none'
      el.style.transform = `translate(${startDx}px, ${startDy}px)`
      el.getBoundingClientRect() // force reflow so the inverted position paints before the transition is re-enabled

      const frameId = requestAnimationFrame(() => {
        animationFrames.current.delete(employeeId)
        el.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
        const timer = setTimeout(() => {
          animatingEmployeeIds.current.delete(employeeId)
          animationTimers.current.delete(employeeId)
        }, 320)
        animationTimers.current.set(employeeId, timer)
      })
      animationFrames.current.set(employeeId, frameId)
    })

    prevPositions.current = nextPositions
  }, [orderKey])

  // Anything that changes a card's on-screen box — a window resize (or a
  // Tailwind breakpoint changing the grid's column count), or a card's OWN
  // content growing/shrinking (an overtime badge or leave chip appearing on
  // a background refetch) and pushing every card below it — repositions
  // cards without touching `orderedEmployeeIds`, so the layout effect above
  // never re-runs and `prevPositions` goes stale. Left unhandled, the NEXT
  // real reflow (a card actually entering/leaving) would FLIP-animate from
  // those stale coordinates, making cards appear to slide in from far-off,
  // wrong positions. A ResizeObserver on every tracked card catches both
  // cases in one mechanism, and silently resets the snapshot (no animation)
  // so future reflows measure against the current layout instead.
  useEffect(() => {
    // Per spec, calling observe() queues an "initial" notification for the
    // newly-observed element regardless of whether its size ever changes —
    // this effect re-observes every card on each orderKey change, so its
    // FIRST callback invocation is always that initial batch, not a real
    // resize. That timing is unsafe to measure from: this effect (a regular
    // useEffect) runs after the layout effect above already applied each
    // moved card's inverted starting transform, and the initial
    // notification can be delivered before that card's scheduled
    // requestAnimationFrame releases it — getBoundingClientRect() includes
    // the currently-applied transform, so measuring here would capture the
    // still-inverted (visually stale) position and clobber the correct
    // baseline the layout effect just stored. Skipping this first
    // invocation avoids it; every subsequent one is a genuine resize.
    let isInitialNotification = true
    const observer = new ResizeObserver(() => {
      if (isInitialNotification) {
        isInitialNotification = false
        return
      }
      const measured = measurePositions(cardRefs.current, containerRef.current)
      const next = new Map(prevPositions.current)
      measured.forEach((position, employeeId) => {
        // Skip cards currently mid FLIP-transition — see animatingEmployeeIds.
        if (animatingEmployeeIds.current.has(employeeId)) return
        next.set(employeeId, position)
      })
      prevPositions.current = next
    })
    cardRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [orderKey])

  return { setCardRef, containerRef }
}
