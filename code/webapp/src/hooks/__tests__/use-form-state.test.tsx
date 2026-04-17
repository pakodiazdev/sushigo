/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormState, validators } from '../use-form-state'

describe('useFormState', () => {
  describe('basic functionality', () => {
    it('should initialize with provided data', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: 'John', age: 25 },
        })
      )

      expect(result.current.formData).toEqual({ name: 'John', age: 25 })
      expect(result.current.errors).toEqual({})
    })

    it('should update a single field with setField', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', email: '' },
        })
      )

      act(() => {
        result.current.setField('name', 'Jane')
      })

      expect(result.current.formData.name).toBe('Jane')
      expect(result.current.formData.email).toBe('')
    })

    it('should update multiple fields with setFields', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', email: '', age: 0 },
        })
      )

      act(() => {
        result.current.setFields({ name: 'Jane', age: 30 })
      })

      expect(result.current.formData).toEqual({ name: 'Jane', email: '', age: 30 })
    })

    it('should track isDirty state', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: 'John' },
        })
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setField('name', 'Jane')
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setField('name', 'John')
      })

      expect(result.current.isDirty).toBe(false)
    })

    it('should reset form to initial data', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: 'John', age: 25 },
        })
      )

      act(() => {
        result.current.setFields({ name: 'Jane', age: 30 })
        result.current.setErrors({ name: 'Error' })
      })

      expect(result.current.formData).toEqual({ name: 'Jane', age: 30 })
      expect(result.current.errors).toEqual({ name: 'Error' })

      act(() => {
        result.current.reset()
      })

      expect(result.current.formData).toEqual({ name: 'John', age: 25 })
      expect(result.current.errors).toEqual({})
    })
  })

  describe('error handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '' },
        })
      )

      act(() => {
        result.current.setErrors({ name: 'Name is required' })
      })

      expect(result.current.errors).toEqual({ name: 'Name is required' })

      act(() => {
        result.current.clearErrors()
      })

      expect(result.current.errors).toEqual({})
    })

    it('should clear field error when field is updated', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', email: '' },
        })
      )

      act(() => {
        result.current.setErrors({ name: 'Error 1', email: 'Error 2' })
      })

      expect(result.current.errors).toEqual({ name: 'Error 1', email: 'Error 2' })

      act(() => {
        result.current.setField('name', 'John')
      })

      expect(result.current.errors).toEqual({ email: 'Error 2' })
    })

    it('should clear multiple field errors when setFields is used', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', email: '', age: 0 },
        })
      )

      act(() => {
        result.current.setErrors({ name: 'Error 1', email: 'Error 2', age: 'Error 3' })
      })

      act(() => {
        result.current.setFields({ name: 'John', email: 'john@test.com' })
      })

      expect(result.current.errors).toEqual({ age: 'Error 3' })
    })
  })

  describe('validation', () => {
    it('should validate required fields', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', age: 0 },
          validationRules: {
            name: { required: true },
            age: { required: true },
          },
        })
      )

      let isValid: boolean
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid!).toBe(false)
      expect(result.current.errors.name).toBe('This field is required')
      expect(result.current.errors.age).toBe('This field is required')
    })

    it('should pass validation when required fields have values', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: 'John', age: 25 },
          validationRules: {
            name: { required: true },
            age: { required: true },
          },
        })
      )

      let isValid: boolean
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid!).toBe(true)
      expect(result.current.errors).toEqual({})
    })

    it('should run custom validation function', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: 'Jo' },
          validationRules: {
            name: {
              validate: (value) => {
                if (typeof value === 'string' && value.length < 3) {
                  return 'Name must be at least 3 characters'
                }
              },
            },
          },
        })
      )

      let isValid: boolean
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid!).toBe(false)
      expect(result.current.errors.name).toBe('Name must be at least 3 characters')
    })

    it('should validate a single field', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '', email: '' },
          validationRules: {
            name: { required: true },
            email: {
              validate: (value) => {
                if (typeof value === 'string' && value && !value.includes('@')) {
                  return 'Invalid email'
                }
              },
            },
          },
        })
      )

      expect(result.current.validateField('name')).toBe('This field is required')
      expect(result.current.validateField('email')).toBeUndefined() // Empty is OK since not required
    })

    it('should return true when no validation rules are provided', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { name: '' },
        })
      )

      let isValid: boolean
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid!).toBe(true)
    })

    it('should handle boolean fields correctly for required validation', () => {
      const { result } = renderHook(() =>
        useFormState({
          initialData: { is_active: false },
          validationRules: {
            is_active: { required: true },
          },
        })
      )

      let isValid: boolean
      act(() => {
        isValid = result.current.validate()
      })

      // false is a valid value for boolean
      expect(isValid!).toBe(true)
    })
  })
})

describe('validators', () => {
  describe('minLength', () => {
    it('should return error for short strings', () => {
      const validate = validators.minLength(3)
      expect(validate('ab')).toBe('Must be at least 3 characters')
      expect(validate('abc')).toBeUndefined()
    })

    it('should use custom message', () => {
      const validate = validators.minLength(3, 'Too short!')
      expect(validate('ab')).toBe('Too short!')
    })
  })

  describe('maxLength', () => {
    it('should return error for long strings', () => {
      const validate = validators.maxLength(5)
      expect(validate('123456')).toBe('Must be at most 5 characters')
      expect(validate('12345')).toBeUndefined()
    })
  })

  describe('range', () => {
    it('should validate number range', () => {
      const validate = validators.range(0, 100)
      expect(validate(-1)).toBe('Must be between 0 and 100')
      expect(validate(101)).toBe('Must be between 0 and 100')
      expect(validate(50)).toBeUndefined()
    })
  })

  describe('positive', () => {
    it('should validate positive numbers', () => {
      const validate = validators.positive()
      expect(validate(-1)).toBe('Must be a positive number')
      expect(validate(0)).toBeUndefined()
      expect(validate(1)).toBeUndefined()
    })
  })

  describe('email', () => {
    it('should validate email format', () => {
      const validate = validators.email()
      expect(validate('invalid')).toBe('Invalid email format')
      expect(validate('valid@email.com')).toBeUndefined()
      expect(validate('')).toBeUndefined() // Empty is OK
    })
  })

  describe('pattern', () => {
    it('should validate against regex pattern', () => {
      const validate = validators.pattern(/^\d{4}$/, 'Must be 4 digits')
      expect(validate('123')).toBe('Must be 4 digits')
      expect(validate('1234')).toBeUndefined()
      expect(validate('')).toBeUndefined() // Empty is OK
    })
  })

  describe('compose', () => {
    it('should run multiple validators and return first error', () => {
      const validate = validators.compose(
        validators.minLength(3),
        validators.maxLength(10)
      )

      expect(validate('ab')).toBe('Must be at least 3 characters')
      expect(validate('12345678901')).toBe('Must be at most 10 characters')
      expect(validate('valid')).toBeUndefined()
    })

    it('should return undefined if all validators pass', () => {
      const validate = validators.compose(
        validators.minLength(1),
        validators.maxLength(100)
      )

      expect(validate('test')).toBeUndefined()
    })
  })
})
