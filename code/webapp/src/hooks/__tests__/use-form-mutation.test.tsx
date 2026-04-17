/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFormMutation, useCreateUpdateMutation } from '../use-form-mutation'
import * as toastProvider from '@/components/ui/toast-provider'
import * as apiError from '@/lib/api-error'

// Mock toast provider
vi.mock('@/components/ui/toast-provider', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    removeToast: vi.fn(),
  })),
}))

// Mock api-error
vi.mock('@/lib/api-error', () => ({
  getApiErrorMessage: vi.fn((_error, fallback) => fallback),
  getApiValidationErrors: vi.fn(() => ({})),
  hasApiValidationErrors: vi.fn(() => false),
}))

describe('useFormMutation', () => {
  let queryClient: QueryClient
  let mockShowSuccess: ReturnType<typeof vi.fn<(message: string, title?: string) => void>>
  let mockShowError: ReturnType<typeof vi.fn<(message: string, title?: string) => void>>

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    mockShowSuccess = vi.fn()
    mockShowError = vi.fn()
    vi.mocked(toastProvider.useToast).mockReturnValue({
      showToast: vi.fn(),
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: vi.fn(),
      showInfo: vi.fn(),
      removeToast: vi.fn(),
    })
    vi.mocked(apiError.hasApiValidationErrors).mockReturnValue(false)
    vi.mocked(apiError.getApiValidationErrors).mockReturnValue({})
  })

  it('should execute mutation and show success toast', async () => {
    const mockFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' })
    const onSuccess = vi.fn()

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: mockFn,
          successMessage: 'Item created',
          successTitle: 'Success',
          onSuccess,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ name: 'Test' })
    })

    expect(mockFn).toHaveBeenCalledWith({ name: 'Test' }, expect.anything())
    expect(mockShowSuccess).toHaveBeenCalledWith('Item created', 'Success')
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Test' }, { name: 'Test' })
  })

  it('should show error toast on mutation failure', async () => {
    const error = new Error('Network error')
    const mockFn = vi.fn().mockRejectedValue(error)

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: mockFn,
          successMessage: 'Item created',
          errorMessageFallback: 'Failed to create item',
          errorTitle: 'Error',
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ name: 'Test' })
    })

    expect(mockShowError).toHaveBeenCalledWith('Failed to create item', 'Error')
  })

  it('should extract and set validation errors from API', async () => {
    const validationErrors = { name: 'Name is required', email: 'Invalid email' }
    vi.mocked(apiError.hasApiValidationErrors).mockReturnValue(true)
    vi.mocked(apiError.getApiValidationErrors).mockReturnValue(validationErrors)

    const mockFn = vi.fn().mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: mockFn,
          successMessage: 'Success',
          errorMessageFallback: 'Failed',
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ name: '' })
    })

    expect(result.current.validationErrors).toEqual(validationErrors)
  })

  it('should clear validation errors on new execution', async () => {
    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: vi.fn().mockResolvedValue({}),
          successMessage: 'Success',
        }),
      { wrapper }
    )

    // Set some errors manually
    act(() => {
      result.current.setValidationErrors({ name: 'Error' })
    })

    expect(result.current.validationErrors).toEqual({ name: 'Error' })

    // Execute should clear them
    await act(async () => {
      await result.current.execute({})
    })

    expect(result.current.validationErrors).toEqual({})
  })

  it('should expose isPending state', async () => {
    let resolvePromise: (value: unknown) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    const mockFn = vi.fn().mockReturnValue(promise)

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: mockFn,
          successMessage: 'Success',
        }),
      { wrapper }
    )

    expect(result.current.isPending).toBe(false)

    act(() => {
      result.current.execute({})
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    await act(async () => {
      resolvePromise!({})
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })

  it('should provide clearValidationErrors function', () => {
    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: vi.fn(),
          successMessage: 'Success',
        }),
      { wrapper }
    )

    act(() => {
      result.current.setValidationErrors({ field: 'Error' })
    })

    expect(result.current.validationErrors).toEqual({ field: 'Error' })

    act(() => {
      result.current.clearValidationErrors()
    })

    expect(result.current.validationErrors).toEqual({})
  })

  it('should use default titles when not provided', async () => {
    const mockFn = vi.fn().mockResolvedValue({})

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: mockFn,
          successMessage: 'Done',
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({})
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Done', 'Success')
  })
})

describe('useCreateUpdateMutation', () => {
  let queryClient: QueryClient
  let mockShowSuccess: ReturnType<typeof vi.fn<(message: string, title?: string) => void>>

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    mockShowSuccess = vi.fn()
    vi.mocked(toastProvider.useToast).mockReturnValue({
      showToast: vi.fn(),
      showSuccess: mockShowSuccess,
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn(),
      removeToast: vi.fn(),
    })
  })

  it('should call createFn when not editing', async () => {
    const createFn = vi.fn().mockResolvedValue({ id: 1 })
    const updateFn = vi.fn()

    const { result } = renderHook(
      () =>
        useCreateUpdateMutation({
          createFn,
          updateFn,
          entityName: 'Item',
          isEditing: false,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ name: 'New Item' })
    })

    expect(createFn).toHaveBeenCalledWith({ name: 'New Item' })
    expect(updateFn).not.toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalledWith('Item created successfully', 'Item Created')
  })

  it('should call updateFn when editing', async () => {
    const createFn = vi.fn()
    const updateFn = vi.fn().mockResolvedValue({ id: 1 })

    const { result } = renderHook(
      () =>
        useCreateUpdateMutation({
          createFn,
          updateFn,
          entityName: 'Item',
          isEditing: true,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ id: 1, name: 'Updated Item' })
    })

    expect(updateFn).toHaveBeenCalledWith({ id: 1, name: 'Updated Item' })
    expect(createFn).not.toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalledWith('Item updated successfully', 'Item Updated')
  })

  it('should call onSuccess callback with data', async () => {
    const onSuccess = vi.fn()
    const createFn = vi.fn().mockResolvedValue({ id: 1, name: 'Created' })

    const { result } = renderHook(
      () =>
        useCreateUpdateMutation({
          createFn,
          updateFn: vi.fn(),
          entityName: 'Item',
          isEditing: false,
          onSuccess,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.execute({ name: 'Test' })
    })

    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Created' })
  })
})
