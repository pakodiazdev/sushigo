/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantDetails } from '../variant-details'
import type { ProductVariant, VariantPurchasePresentation } from '@/types/inventory'

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

const mockAuthState = {
  can: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const riceVariant: ProductVariant = {
  id: 7,
  item_id: 42,
  code: 'ARR-KG',
  barcode: '7501234567890',
  name: 'Arroz Premium 1kg',
  description: 'Grano largo',
  uom: { id: 1, code: 'KG', name: 'Kilogram', symbol: 'kg' },
  track_lot: true,
  track_serial: false,
  is_active: true,
}

const boxPresentation: VariantPurchasePresentation = {
  id: '01JPRES0000000000000000AA',
  item_variant_id: 7,
  template: { id: '01JTPL00000000000000000AA', code: 'BOX_24', name: 'Box x24', package_type: 'BOX', base_unit_quantity: 24 },
  package_barcode: '7501234567913',
  is_default: true,
  is_active: true,
}

const defaultPresentationProps = {
  presentations: [] as VariantPurchasePresentation[],
  presentationsLoading: false,
  presentationsError: false,
  onAssignPresentation: vi.fn(),
  onPresentationClick: vi.fn(),
  onManageTemplates: vi.fn(),
}

describe('VariantDetails', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('renders the variant name, SKU, barcode and UOM', () => {
    const { getByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(getByText('Arroz Premium 1kg')).toBeDefined()
    expect(getByText('ARR-KG')).toBeDefined()
    expect(getByText('7501234567890')).toBeDefined()
    expect(getByText('Kilogram (kg)')).toBeDefined()
  })

  it('renders the description when present', () => {
    const { getByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(getByText('Grano largo')).toBeDefined()
  })

  it('shows Active status for an active variant', () => {
    const { getAllByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(getAllByText('Active').length).toBeGreaterThan(0)
  })

  it('shows Inactive status for a deactivated variant', () => {
    const { getByText } = render(
      <VariantDetails
        variant={{ ...riceVariant, is_active: false }}
        onEdit={vi.fn()}
        onBack={vi.fn()}
        {...defaultPresentationProps}
      />
    )
    expect(getByText('Inactive')).toBeDefined()
  })

  it('shows the lot/serial tracking badges when enabled', () => {
    const { getByText, queryByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(getByText('Tracks lot numbers')).toBeDefined()
    expect(queryByText('Tracks serial numbers')).toBeNull()
  })

  it('calls onEdit when Edit Variant is clicked', () => {
    const onEdit = vi.fn()
    const { getByText } = render(
      <VariantDetails variant={riceVariant} onEdit={onEdit} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    fireEvent.click(getByText('Edit Variant'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when Back to Product is clicked', () => {
    const onBack = vi.fn()
    const { getByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={onBack} {...defaultPresentationProps} />
    )
    fireEvent.click(getByText('Back to Product'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('hides Edit Variant when the user lacks items.update', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.update')
    const { queryByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(queryByText('Edit Variant')).toBeNull()
  })

  it('does not render a Delete action — deactivate happens through Edit', () => {
    const { queryByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} {...defaultPresentationProps} />
    )
    expect(queryByText('Delete')).toBeNull()
  })

  it('renders the embedded Purchase Presentations section', () => {
    const { getByText } = render(
      <VariantDetails
        variant={riceVariant}
        onEdit={vi.fn()}
        onBack={vi.fn()}
        {...defaultPresentationProps}
        presentations={[boxPresentation]}
      />
    )
    expect(getByText('Purchase Presentations')).toBeDefined()
    expect(getByText('Box x24')).toBeDefined()
  })

  it('calls onAssignPresentation when Assign template is clicked', () => {
    const onAssignPresentation = vi.fn()
    const { getByText } = render(
      <VariantDetails
        variant={riceVariant}
        onEdit={vi.fn()}
        onBack={vi.fn()}
        {...defaultPresentationProps}
        onAssignPresentation={onAssignPresentation}
      />
    )
    fireEvent.click(getByText('Assign template'))
    expect(onAssignPresentation).toHaveBeenCalledTimes(1)
  })

  it('calls onPresentationClick with the clicked presentation', () => {
    const onPresentationClick = vi.fn()
    const { getByText } = render(
      <VariantDetails
        variant={riceVariant}
        onEdit={vi.fn()}
        onBack={vi.fn()}
        {...defaultPresentationProps}
        presentations={[boxPresentation]}
        onPresentationClick={onPresentationClick}
      />
    )
    fireEvent.click(getByText('Box x24'))
    expect(onPresentationClick).toHaveBeenCalledWith(boxPresentation)
  })
})
