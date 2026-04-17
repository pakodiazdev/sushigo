import { useState, useCallback } from 'react'
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage, getApiValidationErrors, hasApiValidationErrors } from '@/lib/api-error'

export interface FormMutationConfig<TData, TVariables> {
  /** The mutation function to execute */
  mutationFn: (variables: TVariables) => Promise<TData>
  /** Success message to display */
  successMessage: string
  /** Success title for the toast */
  successTitle?: string
  /** Error message prefix if the API doesn't return one */
  errorMessageFallback?: string
  /** Error title for the toast */
  errorTitle?: string
  /** Callback on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void
  /** Additional mutation options */
  mutationOptions?: Omit<UseMutationOptions<TData, unknown, TVariables>, 'mutationFn' | 'onSuccess' | 'onError'>
}

export interface FormMutationResult<TData, TVariables> {
  /** The mutation result from React Query */
  mutation: UseMutationResult<TData, unknown, TVariables>
  /** Validation errors from the API */
  validationErrors: Record<string, string>
  /** Clear validation errors */
  clearValidationErrors: () => void
  /** Set validation errors manually (for client-side validation) */
  setValidationErrors: (errors: Record<string, string>) => void
  /** Execute the mutation with error handling */
  execute: (variables: TVariables) => Promise<TData | undefined>
  /** Whether the mutation is pending */
  isPending: boolean
}

/**
 * A hook that wraps useMutation with standard form error handling and toast notifications.
 * Reduces boilerplate in form components by providing:
 * - Automatic toast notifications on success/error
 * - API validation error extraction
 * - Consistent error state management
 * 
 * @example
 * ```tsx
 * const { execute, validationErrors, isPending } = useFormMutation({
 *   mutationFn: (data) => api.createItem(data),
 *   successMessage: 'Item created successfully',
 *   successTitle: 'Success',
 *   errorMessageFallback: 'Failed to create item',
 *   onSuccess: () => router.push('/items'),
 * })
 * 
 * const handleSubmit = async (data: FormData) => {
 *   await execute(data)
 * }
 * ```
 */
export function useFormMutation<TData = unknown, TVariables = unknown>(
  config: FormMutationConfig<TData, TVariables>
): FormMutationResult<TData, TVariables> {
  const { showSuccess, showError } = useToast()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({})
  }, [])

  const mutation = useMutation({
    mutationFn: config.mutationFn,
    onSuccess: (data, variables) => {
      clearValidationErrors()
      showSuccess(config.successMessage, config.successTitle || 'Success')
      config.onSuccess?.(data, variables)
    },
    onError: (error: unknown) => {
      if (hasApiValidationErrors(error)) {
        setValidationErrors(getApiValidationErrors(error))
      }
      showError(
        getApiErrorMessage(error, config.errorMessageFallback || 'An error occurred'),
        config.errorTitle || 'Error'
      )
    },
    ...config.mutationOptions,
  })

  const execute = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    try {
      clearValidationErrors()
      return await mutation.mutateAsync(variables)
    } catch {
      // Error is already handled by onError callback
      return undefined
    }
  }, [mutation, clearValidationErrors])

  return {
    mutation,
    validationErrors,
    clearValidationErrors,
    setValidationErrors,
    execute,
    isPending: mutation.isPending,
  }
}

export interface CreateUpdateMutationConfig<TData, TCreateVars, TUpdateVars = TCreateVars> {
  /** Mutation function for creating a new entity */
  createFn: (variables: TCreateVars) => Promise<TData>
  /** Mutation function for updating an existing entity */
  updateFn: (variables: TUpdateVars) => Promise<TData>
  /** Entity name for messages (e.g., 'Item', 'Location') */
  entityName: string
  /** Whether we're editing an existing entity */
  isEditing: boolean
  /** Callback on successful mutation */
  onSuccess?: (data: TData) => void
}

/**
 * A specialized hook for forms that can create or update entities.
 * Automatically switches between create/update mutations based on isEditing flag.
 * 
 * @example
 * ```tsx
 * const { execute, validationErrors, isPending } = useCreateUpdateMutation({
 *   createFn: (data) => api.createItem(data),
 *   updateFn: (data) => api.updateItem(itemId, data),
 *   entityName: 'Item',
 *   isEditing: !!itemId,
 *   onSuccess: () => onClose(),
 * })
 * ```
 */
export function useCreateUpdateMutation<TData = unknown, TCreateVars = unknown, TUpdateVars = TCreateVars>(
  config: CreateUpdateMutationConfig<TData, TCreateVars, TUpdateVars>
): FormMutationResult<TData, TCreateVars | TUpdateVars> {
  const action = config.isEditing ? 'updated' : 'created'
  const actionVerb = config.isEditing ? 'update' : 'create'

  return useFormMutation({
    mutationFn: (variables) => {
      if (config.isEditing) {
        return config.updateFn(variables as TUpdateVars)
      }
      return config.createFn(variables as TCreateVars)
    },
    successMessage: `${config.entityName} ${action} successfully`,
    successTitle: `${config.entityName} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    errorMessageFallback: `Failed to ${actionVerb} ${config.entityName.toLowerCase()}`,
    onSuccess: (data) => config.onSuccess?.(data),
  })
}
