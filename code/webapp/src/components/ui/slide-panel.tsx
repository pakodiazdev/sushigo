import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'right' | 'left'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
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
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
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
            'relative w-screen transform transition-all duration-300 ease-in-out',
            sizeClasses[size],
            position === 'right'
              ? 'animate-in slide-in-from-right'
              : 'animate-in slide-in-from-left',
            className
          )}
        >
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            {(title || description) && (
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Close panel</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
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
    <div className={cn('border-b border-gray-200 px-6 py-4', className)}>
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
        'border-t border-gray-200 bg-gray-50 px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}
