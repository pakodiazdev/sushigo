import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Info } from 'lucide-react'
import { SlidePanelOverlayContext } from '@/components/ui/slide-panel'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  /** Disable the confirm button (e.g. when required input is empty). */
  confirmDisabled?: boolean
  /** Where to render the dialog overlay.
   *  - undefined (default): renders inline with absolute positioning,
   *    covering the nearest positioned ancestor (e.g. a SlidePanel).
   *  - 'viewport': portals to document.body with fixed positioning,
   *    covering the entire browser window.
   */
  container?: 'viewport'
}

const variantStyles = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn: 'bg-blue-600 text-white hover:bg-blue-700',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  isLoading = false,
  confirmDisabled = false,
  container,
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const slidePanelOverlay = useContext(SlidePanelOverlayContext)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating('enter'))
      })
    } else if (visible) {
      setAnimating('exit')
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  // Prevent body scroll only in viewport mode
  useEffect(() => {
    if (container === 'viewport' && isOpen) {
      document.body.style.overflow = 'hidden'
    } else if (container === 'viewport') {
      document.body.style.overflow = 'unset'
    }
    return () => {
      if (container === 'viewport') {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, container])

  if (!visible) return null

  const styles = variantStyles[variant]
  const Icon = styles.icon

  const backdropAnimation =
    animating === 'enter'
      ? 'animate-dialog-backdrop-in'
      : animating === 'exit'
        ? 'animate-dialog-backdrop-out'
        : ''

  const panelAnimation =
    animating === 'enter'
      ? 'animate-dialog-in'
      : animating === 'exit'
        ? 'animate-dialog-out'
        : ''

  // Determine portal target:
  // - 'viewport': portal to document.body (covers full window)
  // - inside SlidePanel (context available): portal to panel container (covers full slider)
  // - otherwise: render inline
  const portalTarget =
    container === 'viewport'
      ? document.body
      : slidePanelOverlay?.current ?? null

  const content = (
    <div className={`${portalTarget ? 'absolute' : 'fixed'} inset-0 z-[60] flex items-center justify-center`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 ${backdropAnimation}`}
        onClick={() => !isLoading && onClose()}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full max-w-md rounded-lg border border-border bg-background shadow-xl ${panelAnimation}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-foreground"
              >
                {title}
              </h3>
              {description && (
                <div
                  id="confirm-dialog-desc"
                  className="mt-2 text-sm text-muted-foreground"
                >
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className={styles.confirmBtn}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )

  return portalTarget ? createPortal(content, portalTarget) : content
}
