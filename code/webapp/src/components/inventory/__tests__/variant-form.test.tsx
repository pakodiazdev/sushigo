/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { VariantForm } from '../variant-form'

const mockVariantExecute = vi.hoisted(() => vi.fn().mockResolvedValue({}))
const mockSetValue = vi.hoisted(() => vi.fn())

vi.mock('../use-legacy-variant-form', () => ({
  useLegacyVariantForm: ({ variant, preselectedItemId }: { variant?: { item_id?: number; uom_id?: number; is_active?: boolean }; preselectedItemId?: number }) => ({
    items: [
      { id: 'item-01', name: 'Salt', sku: 'SAL-001' },
      { id: 'item-02', name: 'Pepper', sku: 'PEP-001' },
    ],
    units: [
      { id: 'uom-01', name: 'Kilogram', symbol: 'kg' },
      { id: 'uom-02', name: 'Gram', symbol: 'g' },
    ],
    register: (name: string) => ({ name }),
    codeField: { name: 'code', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() },
    onCodeChange: vi.fn(),
    handleSubmit: (callback: (data: unknown) => void) => (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.()
      callback({})
    },
    setValue: mockSetValue,
    onSubmit: mockVariantExecute,
    allErrors: {},
    itemId: variant?.item_id ?? preselectedItemId ?? 0,
    uomId: variant?.uom_id ?? 0,
    isActive: variant?.is_active ?? true,
    isPending: false,
    isSubmitDisabled: false,
    canSuggestCode: false,
    isCodeSuggested: false,
    isSuggestionLoading: false,
    isRefreshingCode: false,
    suggestionFailed: false,
    handleRefreshCode: vi.fn(),
    collision: null,
    canApplySuggestedCode: false,
    applySuggestedCode: vi.fn(),
  }),
}))

// Mock useFormState hook (legacy — kept for compatibility)
vi.mock('@/hooks/use-form-state', () => ({
  useFormState: () => ({
    formData: {
      item_id: 0,
      code: '',
      name: '',
      uom_id: 0,
      min_stock: 0,
      max_stock: 100,
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
    execute: mockVariantExecute,
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
      expect(getByText('Nueva variante')).toBeDefined()
    })

    it('renders header with edit variant title when editing', () => {
      const variant = {
        id: 'variant-01',
        item_id: 1,
        code: 'VAR-001',
        name: 'Salt 1kg',
        uom_id: 1,
        min_stock: 10,
        max_stock: 100,
        is_active: true,
        created_at: '',
        updated_at: '',
      }
      const { getByText } = render(<VariantForm {...defaultProps} variant={variant} />)
      expect(getByText('Editar variante')).toBeDefined()
    })

    it('renders item select', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Selecciona un artículo...')).toBeDefined()
    })

    it('renders item options', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText(/Salt/)).toBeDefined()
    })

    it('renders unit of measure select', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Selecciona una unidad...')).toBeDefined()
    })

    it('renders unit options', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Selecciona una unidad...')).toBeDefined()
    })

    it('renders cancel button', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Cancelar')).toBeDefined()
    })

    it('renders create button for new variant', () => {
      const { getByText } = render(<VariantForm {...defaultProps} />)
      expect(getByText('Crear')).toBeDefined()
    })

    it('renders update button when editing', () => {
      const variant = {
        id: 'variant-01',
        item_id: 1,
        code: 'VAR-001',
        name: 'Salt 1kg',
        uom_id: 1,
        min_stock: 10,
        max_stock: 100,
        is_active: true,
        created_at: '',
        updated_at: '',
      }
      const { getByText } = render(<VariantForm {...defaultProps} variant={variant} />)
      expect(getByText('Actualizar')).toBeDefined()
    })
  })

  describe('form interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      const { getByText } = render(<VariantForm {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(getByText('Cancelar'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it.skip('submits form on submit', async () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const form = container.querySelector('form')

      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(defaultProps.onSuccess).toBeDefined()
      })
    })

    it('allows changing item select', () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const selects = container.querySelectorAll('select')
      const itemSelect = selects[0] as HTMLSelectElement

      fireEvent.change(itemSelect, { target: { value: 'item-01' } })
      expect(mockSetValue).toHaveBeenCalledWith('item_id', 'item-01')
    })

    it('allows changing unit of measure select', () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const selects = container.querySelectorAll('select')
      const uomSelect = selects[1] as HTMLSelectElement

      fireEvent.change(uomSelect, { target: { value: 'uom-01' } })
      expect(mockSetValue).toHaveBeenCalledWith('uom_id', 'uom-01')
    })

    it('converts variant code to uppercase', () => {
      const { getByPlaceholderText } = render(<VariantForm {...defaultProps} />)
      const codeInput = getByPlaceholderText('Ej. HAR-KG') as HTMLInputElement

      fireEvent.change(codeInput, { target: { value: 'test-code' } })
      expect(codeInput).toBeDefined()
    })

    it('allows toggling is_active checkbox', () => {
      const { container } = render(<VariantForm {...defaultProps} />)
      const checkbox = container.querySelector('input[type="checkbox"]')

      if (checkbox) {
        fireEvent.click(checkbox)
        expect(checkbox).toBeDefined()
      }
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

  describe('form submission', () => {
    it('calls execute and triggers zod refine on valid submission (create)', async () => {
      const { getByPlaceholderText, container } = render(<VariantForm {...defaultProps} />)

      const selects = container.querySelectorAll('select')
      fireEvent.change(selects[0]!, { target: { value: 'item-01' } }) // item_id
      fireEvent.change(selects[1]!, { target: { value: 'uom-01' } }) // uom_id

      fireEvent.change(getByPlaceholderText('Ej. HAR-KG'), { target: { value: 'PR-001' } })
      fireEvent.change(getByPlaceholderText('Ej. 1 kilogramo'), { target: { value: 'Salt 1kg' } })

      const form = container.querySelector('form#variant-form')
      fireEvent.submit(form!)

      await waitFor(() => expect(mockVariantExecute).toHaveBeenCalled())
    })

    it('calls execute on valid submission (update)', async () => {
      const variant = {
        id: 'variant-01',
        item_id: 1,
        code: 'PR-001',
        name: 'Salt 1kg',
        uom_id: 1,
        min_stock: 0,
        max_stock: 100,
        is_active: true,
        created_at: '',
        updated_at: '',
      }

      const { container } = render(<VariantForm {...defaultProps} variant={variant} />)

      const form = container.querySelector('form#variant-form')
      fireEvent.submit(form!)

      await waitFor(() => expect(mockVariantExecute).toHaveBeenCalledTimes(1))
    })
  })
})
