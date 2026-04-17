import { useState, useCallback, useMemo } from 'react'

export type ValidationRule<T> = {
  /** The validation function - returns error message or undefined if valid */
  validate?: (value: T[keyof T], formData: T) => string | undefined
  /** Whether this field is required */
  required?: boolean
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>
}

export interface FormStateConfig<T extends object> {
  /** Initial form data */
  initialData: T
  /** Validation rules for each field */
  validationRules?: ValidationRules<T>
}

export interface FormStateResult<T extends object> {
  /** Current form data */
  formData: T
  /** Current validation errors */
  errors: Record<string, string>
  /** Update a single field */
  setField: <K extends keyof T>(field: K, value: T[K]) => void
  /** Update multiple fields at once */
  setFields: (updates: Partial<T>) => void
  /** Set the entire form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /** Set validation errors */
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  /** Clear all errors */
  clearErrors: () => void
  /** Validate the form and return whether it's valid */
  validate: () => boolean
  /** Validate a single field */
  validateField: (field: keyof T) => string | undefined
  /** Reset form to initial data */
  reset: () => void
  /** Check if form has been modified */
  isDirty: boolean
}

/**
 * A hook for managing form state with validation.
 * Provides a clean interface for form data, errors, and validation.
 * 
 * @example
 * ```tsx
 * const { formData, setField, errors, validate } = useFormState({
 *   initialData: { name: '', email: '' },
 *   validationRules: {
 *     name: {
 *       required: true,
 *       validate: (value) => {
 *         if (typeof value === 'string' && value.length < 3) {
 *           return 'Name must be at least 3 characters'
 *         }
 *       }
 *     },
 *     email: {
 *       required: true,
 *       validate: (value) => {
 *         if (typeof value === 'string' && !value.includes('@')) {
 *           return 'Invalid email format'
 *         }
 *       }
 *     }
 *   }
 * })
 * ```
 */
export function useFormState<T extends object>(
  config: FormStateConfig<T>
): FormStateResult<T> {
  const [formData, setFormData] = useState<T>(config.initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [initialSnapshot] = useState<T>(config.initialData)

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when it changes
    setErrors(prev => {
      if (prev[field as string]) {
        const { [field as string]: _, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const setFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Clear errors for updated fields
    const updatedKeys = Object.keys(updates)
    setErrors(prev => {
      const newErrors = { ...prev }
      updatedKeys.forEach(key => {
        delete newErrors[key]
      })
      return newErrors
    })
  }, [])

  const validateField = useCallback((field: keyof T): string | undefined => {
    const rule = config.validationRules?.[field]
    if (!rule) return undefined

    const value = formData[field]

    // Check required
    if (rule.required) {
      const isEmpty = 
        value === undefined || 
        value === null || 
        value === '' || 
        (typeof value === 'number' && value === 0 && rule.required)
      
      if (isEmpty && typeof value !== 'boolean') {
        return `This field is required`
      }
    }

    // Run custom validation
    if (rule.validate) {
      return rule.validate(value, formData)
    }

    return undefined
  }, [formData, config.validationRules])

  const validate = useCallback((): boolean => {
    if (!config.validationRules) return true

    const newErrors: Record<string, string> = {}
    let isValid = true

    for (const field of Object.keys(config.validationRules) as (keyof T)[]) {
      const error = validateField(field)
      if (error) {
        newErrors[field as string] = error
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [config.validationRules, validateField])

  const reset = useCallback(() => {
    setFormData(initialSnapshot)
    clearErrors()
  }, [initialSnapshot, clearErrors])

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialSnapshot)
  }, [formData, initialSnapshot])

  return {
    formData,
    errors,
    setField,
    setFields,
    setFormData,
    setErrors,
    clearErrors,
    validate,
    validateField,
    reset,
    isDirty,
  }
}

// Utility validation functions
export const validators = {
  /** Validates minimum string length */
  minLength: (min: number, message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.length < min) {
      return message || `Must be at least ${min} characters`
    }
  },

  /** Validates maximum string length */
  maxLength: (max: number, message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.length > max) {
      return message || `Must be at most ${max} characters`
    }
  },

  /** Validates number range */
  range: (min: number, max: number, message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'number' && (value < min || value > max)) {
      return message || `Must be between ${min} and ${max}`
    }
  },

  /** Validates positive number */
  positive: (message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'number' && value < 0) {
      return message || 'Must be a positive number'
    }
  },

  /** Validates number is greater than a threshold */
  greaterThan: (min: number, message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'number' && value <= min) {
      return message || `Must be greater than ${min}`
    }
  },

  /** Validates email format */
  email: (message?: string) => (value: unknown): string | undefined => {
    if (typeof value === 'string' && value && !value.includes('@')) {
      return message || 'Invalid email format'
    }
  },

  /** Validates pattern */
  pattern: (regex: RegExp, message: string) => (value: unknown): string | undefined => {
    if (typeof value === 'string' && value && !regex.test(value)) {
      return message
    }
  },

  /** Compose multiple validators */
  compose: (...validators: ((value: unknown) => string | undefined)[]) => 
    (value: unknown): string | undefined => {
      for (const validator of validators) {
        const error = validator(value)
        if (error) return error
      }
    },
}
