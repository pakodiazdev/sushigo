/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PurchasePresentationForm } from '../purchase-presentation-form'
import type { PurchasePresentationTemplate, VariantPurchasePresentation } from '@/types/inventory'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const boxTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  is_active: true,
}

const existingPresentation: VariantPurchasePresentation = {
  id: '01JPRES0000000000000000AA',
  item_variant_id: 7,
  template: { id: boxTemplate.id, code: boxTemplate.code, name: boxTemplate.name, package_type: boxTemplate.package_type, base_unit_quantity: boxTemplate.base_unit_quantity },
  package_barcode: '7501234567913',
  is_default: true,
  is_active: true,
}

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-purchase-presentation-form', () => ({
  usePurchasePresentationForm: () => mockHookState.value,
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
    isEditing: false,
    assignableTemplates: [boxTemplate],
    isTemplatesLoading: false,
    selectedTemplate: null as PurchasePresentationTemplate | null,
    isUomMismatch: false,
    normalizationHint: null as string | null,
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    isDefault: false,
    isActive: true,
    isSubmitting: false,
  }
}

const kgUom = { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' }

describe('PurchasePresentationForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('assign (create) mode', () => {
    it('renders the assignable template options', () => {
      setHookState()
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText(/Box x24/)).toBeDefined()
    })

    it('renders "Assign Presentation" as the submit label', () => {
      setHookState()
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText('Assign Presentation')).toBeDefined()
    })

    it('calls onCancel when Cancel is clicked', () => {
      setHookState()
      const onCancel = vi.fn()
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={onCancel}
        />
      )
      fireEvent.click(getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls handleSubmit/onSubmit when the form is submitted', () => {
      setHookState()
      const { container } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      fireEvent.submit(container.querySelector('form')!)
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('surfaces field errors', () => {
      setHookState({ allErrors: { template_id: 'This template is already assigned to this Variant.' } })
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText('This template is already assigned to this Variant.')).toBeDefined()
    })

    it('shows the normalization hint once a template is selected', () => {
      setHookState({ selectedTemplate: boxTemplate, normalizationHint: '1 Box x24 = 24 kg' })
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText('1 Box x24 = 24 kg')).toBeDefined()
    })

    it('shows a UOM mismatch warning and disables submit', () => {
      setHookState({
        selectedTemplate: { ...boxTemplate, compatible_dimension_uom: { id: '2', code: 'LB', name: 'Pound', symbol: 'lb' } },
        isUomMismatch: true,
      })
      const { getByText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText(/doesn't match this Variant's base unit/)).toBeDefined()
      expect((getByText('Assign Presentation').closest('button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('wires the Default checkbox into setValue', () => {
      setHookState()
      const { getByLabelText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      fireEvent.click(getByLabelText('Default presentation for this Variant'))
      expect(mockSetValue).toHaveBeenCalledWith('is_default', true)
    })

    it('does not render an Active checkbox in assign mode', () => {
      setHookState()
      const { queryByLabelText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          assignedTemplateIds={[]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(queryByLabelText('Active')).toBeNull()
    })
  })

  describe('edit mode', () => {
    it('shows the template read-only, and "Save Presentation" as the submit label', () => {
      setHookState({ isEditing: true })
      const { getByText, queryByRole } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          presentation={existingPresentation}
          assignedTemplateIds={[boxTemplate.id]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      expect(getByText('Box x24')).toBeDefined()
      expect(getByText('Save Presentation')).toBeDefined()
      expect(queryByRole('combobox')).toBeNull()
    })

    it('renders an Active checkbox for deactivate/reactivate', () => {
      setHookState({ isEditing: true, isActive: true })
      const { getByLabelText } = render(
        <PurchasePresentationForm
          productId={'42'}
          variantId={'7'}
          variantUom={kgUom}
          presentation={existingPresentation}
          assignedTemplateIds={[boxTemplate.id]}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      fireEvent.click(getByLabelText('Active'))
      expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
    })
  })
})
