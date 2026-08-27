/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupplierForm } from '../supplier-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), nextCode: vi.fn() }))
// Mirrors useFormMutation's real behavior: a rejected mutateAsync populates
// validationErrors from response.data.errors; clearValidationErrors / a success wipe it.
const formMutationState = vi.hoisted(() => ({ validationErrors: {} as Record<string, string> }))

vi.mock('../../api/supplier-api', () => ({ supplierApi: apiMocks }))

vi.mock('@/lib/api-error', () => ({
  isApiError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'response' in error),
}))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: {
    mutationFn: (values: unknown) => Promise<unknown>
    onSuccess: () => void
  }) => ({
    mutation: {
      mutateAsync: async (values: unknown) => {
        try {
          const result = await config.mutationFn(values)
          config.onSuccess()
          formMutationState.validationErrors = {}
          return result
        } catch (error) {
          const errs = (error as { response?: { data?: { errors?: Record<string, string[]> } } })
            ?.response?.data?.errors
          if (errs) {
            formMutationState.validationErrors = Object.fromEntries(
              Object.entries(errs).map(([field, messages]) => [field, messages[0] ?? '']),
            )
          }
          throw error
        }
      },
      error: null,
    },
    validationErrors: formMutationState.validationErrors,
    clearValidationErrors: () => {
      formMutationState.validationErrors = {}
    },
    isPending: false,
  }),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}))

function renderForm(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(createElement(QueryClientProvider, { client }, ui))
}

const editableSupplier = {
  id: '01',
  code: 'MAR',
  name: 'Mar',
  contact_name: null,
  email: null,
  phone: null,
  is_active: true,
  offerings_count: 0,
}

describe('SupplierForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    formMutationState.validationErrors = {}
  })

  const DUPLICATE = 'Ya existe un proveedor con este código.'

  it('renders supplier identity and contact fields', () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-001', prefix: 'PROV-' } })
    const view = renderForm(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(view.getByLabelText('Código')).toBeDefined()
    expect(view.getByLabelText(/nombre del proveedor/i)).toBeDefined()
    expect(view.getByRole('button', { name: /crear proveedor/i })).toBeDefined()
  })

  it('does not request or show a suggestion when editing an existing supplier', () => {
    const onCancel = vi.fn()
    const view = renderForm(
      <SupplierForm supplier={editableSupplier} onSuccess={vi.fn()} onCancel={onCancel} />,
    )
    expect(view.getByRole('button', { name: /actualizar proveedor/i })).toBeDefined()
    expect(view.queryByLabelText('Sugerir otro código')).toBeNull()
    expect(view.queryByText(/sugerido automáticamente/i)).toBeNull()
    expect(apiMocks.nextCode).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('prefills the server-suggested code and shows the editable hint', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    const view = renderForm(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-014'),
    )
    expect(view.getByText(/sugerido automáticamente/i)).toBeDefined()
  })

  it('requests a fresh suggestion when the refresh control is used', async () => {
    apiMocks.nextCode
      .mockResolvedValueOnce({ data: { code: 'PROV-014', prefix: 'PROV-' } })
      .mockResolvedValueOnce({ data: { code: 'PROV-020', prefix: 'PROV-' } })
    const view = renderForm(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-014'),
    )
    fireEvent.click(view.getByLabelText('Sugerir otro código'))
    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-020'),
    )
  })

  it('keeps a manually edited code instead of the fetched suggestion', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    const view = renderForm(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-014'),
    )
    fireEvent.change(view.getByLabelText('Código'), { target: { value: 'MI-CODIGO' } })
    expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('MI-CODIGO')
    expect(view.queryByText(/sugerido automáticamente/i)).toBeNull()
  })

  it('replaces an untouched suggestion in place on a collision and requires another submit', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    apiMocks.create.mockRejectedValueOnce({
      response: {
        data: {
          errors: { code: [DUPLICATE] },
          rejected_code: 'PROV-014',
          suggested_code: 'PROV-015',
        },
      },
    })
    const onSuccess = vi.fn()
    const view = renderForm(<SupplierForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-014'),
    )
    fireEvent.change(view.getByLabelText(/nombre del proveedor/i), { target: { value: 'Mar Uno' } })
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-015'),
    )
    expect(view.getByText(/PROV-014 acaba de ser utilizado/i)).toBeDefined()
    expect(view.queryByRole('button', { name: /usar PROV-015/i })).toBeNull()
    // The stale "code already taken" error applied to PROV-014, not the fresh PROV-015.
    expect(view.queryByText(DUPLICATE)).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()

    apiMocks.create.mockResolvedValueOnce({})
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(apiMocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'PROV-015' }))
  })

  it('preserves a manually edited code on a collision and offers an explicit replacement', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    apiMocks.create.mockRejectedValueOnce({
      response: {
        data: {
          errors: { code: [DUPLICATE] },
          rejected_code: 'PROV-050',
          suggested_code: 'PROV-015',
        },
      },
    })
    const view = renderForm(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-014'),
    )
    fireEvent.change(view.getByLabelText('Código'), { target: { value: 'PROV-050' } })
    fireEvent.change(view.getByLabelText(/nombre del proveedor/i), { target: { value: 'Mar Uno' } })
    fireEvent.submit(view.container.querySelector('form')!)

    const banner = await view.findByText(/PROV-050 acaba de ser utilizado/i)
    expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-050')
    // A manually typed code that really collided keeps its field error.
    expect(view.getByText(DUPLICATE)).toBeDefined()
    const useButton = within(banner.closest('div')!).getByRole('button', { name: /usar PROV-015/i })
    fireEvent.click(useButton)

    await waitFor(() =>
      expect((view.getByLabelText('Código') as HTMLInputElement).value).toBe('PROV-015'),
    )
    expect(view.queryByText(/PROV-050 acaba de ser utilizado/i)).toBeNull()
    expect(view.queryByText(DUPLICATE)).toBeNull()
  })

  it('normalizes optional values and creates a supplier', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const view = renderForm(<SupplierForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText('Código'), { target: { value: 'mar-01' } })
    fireEvent.change(view.getByLabelText(/nombre del proveedor/i), { target: { value: 'Mar Uno' } })
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledWith({
      code: 'MAR-01',
      name: 'Mar Uno',
      contact_name: null,
      email: null,
      phone: null,
      is_active: true,
    }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('updates the selected supplier', async () => {
    apiMocks.update.mockResolvedValue({})
    const view = renderForm(
      <SupplierForm supplier={editableSupplier} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    )

    fireEvent.change(view.getByLabelText(/nombre del proveedor/i), { target: { value: 'Mar Actualizado' } })
    fireEvent.click(view.getByLabelText(/proveedor activo/i))
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.update).toHaveBeenCalledWith('01', expect.objectContaining({
      name: 'Mar Actualizado',
      is_active: false,
    })))
  })
})
