/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PurchasePresentationTemplateManager } from '../purchase-presentation-template-manager'
import type { PurchasePresentationTemplate } from '@/types/inventory'

const mockAuthState = {
  can: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: Object.assign(
    ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
      isOpen ? (
        <div data-testid="slide-panel">
          <h2>{title}</h2>
          {children}
        </div>
      ) : null,
    {
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
    }
  ),
}))

vi.mock('../purchase-presentation-template-form', () => ({
  PurchasePresentationTemplateForm: ({
    template,
    onSuccess,
    onCancel,
  }: {
    template?: PurchasePresentationTemplate | null
    onSuccess: (t: PurchasePresentationTemplate) => void
    onCancel: () => void
  }) => (
    <div data-testid="template-form">
      <span>{template ? `Editing ${template.name}` : 'New template form'}</span>
      <button type="button" onClick={() => onSuccess(template ?? boxTemplate)}>
        mock-save
      </button>
      <button type="button" onClick={onCancel}>
        mock-cancel
      </button>
    </div>
  ),
}))

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-purchase-presentation-templates', () => ({
  usePurchasePresentationTemplates: () => mockHookState.value,
}))

const boxTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  is_active: true,
}

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    templates: [] as PurchasePresentationTemplate[],
    isLoading: false,
    isError: false,
    mode: 'list' as 'list' | 'create' | 'edit',
    selectedTemplate: null as PurchasePresentationTemplate | null,
    handleNewTemplate: vi.fn(),
    handleTemplateClick: vi.fn(),
    handleBackToList: vi.fn(),
    handleTemplateSaved: vi.fn(),
  }
}

describe('PurchasePresentationTemplateManager', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('renders nothing while closed', () => {
    setHookState()
    const { queryByTestId } = render(
      <PurchasePresentationTemplateManager isOpen={false} onClose={vi.fn()} />
    )
    expect(queryByTestId('slide-panel')).toBeNull()
  })

  it('shows a loading indicator while fetching', () => {
    setHookState({ isLoading: true })
    const { container } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows an empty-state message when there are no templates', () => {
    setHookState()
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(getByText(/No templates yet/)).toBeDefined()
  })

  it('renders code, package type, factor and status for each template', () => {
    setHookState({ templates: [boxTemplate] })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(getByText('Box x24')).toBeDefined()
    expect(getByText(/BOX_24 · BOX · ×24 kg/)).toBeDefined()
    expect(getByText('Active')).toBeDefined()
  })

  it('calls handleTemplateClick when a template row is clicked', () => {
    const handleTemplateClick = vi.fn()
    setHookState({ templates: [boxTemplate], handleTemplateClick })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    fireEvent.click(getByText('Box x24'))
    expect(handleTemplateClick).toHaveBeenCalledWith(boxTemplate)
  })

  it('calls handleNewTemplate when New Template is clicked', () => {
    const handleNewTemplate = vi.fn()
    setHookState({ handleNewTemplate })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    fireEvent.click(getByText('New Template'))
    expect(handleNewTemplate).toHaveBeenCalledTimes(1)
  })

  it('hides New Template when the user lacks purchase_presentation_templates.manage', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'purchase_presentation_templates.manage')
    setHookState()
    const { queryByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(queryByText('New Template')).toBeNull()
  })

  it('renders a non-interactive row and does not call handleTemplateClick when the user lacks purchase_presentation_templates.manage', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'purchase_presentation_templates.manage')
    const handleTemplateClick = vi.fn()
    setHookState({ templates: [boxTemplate], handleTemplateClick })
    const { getByText, queryByRole } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    fireEvent.click(getByText('Box x24'))
    expect(handleTemplateClick).not.toHaveBeenCalled()
    expect(queryByRole('button', { name: /Box x24/ })).toBeNull()
  })

  it('renders the create form in create mode', () => {
    setHookState({ mode: 'create' })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(getByText('New template form')).toBeDefined()
  })

  it('renders the edit form with the selected template in edit mode', () => {
    setHookState({ mode: 'edit', selectedTemplate: boxTemplate })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    expect(getByText('Editing Box x24')).toBeDefined()
  })

  it('calls handleTemplateSaved when the form succeeds', () => {
    const handleTemplateSaved = vi.fn()
    setHookState({ mode: 'create', handleTemplateSaved })
    const { getByText } = render(<PurchasePresentationTemplateManager isOpen={true} onClose={vi.fn()} />)
    fireEvent.click(getByText('mock-save'))
    expect(handleTemplateSaved).toHaveBeenCalledTimes(1)
  })
})
