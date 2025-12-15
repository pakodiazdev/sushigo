import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
