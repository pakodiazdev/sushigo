import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  error,
  hint,
  required,
  className,
  children,
}: Readonly<FormFieldProps>) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-300 focus-visible:ring-red-500 dark:border-red-700',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-300 focus-visible:ring-red-500 dark:border-red-700',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    if (label) {
      return (
        <div className="flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-2 focus:ring-offset-2',
              className
            )}
            {...props}
          />
          <label htmlFor={props.id} className="ml-2 block text-sm text-foreground">
            {label}
          </label>
        </div>
      )
    }

    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-2 focus:ring-offset-2',
          className
        )}
        {...props}
      />
    )
  }
)

Checkbox.displayName = 'Checkbox'
