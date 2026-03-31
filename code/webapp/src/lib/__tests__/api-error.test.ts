import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import {
  isApiError,
  getApiErrorMessage,
  getApiFieldError,
  getApiValidationErrors,
  hasApiValidationErrors,
} from '@/lib/api-error'

/**
 * Helper to create a mock AxiosError with API response structure
 */
function createAxiosError(
  message?: string,
  errors?: Record<string, string[]>,
  status = 422
): AxiosError<{ message?: string; errors?: Record<string, string[]> }> {
  const error = new AxiosError<{ message?: string; errors?: Record<string, string[]> }>('Request failed')
  error.response = {
    data: { message, errors },
    status,
    statusText: status === 422 ? 'Unprocessable Entity' : 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('isApiError', () => {
  it('returns true for AxiosError instances', () => {
    const error = new AxiosError('test')
    expect(isApiError(error)).toBe(true)
  })

  it('returns false for regular Error instances', () => {
    const error = new Error('test')
    expect(isApiError(error)).toBe(false)
  })

  it('returns false for string errors', () => {
    expect(isApiError('error message')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isApiError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isApiError(undefined)).toBe(false)
  })

  it('returns false for plain objects', () => {
    expect(isApiError({ message: 'error' })).toBe(false)
  })
})

describe('getApiErrorMessage', () => {
  it('extracts message from API response', () => {
    const error = createAxiosError('Email already taken')
    expect(getApiErrorMessage(error, 'Default message')).toBe('Email already taken')
  })

  it('returns default message when API response has no message', () => {
    const error = createAxiosError(undefined)
    expect(getApiErrorMessage(error, 'Default message')).toBe('Default message')
  })

  it('returns default message when response is missing', () => {
    const error = new AxiosError('Network error')
    expect(getApiErrorMessage(error, 'Default message')).toBe('Default message')
  })

  it('extracts message from regular Error instances', () => {
    const error = new Error('Something went wrong')
    expect(getApiErrorMessage(error, 'Default')).toBe('Something went wrong')
  })

  it('returns default message for string errors', () => {
    expect(getApiErrorMessage('unknown error', 'Default')).toBe('Default')
  })

  it('returns default message for null', () => {
    expect(getApiErrorMessage(null, 'Default')).toBe('Default')
  })

  it('returns default message for undefined', () => {
    expect(getApiErrorMessage(undefined, 'Default')).toBe('Default')
  })
})

describe('getApiFieldError', () => {
  it('extracts first error for a specific field', () => {
    const error = createAxiosError('Validation failed', {
      email: ['Email is invalid', 'Email already taken'],
      name: ['Name is required'],
    })
    expect(getApiFieldError(error, 'email', 'Default')).toBe('Email is invalid')
  })

  it('returns general message when field has no errors', () => {
    const error = createAxiosError('Validation failed', {
      name: ['Name is required'],
    })
    expect(getApiFieldError(error, 'email', 'Default')).toBe('Validation failed')
  })

  it('returns default message when no errors object exists', () => {
    const error = createAxiosError(undefined)
    expect(getApiFieldError(error, 'email', 'Default')).toBe('Default')
  })

  it('returns default message when response is missing', () => {
    const error = new AxiosError('Network error')
    expect(getApiFieldError(error, 'email', 'Default')).toBe('Default')
  })

  it('extracts message from regular Error instances', () => {
    const error = new Error('Something went wrong')
    expect(getApiFieldError(error, 'email', 'Default')).toBe('Something went wrong')
  })

  it('returns default message for non-error values', () => {
    expect(getApiFieldError('string error', 'email', 'Default')).toBe('Default')
    expect(getApiFieldError(null, 'email', 'Default')).toBe('Default')
    expect(getApiFieldError(undefined, 'email', 'Default')).toBe('Default')
  })
})

describe('getApiValidationErrors', () => {
  it('extracts all validation errors mapping field to first message', () => {
    const error = createAxiosError('Validation failed', {
      email: ['Email is invalid', 'Email already taken'],
      name: ['Name is required'],
      password: ['Password too short'],
    })
    expect(getApiValidationErrors(error)).toEqual({
      email: 'Email is invalid',
      name: 'Name is required',
      password: 'Password too short',
    })
  })

  it('returns empty object when no errors in response', () => {
    const error = createAxiosError('Server error')
    expect(getApiValidationErrors(error)).toEqual({})
  })

  it('returns empty object when response is missing', () => {
    const error = new AxiosError('Network error')
    expect(getApiValidationErrors(error)).toEqual({})
  })

  it('returns empty object for regular Error instances', () => {
    const error = new Error('Something went wrong')
    expect(getApiValidationErrors(error)).toEqual({})
  })

  it('returns empty object for non-error values', () => {
    expect(getApiValidationErrors('string error')).toEqual({})
    expect(getApiValidationErrors(null)).toEqual({})
    expect(getApiValidationErrors(undefined)).toEqual({})
  })

  it('skips fields with empty message arrays', () => {
    const error = createAxiosError('Validation failed', {
      email: ['Email is invalid'],
      name: [],
    })
    expect(getApiValidationErrors(error)).toEqual({
      email: 'Email is invalid',
    })
  })

  it('handles undefined message arrays gracefully', () => {
    const error = createAxiosError('Validation failed', {
      email: ['Email is invalid'],
    })
    // Simulate an edge case where messages could be undefined
    if (error.response?.data?.errors) {
      ;(error.response.data.errors as Record<string, string[] | undefined>).name = undefined
    }
    expect(getApiValidationErrors(error)).toEqual({
      email: 'Email is invalid',
    })
  })
})

describe('hasApiValidationErrors', () => {
  it('returns true when response has validation errors', () => {
    const error = createAxiosError('Validation failed', {
      email: ['Email is invalid'],
    })
    expect(hasApiValidationErrors(error)).toBe(true)
  })

  it('returns false when errors object is empty', () => {
    const error = createAxiosError('Validation failed', {})
    expect(hasApiValidationErrors(error)).toBe(false)
  })

  it('returns false when no errors property exists', () => {
    const error = createAxiosError('Server error')
    expect(hasApiValidationErrors(error)).toBe(false)
  })

  it('returns false when response is missing', () => {
    const error = new AxiosError('Network error')
    expect(hasApiValidationErrors(error)).toBe(false)
  })

  it('returns false for regular Error instances', () => {
    const error = new Error('Something went wrong')
    expect(hasApiValidationErrors(error)).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(hasApiValidationErrors('string error')).toBe(false)
    expect(hasApiValidationErrors(null)).toBe(false)
    expect(hasApiValidationErrors(undefined)).toBe(false)
  })
})
