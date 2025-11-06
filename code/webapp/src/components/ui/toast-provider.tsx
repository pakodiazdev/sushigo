import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Toast, type ToastProps } from '@/components/ui/toast'

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastWithId extends Omit<ToastProps, 'onClose'> {
  id: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastWithId[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(2, 9)
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
