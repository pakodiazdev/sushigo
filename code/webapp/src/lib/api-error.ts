import { AxiosError } from 'axios'

/**
 * API error response structure from Laravel backend
 */
export interface ApiErrorResponse {
  status?: number
  message?: string
  errors?: Record<string, string[]>
}

/**
 * Type alias for Axios errors with our API error response structure
 */
export type ApiError = AxiosError<ApiErrorResponse>

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof AxiosError
}

/**
 * Extract error message from an API error
 * Falls back to the provided default message if no API message is available
 */
export function getApiErrorMessage(error: unknown, defaultMessage: string): string {
  if (isApiError(error)) {
    return error.response?.data?.message || defaultMessage
  }
  if (error instanceof Error) {
    return error.message
  }
  return defaultMessage
}

/**
 * Extract the first validation error for a specific field, or fall back to general message
 */
export function getApiFieldError(error: unknown, field: string, defaultMessage: string): string {
  if (isApiError(error)) {
    const fieldError = error.response?.data?.errors?.[field]?.[0]
    if (fieldError) return fieldError
    return error.response?.data?.message || defaultMessage
  }
  if (error instanceof Error) {
    return error.message
  }
  return defaultMessage
}

/**
 * Extract all validation errors from an API error response
 * Returns an object mapping field names to their first error message
 */
export function getApiValidationErrors(error: unknown): Record<string, string> {
  if (isApiError(error) && error.response?.data?.errors) {
    const errors: Record<string, string> = {}
    for (const [field, messages] of Object.entries(error.response.data.errors)) {
      const firstMessage = messages?.[0]
      if (firstMessage) {
        errors[field] = firstMessage
      }
    }
    return errors
  }
  return {}
}

/**
 * Check if an error has validation errors
 */
export function hasApiValidationErrors(error: unknown): boolean {
  return isApiError(error) && Object.keys(error.response?.data?.errors || {}).length > 0
}
