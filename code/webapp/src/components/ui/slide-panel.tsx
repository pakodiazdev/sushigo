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

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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
          <div ref={overlayRef} className="relative flex h-full flex-col bg-background shadow-xl">
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
