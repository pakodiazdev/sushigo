/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PriceListForm } from '../price-list-form'
import type { PriceList } from '../../types'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../../hooks/use-price-list-form', () => ({
  usePriceListForm: () => mockHookState.value,
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
    isActive: true,
    isSubmitting: false,
  }
}

const existingPriceList: PriceList = {
  id: 'pl-1',
  code: 'STANDARD',
  name: 'Standard Pricing',
  description: null,
  priority: 0,
  is_active: true,
}

describe('PriceListForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders "Create Price List" as the submit label in create mode', () => {
    setHookState()
    const { getByText } = render(<PriceListForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(getByText('Create Price List')).toBeDefined()
  })

  it('renders "Update Price List" as the submit label in edit mode', () => {
    setHookState({ isEditing: true })
    const { getByText } = render(
      <PriceListForm priceList={existingPriceList} onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(getByText('Update Price List')).toBeDefined()
  })

  it('calls onCancel when Cancel is clicked', () => {
    setHookState()
    const onCancel = vi.fn()
    const { getByText } = render(<PriceListForm onSuccess={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls handleSubmit/onSubmit when the form is submitted', () => {
    setHookState()
    const { container } = render(<PriceListForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('shows a spinner while submitting and disables the submit button', () => {
    setHookState({ isSubmitting: true })
    const { getByText, container } = render(<PriceListForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(container.querySelector('.animate-spin')).toBeDefined()
    expect((getByText(/Create Price List/).closest('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('surfaces field errors', () => {
    setHookState({ allErrors: { code: 'Code is required' } })
    const { getByText } = render(<PriceListForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(getByText('Code is required')).toBeDefined()
  })

  it('wires the Active checkbox into setValue', () => {
    setHookState()
    const { getByLabelText } = render(<PriceListForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(getByLabelText('Active'))
    expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
  })
})
