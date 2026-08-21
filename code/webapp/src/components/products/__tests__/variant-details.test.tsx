/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantDetails } from '../variant-details'
import type { ProductVariant } from '@/types/inventory'

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

describe('VariantDetails', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('renders the variant name, SKU, barcode and UOM', () => {
    const { getByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />)
    expect(getByText('Arroz Premium 1kg')).toBeDefined()
    expect(getByText('ARR-KG')).toBeDefined()
    expect(getByText('7501234567890')).toBeDefined()
    expect(getByText('Kilogram (kg)')).toBeDefined()
  })

  it('renders the description when present', () => {
    const { getByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />)
    expect(getByText('Grano largo')).toBeDefined()
  })

  it('shows Active status for an active variant', () => {
    const { getByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />)
    expect(getByText('Active')).toBeDefined()
  })

  it('shows Inactive status for a deactivated variant', () => {
    const { getByText } = render(
      <VariantDetails variant={{ ...riceVariant, is_active: false }} onEdit={vi.fn()} onBack={vi.fn()} />
    )
    expect(getByText('Inactive')).toBeDefined()
  })

  it('shows the lot/serial tracking badges when enabled', () => {
    const { getByText, queryByText } = render(
      <VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />
    )
    expect(getByText('Tracks lot numbers')).toBeDefined()
    expect(queryByText('Tracks serial numbers')).toBeNull()
  })

  it('calls onEdit when Edit Variant is clicked', () => {
    const onEdit = vi.fn()
    const { getByText } = render(<VariantDetails variant={riceVariant} onEdit={onEdit} onBack={vi.fn()} />)
    fireEvent.click(getByText('Edit Variant'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when Back to Product is clicked', () => {
    const onBack = vi.fn()
    const { getByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={onBack} />)
    fireEvent.click(getByText('Back to Product'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('hides Edit Variant when the user lacks items.update', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.update')
    const { queryByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />)
    expect(queryByText('Edit Variant')).toBeNull()
  })

  it('does not render a Delete action — deactivate happens through Edit', () => {
    const { queryByText } = render(<VariantDetails variant={riceVariant} onEdit={vi.fn()} onBack={vi.fn()} />)
    expect(queryByText('Delete')).toBeNull()
  })
})
