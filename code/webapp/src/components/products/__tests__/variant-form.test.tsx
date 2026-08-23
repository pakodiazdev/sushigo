/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantForm } from '../variant-form'
import type { ProductVariant, UnitOfMeasure } from '@/types/inventory'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const kilogram: UnitOfMeasure = {
  id: '1',
  code: 'KG',
  name: 'Kilogram',
  symbol: 'kg',
  type: 'WEIGHT',
  precision: 2,
  is_base: true,
  is_active: true,
}

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-variant-form', () => ({
  useVariantForm: () => mockHookState.value,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="slide-panel-body" className={className}>
        {children}
      </div>
    ),
    Footer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="slide-panel-footer" className={className}>
        {children}
      </div>
    ),
  },
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    uoms: [kilogram],
    isUomsLoading: false,
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    isActive: true,
    trackLot: false,
    trackSerial: false,
    isSubmitting: false,
  }
}

const existingVariant: ProductVariant = {
  id: '7',
  item_id: '42',
  code: 'ARR-KG',
  barcode: '7501234567890',
  name: 'Arroz Premium 1kg',
  description: null,
  uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  track_lot: false,
  track_serial: false,
  is_active: true,
}

describe('VariantForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('renders the base unit options', () => {
      setHookState()
      const { getByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Kilogram (kg)')).toBeDefined()
    })

    it('does not render any Product/Item selector — the parent Product is fixed', () => {
      setHookState()
      const { queryByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(queryByText(/Product/)).toBeNull()
      expect(queryByText(/Item/)).toBeNull()
    })

    it('renders "Create Variant" as the submit label', () => {
      setHookState()
      const { getByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Create Variant')).toBeDefined()
    })

    it('calls onCancel when Cancel is clicked', () => {
      setHookState()
      const onCancel = vi.fn()
      const { getByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={onCancel} />)
      fireEvent.click(getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls handleSubmit/onSubmit when the form is submitted', () => {
      setHookState()
      const { container } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.submit(container.querySelector('form')!)
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('disables the submit button while submitting', () => {
      setHookState({ isSubmitting: true })
      const { getByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect((getByText('Create Variant').closest('button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows a spinner while submitting', () => {
      setHookState({ isSubmitting: true })
      const { container } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(container.querySelector('.animate-spin')).toBeDefined()
    })

    it('surfaces field errors', () => {
      setHookState({ allErrors: { name: 'Name is required' } })
      const { getByText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Name is required')).toBeDefined()
    })

    it('disables the base unit select while units of measure are loading', () => {
      setHookState({ isUomsLoading: true, uoms: [] })
      const { container } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect((container.querySelector('select[name="uom_id"]') as HTMLSelectElement).disabled).toBe(true)
    })

    it('wires the Track lot numbers checkbox into setValue', () => {
      setHookState()
      const { getByLabelText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Track lot numbers'))
      expect(mockSetValue).toHaveBeenCalledWith('track_lot', true)
    })

    it('wires the Track serial numbers checkbox into setValue', () => {
      setHookState()
      const { getByLabelText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Track serial numbers'))
      expect(mockSetValue).toHaveBeenCalledWith('track_serial', true)
    })

    it('wires the Active checkbox into setValue', () => {
      setHookState({ isActive: true })
      const { getByLabelText } = render(<VariantForm productId={'42'} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Active'))
      expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
    })
  })

  describe('edit mode', () => {
    it('shows "Update Variant" as the submit label', () => {
      setHookState()
      const { getByText } = render(
        <VariantForm productId={'42'} variant={existingVariant} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )
      expect(getByText('Update Variant')).toBeDefined()
    })
  })
})
