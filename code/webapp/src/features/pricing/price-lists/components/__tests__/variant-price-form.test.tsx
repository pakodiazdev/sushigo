/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantPriceForm } from '../variant-price-form'
import type { VariantPrice } from '../../types'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../../hooks/use-variant-price-form', () => ({
  useVariantPriceForm: () => mockHookState.value,
}))

vi.mock('../variant-picker', () => ({
  VariantPicker: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" data-testid="variant-picker" onClick={() => onChange('iv-2')}>
      Pick variant
    </button>
  ),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-body">{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-footer">{children}</div>,
  },
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    isEditing: false,
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    itemVariantId: '',
    isActive: true,
    isSubmitting: false,
  }
}

const existingVariantPrice: VariantPrice = {
  id: 'vp-1',
  item_variant_id: 'iv-1',
  price_list_id: 'pl-1',
  price: '129.5000',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}

describe('VariantPriceForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the Variant picker in create mode', () => {
    setHookState()
    const { getByText, getByTestId } = render(
      <VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(getByText('Create Price')).toBeDefined()
    expect(getByTestId('variant-picker')).toBeDefined()
  })

  it('shows a read-only notice instead of the picker in edit mode', () => {
    setHookState({ isEditing: true })
    const { getByText, queryByTestId } = render(
      <VariantPriceForm priceListId="pl-1" variantPrice={existingVariantPrice} onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(getByText('Update Price')).toBeDefined()
    expect(queryByTestId('variant-picker')).toBeNull()
    expect(getByText(/can't be changed/)).toBeDefined()
  })

  it('calls onCancel when Cancel is clicked', () => {
    setHookState()
    const onCancel = vi.fn()
    const { getByText } = render(<VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls handleSubmit/onSubmit when the form is submitted', () => {
    setHookState()
    const { container } = render(<VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('surfaces field errors', () => {
    setHookState({ allErrors: { price: 'Price is required' } })
    const { getByText } = render(<VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(getByText('Price is required')).toBeDefined()
  })

  it('shows a spinner and disables submit while submitting', () => {
    setHookState({ isSubmitting: true })
    const { container, getByText } = render(
      <VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(container.querySelector('.animate-spin')).toBeDefined()
    expect((getByText(/Create Price/).closest('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('wires the Variant picker into setValue', () => {
    setHookState()
    const { getByTestId } = render(<VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(getByTestId('variant-picker'))
    expect(mockSetValue).toHaveBeenCalledWith('item_variant_id', 'iv-2')
  })

  it('wires the Active checkbox into setValue', () => {
    setHookState()
    const { getByLabelText } = render(<VariantPriceForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(getByLabelText('Active'))
    expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
  })
})
