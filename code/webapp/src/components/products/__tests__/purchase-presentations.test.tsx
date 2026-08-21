/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PurchasePresentations } from '../purchase-presentations'
import type { VariantPurchasePresentation } from '@/types/inventory'

const mockAuthState = {
  can: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const boxPresentation: VariantPurchasePresentation = {
  id: '01JPRES0000000000000000AA',
  item_variant_id: 7,
  template: { id: '01JTPL00000000000000000AA', code: 'BOX_24', name: 'Box x24', package_type: 'BOX', base_unit_quantity: 24 },
  package_barcode: '7501234567913',
  is_default: true,
  is_active: true,
}

const inactivePresentation: VariantPurchasePresentation = {
  ...boxPresentation,
  id: '01JPRES0000000000000000BB',
  template: { id: '01JTPL00000000000000000BB', code: 'PACK_6', name: 'Pack x6', package_type: 'PACK', base_unit_quantity: 6 },
  is_default: false,
  is_active: false,
}

function renderComponent(overrides: Partial<React.ComponentProps<typeof PurchasePresentations>> = {}) {
  return render(
    <PurchasePresentations
      presentations={[]}
      isLoading={false}
      isError={false}
      onAssignPresentation={vi.fn()}
      onPresentationClick={vi.fn()}
      onManageTemplates={vi.fn()}
      {...overrides}
    />
  )
}

describe('PurchasePresentations', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('shows a loading indicator while fetching', () => {
    const { container } = renderComponent({ isLoading: true })
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows an error message instead of implying there are no presentations', () => {
    const { getByText, queryByText } = renderComponent({ isError: true })
    expect(getByText(/Failed to load purchase presentations/)).toBeDefined()
    expect(queryByText(/No purchase presentations yet/)).toBeNull()
  })

  it('shows an empty-state message when there are no presentations', () => {
    const { getByText } = renderComponent()
    expect(getByText(/No purchase presentations yet/)).toBeDefined()
  })

  it('renders template name, package type, factor, barcode, default and status', () => {
    const { getByText } = renderComponent({ presentations: [boxPresentation] })
    expect(getByText('Box x24')).toBeDefined()
    expect(getByText(/BOX · ×24/)).toBeDefined()
    expect(getByText('7501234567913')).toBeDefined()
    expect(getByText('Default')).toBeDefined()
    expect(getByText('Active')).toBeDefined()
  })

  it('shows Inactive for a deactivated presentation, and no Default badge', () => {
    const { getByText, queryByText } = renderComponent({ presentations: [inactivePresentation] })
    expect(getByText('Inactive')).toBeDefined()
    expect(queryByText('Default')).toBeNull()
  })

  it('calls onPresentationClick with the clicked presentation', () => {
    const onPresentationClick = vi.fn()
    const { getByText } = renderComponent({ presentations: [boxPresentation], onPresentationClick })
    fireEvent.click(getByText('Box x24'))
    expect(onPresentationClick).toHaveBeenCalledWith(boxPresentation)
  })

  it('calls onAssignPresentation when Assign template is clicked', () => {
    const onAssignPresentation = vi.fn()
    const { getByText } = renderComponent({ onAssignPresentation })
    fireEvent.click(getByText('Assign template'))
    expect(onAssignPresentation).toHaveBeenCalledTimes(1)
  })

  it('calls onManageTemplates when Manage templates is clicked', () => {
    const onManageTemplates = vi.fn()
    const { getByText } = renderComponent({ onManageTemplates })
    fireEvent.click(getByText('Manage templates'))
    expect(onManageTemplates).toHaveBeenCalledTimes(1)
  })

  it('hides Assign template when the user lacks items.update', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.update')
    const { queryByText } = renderComponent()
    expect(queryByText('Assign template')).toBeNull()
  })

  it('hides Manage templates when the user lacks purchase_presentation_templates.view', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'purchase_presentation_templates.view')
    const { queryByText } = renderComponent()
    expect(queryByText('Manage templates')).toBeNull()
  })

  it('renders a non-interactive row and does not call onPresentationClick when the user lacks items.update', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.update')
    const onPresentationClick = vi.fn()
    const { getByText, queryByRole } = renderComponent({ presentations: [boxPresentation], onPresentationClick })
    fireEvent.click(getByText('Box x24'))
    expect(onPresentationClick).not.toHaveBeenCalled()
    expect(queryByRole('button', { name: /Box x24/ })).toBeNull()
  })

  // The assign/edit form always fetches the global template catalog (to populate the picker,
  // or to resolve the selected template's display data even in read-only edit mode), so
  // items.update alone isn't enough — a user missing purchase_presentation_templates.view would
  // open a form whose template request 403s. Both entry points require both permissions.
  it('hides Assign template when the user has items.update but lacks purchase_presentation_templates.view', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'purchase_presentation_templates.view')
    const { queryByText } = renderComponent()
    expect(queryByText('Assign template')).toBeNull()
  })

  it('renders a non-interactive row when the user has items.update but lacks purchase_presentation_templates.view', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'purchase_presentation_templates.view')
    const onPresentationClick = vi.fn()
    const { getByText, queryByRole } = renderComponent({ presentations: [boxPresentation], onPresentationClick })
    fireEvent.click(getByText('Box x24'))
    expect(onPresentationClick).not.toHaveBeenCalled()
    expect(queryByRole('button', { name: /Box x24/ })).toBeNull()
  })
})
