/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSupplierForm } from '../use-supplier-form'

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

describe('useSupplierForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('normalizes supplier data before creating it', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSupplierForm({ onSuccess }))

    await act(async () => {
      await result.current.onSubmit({
        code: 'mar-01',
        name: 'Mar Uno',
        contact_name: '',
        email: '',
        phone: '',
        is_active: true,
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith({
      code: 'MAR-01',
      name: 'Mar Uno',
      contact_name: null,
      email: null,
      phone: null,
      is_active: true,
    })
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('updates the selected supplier in edit mode', async () => {
    apiMocks.update.mockResolvedValue({})
    const supplier = {
      id: 's1',
      code: 'MAR',
      name: 'Mar',
      contact_name: null,
      email: null,
      phone: null,
      is_active: true,
      offerings_count: 0,
    }
    const { result } = renderHook(() => useSupplierForm({ supplier, onSuccess: vi.fn() }))

    expect(result.current.isEditing).toBe(true)

    await act(async () => {
      await result.current.onSubmit({
        code: 'mar',
        name: 'Mar Actualizado',
        contact_name: '',
        email: '',
        phone: '',
        is_active: false,
      })
    })

    expect(apiMocks.update).toHaveBeenCalledWith('s1', expect.objectContaining({
      code: 'MAR',
      name: 'Mar Actualizado',
      is_active: false,
    }))
  })
})
