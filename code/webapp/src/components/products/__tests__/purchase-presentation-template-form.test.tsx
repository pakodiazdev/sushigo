/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PurchasePresentationTemplateForm } from '../purchase-presentation-template-form'
import type { PurchasePresentationTemplate, UnitOfMeasure } from '@/types/inventory'

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

const existingTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  is_active: true,
}

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-purchase-presentation-template-form', async () => {
  const actual = await vi.importActual<typeof import('../use-purchase-presentation-template-form')>(
    '../use-purchase-presentation-template-form'
  )
  return {
    PACKAGE_TYPE_OPTIONS: actual.PACKAGE_TYPE_OPTIONS,
    usePurchasePresentationTemplateForm: () => mockHookState.value,
  }
})

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
    isEditing: false,
    uoms: [kilogram],
    isUomsLoading: false,
    register: mockRegister,
    codeField: mockRegister('code'),
    onCodeChange: vi.fn(),
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    isActive: true,
    isSubmitting: false,
    currentCode: '',
    canSuggestCode: true,
    isCodeSuggested: true,
    isSuggestionLoading: false,
    isRefreshingCode: false,
    suggestionFailed: false,
    handleRefreshCode: vi.fn(),
    collision: null,
    canApplySuggestedCode: false,
    applySuggestedCode: vi.fn(),
  }
}

describe('PurchasePresentationTemplateForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('renders the package type and compatible unit options', () => {
      setHookState()
      const { getByText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Caja')).toBeDefined()
      expect(getByText('Kilogram (kg)')).toBeDefined()
    })

    it('renders the Spanish create label', () => {
      setHookState()
      const { getByText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Crear plantilla')).toBeDefined()
    })

    it('calls onCancel when Cancel is clicked', () => {
      setHookState()
      const onCancel = vi.fn()
      const { getByText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={onCancel} />)
      fireEvent.click(getByText('Cancelar'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls handleSubmit/onSubmit when the form is submitted', () => {
      setHookState()
      const { container } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.submit(container.querySelector('form')!)
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('regenerates the code only through the explicit action', () => {
      const handleRefreshCode = vi.fn()
      setHookState({ handleRefreshCode })
      const { getByLabelText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Regenerar código'))
      expect(handleRefreshCode).toHaveBeenCalledTimes(1)
    })

    it('surfaces field errors', () => {
      setHookState({ allErrors: { code: 'Code is required' } })
      const { getByText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Code is required')).toBeDefined()
    })

    it('wires the Active checkbox into setValue', () => {
      setHookState({ isActive: true })
      const { getByLabelText } = render(<PurchasePresentationTemplateForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Activa'))
      expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
    })
  })

  describe('edit mode', () => {
    it('shows the Spanish update label', () => {
      setHookState({ isEditing: true })
      const { getByText } = render(
        <PurchasePresentationTemplateForm template={existingTemplate} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )
      expect(getByText('Actualizar plantilla')).toBeDefined()
    })
  })
})
