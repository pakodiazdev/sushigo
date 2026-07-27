import { useState, useCallback, type ReactNode } from 'react'
import { Toast, type ToastProps } from '@/components/ui/toast'
import { ToastContext } from '@/components/ui/toast-context'

interface ToastWithId extends Omit<ToastProps, 'onClose'> {
  id: string
}

let toastFallbackCounter = 0

function generateToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  toastFallbackCounter += 1
  return `toast-${Date.now()}-${toastFallbackCounter}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastWithId[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = generateToastId()
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title, variant: 'success' })
    },
    [showToast]
  )

  const showError = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title, variant: 'error', duration: 7000 })
    },
    [showToast]
  )

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title, variant: 'warning', duration: 6000 })
    },
    [showToast]
  )

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title, variant: 'info' })
    },
    [showToast]
  )

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeToast,
      }}
    >
      {children}

      {/* Toast Container */}
      <div
        className="fixed top-0 right-0 z-50 p-4 space-y-3 max-h-screen overflow-hidden"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
