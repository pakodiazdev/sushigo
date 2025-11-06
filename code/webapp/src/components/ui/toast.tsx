import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  title?: string
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: (id: string) => void
}

const variantStyles = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-900',
    icon: 'text-green-600',
    iconComponent: CheckCircle,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon: 'text-red-600',
    iconComponent: AlertCircle,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    icon: 'text-yellow-600',
    iconComponent: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: 'text-blue-600',
    iconComponent: Info,
  },
}

export function Toast({
  id,
  title,
  message,
  variant = 'info',
  duration = 5000,
  onClose,
}: ToastProps) {
  const style = variantStyles[variant]
  const Icon = style.iconComponent

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg p-4',
        'animate-in slide-in-from-right-full fade-in duration-300',
        style.container
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.icon)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm mb-1">{title}</div>}
          <div className="text-sm">{message}</div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 rounded-lg p-1 hover:bg-black/5 transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
