import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SlidePanelOverlayContext } from './slide-panel-context'

/**
 * SlidePanel is an intentionally separate animation family from the centered
 * dialogs built on `useDialogTransition` (`components/ui/use-dialog-transition.ts`):
 * slide-in/out with a configurable duration, vs. the dialog family's fixed
 * 200ms fade/scale. Do not migrate it onto `useDialogTransition` — see #342.
 */

/** Default animation duration in ms — shared across all SlidePanels. */
export const SLIDE_PANEL_DEFAULT_DURATION_MS = 350

/** Default top-margin (px) applied when auto-scrolling a focused input into view. */
export const SLIDE_PANEL_DEFAULT_SCROLL_MARGIN = 20

/**
 * Module-level stack of currently-open SlidePanel instances, ordered by open
 * time (last entry = topmost/active panel). Two independent SlidePanel
 * instances can be mounted as siblings rather than nested (e.g. the Product
 * detail panel + the standalone Purchase Presentation Template Manager
 * panel, see #427), so a plain module-level stack — rather than React
 * context, which only coordinates panels that share an ancestor — is what
 * lets unrelated instances agree on which one is "on top" for Escape
 * handling and body-scroll locking.
 */
let openPanelStack: symbol[] = []

function pushOpenPanel(id: symbol) {
  if (!openPanelStack.includes(id)) {
    openPanelStack = [...openPanelStack, id]
  }
  syncBodyOverflow()
}

function popOpenPanel(id: symbol) {
  openPanelStack = openPanelStack.filter((existing) => existing !== id)
  syncBodyOverflow()
}

function syncBodyOverflow() {
  document.body.style.overflow = openPanelStack.length > 0 ? 'hidden' : 'unset'
}

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'right' | 'left'
  className?: string
  noPadding?: boolean
  /** Animation duration in ms (enter & exit). @default 350 */
  animationDuration?: number
  /**
   * When true, any `<input>`, `<select>`, or `<textarea>` that receives focus
   * inside the panel will be scrolled into view with `scrollMargin` pixels of
   * breathing room at the top.  Useful on mobile to keep the active field
   * visible above the virtual keyboard.
   * @default true
   */
  autoScrollOnFocus?: boolean
  /** Top-margin in px when auto-scrolling a focused field.  @default 20 */
  scrollMargin?: number
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
}

const slideAnimations: Record<'right' | 'left', { enter: string; exit: string }> = {
  right: { enter: 'slide-in-right', exit: 'slide-out-right' },
  left: { enter: 'slide-in-left', exit: 'slide-out-left' },
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  position = 'right',
  className,
  noPadding = false,
  animationDuration = SLIDE_PANEL_DEFAULT_DURATION_MS,
  autoScrollOnFocus = true,
  scrollMargin = SLIDE_PANEL_DEFAULT_SCROLL_MARGIN,
}: Readonly<SlidePanelProps>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  // Stable identity for this SlidePanel instance in the shared open-panel stack.
  const panelId = useRef(Symbol('slide-panel')).current

  // ── Visibility state (keeps DOM alive during exit animation) ──
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      // Force a reflow before starting the enter animation so the browser
      // renders the initial "off-screen" frame first.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating('enter'))
      })
    } else if (visible) {
      setAnimating('exit')
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
      }, animationDuration)
      return () => clearTimeout(timer)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll content to the top every time the panel opens ──
  useEffect(() => {
    if (isOpen && visible && contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [isOpen, visible])

  // Close on Escape key — only the topmost panel in the shared open-panel
  // stack reacts, so when two independent SlidePanel instances are stacked
  // (e.g. a standalone manager opened on top of a detail panel) Escape only
  // closes the one the user is actually looking at.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      const isTopmost = openPanelStack[openPanelStack.length - 1] === panelId
      if (e.key === 'Escape' && isOpen && isTopmost) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, panelId])

  // Prevent body scroll while any SlidePanel is open. Registration/
  // deregistration goes through the shared stack so closing one of several
  // stacked panels doesn't re-enable scrolling while another remains open.
  // Keyed on `visible`, not `isOpen`: `visible` stays true for the full
  // exit-animation duration after `isOpen` flips false, so a closing panel
  // stays registered as topmost until it actually finishes disappearing.
  // Popping on `isOpen` instead would let the panel underneath become
  // "topmost" the instant Escape/close fires, while the closing panel is
  // still visually covering it mid-animation — a second Escape press in
  // that window would then close the still-covered panel too, discarding
  // its nested Product/Variant state.
  useEffect(() => {
    if (!visible) return undefined
    pushOpenPanel(panelId)
    return () => popOpenPanel(panelId)
  }, [visible, panelId])

  // ── Focus management for the topmost panel ──
  // Only the topmost panel in the shared stack moves focus into itself and
  // restores it on close — otherwise, when two independent SlidePanel
  // instances are stacked (e.g. the standalone Template Manager opened on
  // top of the Product/Variant panel, see #427), focus stays on whatever
  // was focused in the covered panel and a keyboard user has to tab through
  // it before ever reaching the panel that's actually visible.
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = overlayRef.current
    if (!container) return []
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
  }, [])

  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Captures the element that had focus right before this panel became the
  // topmost open one, and restores it once the panel closes — deliberately
  // scoped to isOpen/visible only, so an internal content swap (below)
  // never overwrites what "closing" should restore focus to.
  useEffect(() => {
    if (!isOpen || !visible) return undefined
    if (openPanelStack[openPanelStack.length - 1] !== panelId) return undefined

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    return () => {
      const previouslyFocused = previouslyFocusedRef.current
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, visible, panelId])

  // Moves focus into the topmost panel's first focusable element — both when
  // it first opens, and whenever its rendered content changes while it stays
  // open. The latter matters because several panels in this app swap their
  // `children` in place instead of closing/reopening the SlidePanel (e.g.
  // clicking "Assign template" or a list row swaps in a different form
  // within the same instance, per the create→detail→edit content-swap
  // pattern — see #423/#427): the control that triggered the swap unmounts
  // along with the old content, and without this the browser drops focus to
  // <body>, letting the next Tab wander into the page behind the panel
  // instead of into the newly rendered form.
  useEffect(() => {
    if (!isOpen || !visible) return undefined
    if (openPanelStack[openPanelStack.length - 1] !== panelId) return undefined

    const container = overlayRef.current
    if (!container) return undefined

    // Defer so newly rendered content (initial mount or a content swap) is
    // committed to the DOM before we look for something focusable inside it.
    const timer = setTimeout(() => {
      if (container.contains(document.activeElement)) return
      const [first] = getFocusableElements()
      ;(first ?? container).focus()
    }, 0)

    return () => clearTimeout(timer)
    // `children` is intentionally a dependency: it's how this effect learns
    // the panel swapped its rendered content in place.
  }, [isOpen, visible, panelId, getFocusableElements, children])

  // Trap Tab/Shift+Tab within the topmost panel's own focusable elements so
  // keyboard focus can't wander into a panel underneath it.
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !isOpen) return
      if (openPanelStack[openPanelStack.length - 1] !== panelId) return

      const focusable = getFocusableElements()
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      const active = document.activeElement

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen, panelId, getFocusableElements])

  // ── Auto-scroll focused input into view ──
  // When a form field receives focus, scroll the content container so the
  // field sits near the top of the visible area (with `scrollMargin` px of
  // breathing room).  This prevents inputs from hiding behind the virtual
  // keyboard on mobile devices.
  const handleFocusIn = useCallback(
    (e: FocusEvent) => {
      if (!autoScrollOnFocus || !contentRef.current) return
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Small delay so the virtual keyboard finishes opening on mobile.
        setTimeout(() => {
          const container = contentRef.current
          if (!container) return

          // Position of the target relative to the scrollable container.
          const targetRect = target.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const offsetInContainer =
            targetRect.top - containerRect.top + container.scrollTop

          // Scroll so the input sits `scrollMargin` px from the container top.
          container.scrollTo({
            top: Math.max(0, offsetInContainer - scrollMargin),
            behavior: 'smooth',
          })
        }, 150)
      }
    },
    [autoScrollOnFocus, scrollMargin]
  )

  useEffect(() => {
    const content = contentRef.current
    if (!content || !isOpen) return
    content.addEventListener('focusin', handleFocusIn)
    return () => content.removeEventListener('focusin', handleFocusIn)
  }, [isOpen, visible, handleFocusIn])

  // ── Animation helpers ──
  const durationStyle = { animationDuration: `${animationDuration}ms` }

  const panelAnimation =
    animating === 'enter' ? slideAnimations[position].enter : slideAnimations[position].exit

  const backdropAnimation =
    animating === 'enter' ? 'backdrop-in' : 'backdrop-out'

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{
          ...durationStyle,
          animationName: backdropAnimation,
          animationFillMode: 'forwards',
          animationTimingFunction: 'ease-in-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 flex max-w-full',
          position === 'right' ? 'right-0' : 'left-0'
        )}
      >
        <div
          ref={panelRef}
          className={cn(
            'relative w-screen',
            sizeClasses[size],
            className
          )}
          style={{
            ...durationStyle,
            animationName: panelAnimation,
            animationFillMode: 'forwards',
            animationTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <SlidePanelOverlayContext.Provider value={overlayRef}>
          <div
            ref={overlayRef}
            tabIndex={-1}
            className="relative flex h-full flex-col bg-background shadow-xl outline-none"
          >
            {/* Header */}
            {(title || description) && (
              <div className="border-b border-border px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <h2 className="text-lg font-semibold text-foreground">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="sr-only">Close panel</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div
              ref={contentRef}
              className={cn(
                'flex-1 overflow-y-auto',
                !noPadding && 'px-6 py-6'
              )}
            >
              {children}
            </div>
          </div>
          </SlidePanelOverlayContext.Provider>
        </div>
      </div>
    </div>
  )
}

// Subcomponents for better composition
SlidePanel.Header = function SlidePanelHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-b border-border px-6 py-4', className)}>
      {children}
    </div>
  )
}

SlidePanel.Body = function SlidePanelBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

SlidePanel.Footer = function SlidePanelFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-t border-border bg-muted/50 px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}
