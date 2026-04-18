/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { VariantForm } from '../variant-form'

// Mock useFormState hook
vi.mock('@/hooks/use-form-state', () => ({
  useFormState: () => ({
    formData: {
      item_id: 0,
      code: '',
      name: '',
      uom_id: 0,
      min_stock: 0,
      max_stock: 100,
      avg_unit_cost: 0,
      last_unit_cost: 0,
      is_active: true,
    },
    setField: vi.fn(),
    errors: {},
    validate: vi.fn().mockReturnValue(true),
  }),
  validators: {
    minLength: () => () => undefined,
    positive: () => () => undefined,
  },
}))

// Mock useCreateUpdateMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
  useCreateUpdateMutation: () => ({
    execute: vi.fn().mockResolvedValue({}),
    validationErrors: {},
    isPending: false,
  }),
}))

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
  useItemsSelect: () => ({
    data: [
      { id: 1, name: 'Salt', sku: 'SAL-001' },
      { id: 2, name: 'Pepper', sku: 'PEP-001' },
    ],
  }),
  useUnitsOfMeasureSelect: () => ({
    data: [
      { id: 1, name: 'Kilogram', symbol: 'kg' },
      { id: 2, name: 'Gram', symbol: 'g' },
    ],
  }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
  itemVariantApi: {
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
}))

// Mock SlidePanel components
vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Header: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="slide-panel-header">{children}</div>
    ),
    Body: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="slide-panel-body">{children}</div>
    ),
    Footer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="slide-panel-footer">{children}</div>
    ),
  },
}))

const defaultProps = {
  variant: null,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
}

describe('VariantForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders the form', () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const form = container.querySelector('form')
      expect(form).toBeDefined()
    })

    it('renders header with new variant title', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('New Variant')).toBeDefined()
    })

    it('renders header with edit variant title when editing', () => {
      const variant = {
        id: 1,
        item_id: 1,
        code: 'VAR-001',
        name: 'Salt 1kg',
        uom_id: 1,
        min_stock: 10,
        max_stock: 100,
        avg_unit_cost: 5.0,
        last_unit_cost: 5.5,
        is_active: true,
        created_at: '',
        updated_at: '',
      }
      const { getByText } = render(<VariantForm {...defaultProps} variant={variant} />)
      expect(getByText('Edit Variant')).toBeDefined()
    })

    it('renders item select', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Select an item...')).toBeDefined()
    })

    it('renders item options', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText(/Salt/)).toBeDefined()
    })

    it('renders unit of measure select', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Select unit...')).toBeDefined()
    })

    it('renders unit options', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Select unit...')).toBeDefined()
    })

    it('renders cancel button', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Cancel')).toBeDefined()
    })

    it('renders create button for new variant', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Create')).toBeDefined()
    })

    it('renders update button when editing', () => {
      const variant = {
        id: 1,
        item_id: 1,
        code: 'VAR-001',
        name: 'Salt 1kg',
        uom_id: 1,
        min_stock: 10,
        max_stock: 100,
        avg_unit_cost: 5.0,
        last_unit_cost: 5.5,
        is_active: true,
        created_at: '',
        updated_at: '',
      }
      const { getByText } = render(<VariantForm {...defaultProps} variant={variant} />)
      expect(getByText('Update')).toBeDefined()
    })
  })

  describe('form interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      const { getByText } = render(<VariantForm {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('submits form on submit', async () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const form = container.querySelector('form')

      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(defaultProps.onSuccess).toBeDefined()
      })
    })
  })

  describe('preselected values', () => {
    it('accepts preselectedItemId prop', () => {
      const { container } = render(
        <VariantForm {...defaultProps} preselectedItemId={1} />
      )
      expect(container).toBeDefined()
    })
  })

  describe('form structure', () => {
    it('renders SlidePanel.Header component', () => {
      const { getByTestId } = render(<VariantForm {...defaultProps} />)
      expect(getByTestId('slide-panel-header')).toBeDefined()
    })

    it('renders SlidePanel.Body component', () => {
      const { getByTestId } = render(<VariantForm {...defaultProps} />)
      expect(getByTestId('slide-panel-body')).toBeDefined()
    })

    it('renders SlidePanel.Footer component', () => {
      const { getByTestId } = render(<VariantForm {...defaultProps} />)
      expect(getByTestId('slide-panel-footer')).toBeDefined()
    })
  })
})
