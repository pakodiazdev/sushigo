/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupplierForm } from '../supplier-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../api/supplier-api', () => ({ supplierApi: apiMocks }))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: { mutationFn: (values: unknown) => Promise<unknown>; onSuccess: () => void }) => ({
    execute: async (values: unknown) => {
      await config.mutationFn(values)
      config.onSuccess()
    },
    validationErrors: {},
    isPending: false,
  }),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

describe('SupplierForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders supplier identity and contact fields', () => {
    const view = render(<SupplierForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(view.getByLabelText(/código/i)).toBeDefined()
    expect(view.getByLabelText(/nombre del proveedor/i)).toBeDefined()
    expect(view.getByLabelText(/correo/i)).toBeDefined()
    expect(view.getByRole('button', { name: /crear proveedor/i })).toBeDefined()
  })

  it('shows update mode and calls cancel', () => {
    const onCancel = vi.fn()
    const view = render(
      <SupplierForm
        supplier={{ id: '01', code: 'MAR', name: 'Mar', contact_name: null, email: null, phone: null, is_active: true, offerings_count: 0 }}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />,
    )
    expect(view.getByRole('button', { name: /actualizar proveedor/i })).toBeDefined()
    fireEvent.click(view.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('normalizes optional values and creates a supplier', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const view = render(<SupplierForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText(/código/i), { target: { value: 'mar-01' } })
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
    const supplier = { id: '01', code: 'MAR', name: 'Mar', contact_name: null, email: null, phone: null, is_active: true, offerings_count: 0 }
    const view = render(<SupplierForm supplier={supplier} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(view.getByLabelText(/nombre del proveedor/i), { target: { value: 'Mar Actualizado' } })
    fireEvent.click(view.getByLabelText(/proveedor activo/i))
    fireEvent.submit(view.container.querySelector('form')!)

    await waitFor(() => expect(apiMocks.update).toHaveBeenCalledWith('01', expect.objectContaining({
      name: 'Mar Actualizado',
      is_active: false,
    })))
  })
})
