/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCashRegisterForm } from '../use-cash-register-form'
import { CashRegisterType, type CashRegister } from '@/types/cash'

const apiMocks = vi.hoisted(() => ({ nextCode: vi.fn(), create: vi.fn() }))
const updateMock = vi.hoisted(() => ({ mutateAsync: vi.fn() }))
const toastMocks = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }))

vi.mock('@/services/cash-api', () => ({
  cashRegisterApi: { nextCode: apiMocks.nextCode, create: apiMocks.create },
}))

vi.mock('@/services/cash-hooks', () => ({
  useUpdateCashRegister: () => ({ mutateAsync: updateMock.mutateAsync, isPending: false }),
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => toastMocks,
}))

vi.mock('@/lib/api-error', () => ({
  isApiError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'response' in error),
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

const existingRegister: CashRegister = {
  id: '01ABC',
  branch_id: 1,
  operating_unit_id: null,
  code: 'REG-042',
  name: 'Caja Existente',
  type: CashRegisterType.ON_PREMISE,
  is_active: true,
  meta: null,
  created_at: '',
  updated_at: '',
}

const submitValues = {
  code: 'REG-014',
  name: 'Caja Nueva',
  branch_id: 1,
  operating_unit_id: null,
  type: CashRegisterType.ON_PREMISE,
  is_active: true,
  meta: undefined,
}

function collisionError(rejected: string) {
  return {
    response: {
      data: {
        message: 'Ya existe una caja registradora con este código.',
        errors: { code: ['Ya existe una caja registradora con este código.'] },
        rejected_code: rejected,
        suggested_code: 'REG-015',
      },
    },
  }
}

function renderForm(register?: CashRegister | null, isOpen = true) {
  const onSuccess = vi.fn()
  const onClose = vi.fn()
  const view = renderHook(
    ({ open }: { open: boolean }) =>
      useCashRegisterForm({ register, isOpen: open, onSuccess, onClose }),
    { wrapper, initialProps: { open: isOpen } },
  )
  return { ...view, onSuccess, onClose }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useCashRegisterForm', () => {
  it('fetches and prefills the suggested code in create mode', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-001', prefix: 'REG-' } })
    const { result } = renderForm(null)

    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))
    expect(apiMocks.nextCode).toHaveBeenCalledOnce()
    expect(result.current.isCodeSuggested).toBe(true)
  })

  it('does not fetch a suggestion in edit mode and keeps the persisted code', async () => {
    const { result } = renderForm(existingRegister)

    await Promise.resolve()
    expect(apiMocks.nextCode).not.toHaveBeenCalled()
    expect(result.current.values.code).toBe('REG-042')
    expect(result.current.isEditing).toBe(true)
    expect(result.current.isCodeSuggested).toBe(false)
  })

  it('does not fetch a suggestion while the panel is closed', async () => {
    const { result } = renderForm(null, false)

    await Promise.resolve()
    expect(apiMocks.nextCode).not.toHaveBeenCalled()
    expect(result.current.values.code).toBe('')
  })

  it('fetches a fresh suggestion each time the create panel is reopened', async () => {
    apiMocks.nextCode
      .mockResolvedValueOnce({ data: { code: 'REG-001', prefix: 'REG-' } })
      .mockResolvedValueOnce({ data: { code: 'REG-002', prefix: 'REG-' } })
    const { result, rerender } = renderForm(null, false)

    rerender({ open: true })
    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))

    rerender({ open: false })
    rerender({ open: true })
    await waitFor(() => expect(result.current.values.code).toBe('REG-002'))
    expect(apiMocks.nextCode).toHaveBeenCalledTimes(2)
  })

  it('re-fetches and re-prefills when the refresh action is used', async () => {
    apiMocks.nextCode
      .mockResolvedValueOnce({ data: { code: 'REG-001', prefix: 'REG-' } })
      .mockResolvedValueOnce({ data: { code: 'REG-007', prefix: 'REG-' } })
    const { result } = renderForm(null)

    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))
    act(() => result.current.handleRefreshCode())
    await waitFor(() => expect(result.current.values.code).toBe('REG-007'))
    expect(apiMocks.nextCode).toHaveBeenCalledTimes(2)
  })

  it('stops overriding the code once the operator edits it manually', async () => {
    apiMocks.nextCode
      .mockResolvedValueOnce({ data: { code: 'REG-001', prefix: 'REG-' } })
      .mockResolvedValueOnce({ data: { code: 'REG-050', prefix: 'REG-' } })
    const { result } = renderForm(null)
    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))

    act(() => {
      // In the DOM the input's onChange both updates RHF and runs onCodeChange;
      // emulate both halves here since there is no mounted input.
      result.current.setValue('code', 'MI-CAJA')
      result.current.onCodeChange({
        target: { name: 'code', type: 'text', value: 'MI-CAJA' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.isCodeSuggested).toBe(false)
    act(() => result.current.handleRefreshCode())
    await waitFor(() => expect(apiMocks.nextCode).toHaveBeenCalledTimes(2))
  })

  it('replaces an untouched generated code in place on a collision, requires a resubmit, and shows no error toast', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-014', prefix: 'REG-' } })
    apiMocks.create.mockRejectedValue(collisionError('REG-014'))
    const { result, onSuccess } = renderForm(null)
    await waitFor(() => expect(result.current.values.code).toBe('REG-014'))

    await act(async () => {
      await result.current.onSubmit(submitValues)
    })

    expect(result.current.collision).toEqual({ rejectedCode: 'REG-014', suggestedCode: 'REG-015' })
    expect(result.current.values.code).toBe('REG-015')
    expect(result.current.canApplySuggestedCode).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
    // The graceful inline recovery must not be paired with a red failure toast.
    expect(toastMocks.showError).not.toHaveBeenCalled()
  })

  it('keeps a manually edited code on a collision and adopts the suggestion only on explicit action', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-014', prefix: 'REG-' } })
    apiMocks.create.mockRejectedValue(collisionError('MI-CAJA'))
    const { result } = renderForm(null)
    await waitFor(() => expect(result.current.values.code).toBe('REG-014'))

    act(() => {
      // In the DOM the input's onChange both updates RHF and runs onCodeChange;
      // emulate both halves here since there is no mounted input.
      result.current.setValue('code', 'MI-CAJA')
      result.current.onCodeChange({
        target: { name: 'code', type: 'text', value: 'MI-CAJA' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    await act(async () => {
      await result.current.onSubmit({ ...submitValues, code: 'MI-CAJA' })
    })

    expect(result.current.values.code).toBe('MI-CAJA')
    expect(result.current.canApplySuggestedCode).toBe(true)
    expect(result.current.codeError).toBe('Ya existe una caja registradora con este código.')
    expect(toastMocks.showError).not.toHaveBeenCalled()

    act(() => result.current.applySuggestedCode())
    expect(result.current.values.code).toBe('REG-015')
    expect(result.current.collision).toBeNull()
    expect(result.current.codeError).toBeUndefined()
  })

  it('still shows an error toast for a non-collision create failure', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-001', prefix: 'REG-' } })
    apiMocks.create.mockRejectedValue({ response: { data: { errors: { name: ['requerido'] } } } })
    const { result, onSuccess, onClose } = renderForm(null)
    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))

    await act(async () => {
      await result.current.onSubmit(submitValues)
    })

    expect(toastMocks.showError).toHaveBeenCalledOnce()
    expect(result.current.collision).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onSuccess, onClose and a success toast after a successful create', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-001', prefix: 'REG-' } })
    apiMocks.create.mockResolvedValue({ data: { data: { id: 'new' } } })
    const { result, onSuccess, onClose } = renderForm(null)
    await waitFor(() => expect(result.current.values.code).toBe('REG-001'))

    await act(async () => {
      await result.current.onSubmit(submitValues)
    })

    expect(apiMocks.create).toHaveBeenCalledOnce()
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(toastMocks.showSuccess).toHaveBeenCalledOnce()
    expect(toastMocks.showError).not.toHaveBeenCalled()
  })
})
