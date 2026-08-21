/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ProductDetails } from '../product-details'
import type { Product, ProductVariant } from '@/types/inventory'

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

// CanAccess (Edit/Delete gating) reads the auth store — default to a user with every
// items.* permission so the existing behavioral tests below are unaffected, and
// override per-test for the permission-gating tests further down.
const mockAuthState = {
  can: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const baseProduct: Product = {
  id: 42,
  name: 'Coca-Cola Original 600 ml',
  description: 'Refresco de cola',
  is_active: true,
  brand: { id: 'brand-1', name: 'Coca-Cola' },
  inventory_category: { id: 'cat-1', name: 'Beverages' },
  photo_url: null,
  variants_count: 0,
  warnings: [],
}

const cocaColaVariant: ProductVariant = {
  id: 1,
  item_id: 42,
  code: 'COCA-600',
  barcode: null,
  name: 'Coca-Cola 600 ml Single',
  description: null,
  uom: { id: 1, code: 'UNIT', name: 'Unit', symbol: 'u' },
  track_lot: false,
  track_serial: false,
  is_active: true,
}

// Renders ProductDetails with sensible defaults for the embedded Variant catalog props
// (Technical Task from #425), so each test below only overrides what it actually cares about.
function renderProductDetails(overrides: Partial<React.ComponentProps<typeof ProductDetails>> = {}) {
  return render(
    <ProductDetails
      product={baseProduct}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      variants={[]}
      variantsLoading={false}
      variantsError={false}
      onNewVariant={vi.fn()}
      onVariantClick={vi.fn()}
      {...overrides}
    />
  )
}

describe('ProductDetails', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('renders the product name and brand', () => {
    const { getByText } = renderProductDetails()
    expect(getByText('Coca-Cola Original 600 ml')).toBeDefined()
    expect(getByText('Coca-Cola')).toBeDefined()
  })

  it('renders the category badge', () => {
    const { getByText } = renderProductDetails()
    expect(getByText('Beverages')).toBeDefined()
  })

  it('shows Active status for an active product', () => {
    const { getByText } = renderProductDetails()
    expect(getByText('Active')).toBeDefined()
  })

  it('shows Inactive status for an inactive product', () => {
    const { getByText } = renderProductDetails({ product: { ...baseProduct, is_active: false } })
    expect(getByText('Inactive')).toBeDefined()
  })

  it('shows Inactive status when the flag is active but a warning is present', () => {
    const { getByText, queryByText } = renderProductDetails({
      product: {
        ...baseProduct,
        warnings: ['The assigned category "Beverages" is inactive; this product will not appear as active until it is reactivated.'],
      },
    })
    expect(getByText('Inactive')).toBeDefined()
    expect(queryByText('Active')).toBeNull()
  })

  it('renders a photo when photo_url is set', () => {
    const { getByAltText } = renderProductDetails({
      product: { ...baseProduct, photo_url: 'https://example.com/photo.jpg' },
    })
    expect(getByAltText('Coca-Cola Original 600 ml')).toBeDefined()
  })

  it('renders a placeholder when photo_url is null', () => {
    const { getByTestId, queryByRole } = renderProductDetails()
    expect(getByTestId('product-details-no-photo')).toBeDefined()
    expect(queryByRole('img')).toBeNull()
  })

  it('renders the description when present', () => {
    const { getByText } = renderProductDetails()
    expect(getByText('Refresco de cola')).toBeDefined()
  })

  it('shows the variant count and an empty-state message when there are none', () => {
    const { getByText } = renderProductDetails({ variants: [] })
    expect(getByText('0')).toBeDefined()
    expect(getByText(/No variants yet/)).toBeDefined()
  })

  it('shows the variant count without the empty-state message when there are variants', () => {
    const { getByText, queryByText } = renderProductDetails({ variants: [cocaColaVariant] })
    expect(getByText('1')).toBeDefined()
    expect(getByText('Coca-Cola 600 ml Single')).toBeDefined()
    expect(queryByText(/No variants yet/)).toBeNull()
  })

  it('calls onVariantClick when a variant card is clicked', () => {
    const onVariantClick = vi.fn()
    const { getByText } = renderProductDetails({ variants: [cocaColaVariant], onVariantClick })
    fireEvent.click(getByText('COCA-600'))
    expect(onVariantClick).toHaveBeenCalledWith(cocaColaVariant)
  })

  it('calls onNewVariant when New Variant is clicked', () => {
    const onNewVariant = vi.fn()
    const { getByText } = renderProductDetails({ onNewVariant })
    fireEvent.click(getByText('New Variant'))
    expect(onNewVariant).toHaveBeenCalledTimes(1)
  })

  it('renders backend warnings when present', () => {
    const { getByText } = renderProductDetails({
      product: {
        ...baseProduct,
        warnings: ['The assigned category "Beverages" is inactive; this product will not appear as active until it is reactivated.'],
      },
    })
    expect(getByText(/is inactive; this product will not appear as active/)).toBeDefined()
  })

  it('renders no warnings section when there are none', () => {
    const { queryByTestId } = renderProductDetails()
    expect(queryByTestId('product-details-warnings')).toBeNull()
  })

  it('calls onEdit when the Edit button is clicked', () => {
    const onEdit = vi.fn()
    const { getByText } = renderProductDetails({ onEdit })
    fireEvent.click(getByText('Edit Product'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn()
    const { getByText } = renderProductDetails({ onDelete })
    fireEvent.click(getByText('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('hides Edit Product when the user lacks items.update', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.update')
    const { queryByText } = renderProductDetails()
    expect(queryByText('Edit Product')).toBeNull()
  })

  it('hides Delete when the user lacks items.delete', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.delete')
    const { queryByText } = renderProductDetails()
    expect(queryByText('Delete')).toBeNull()
  })

  it('hides New Variant when the user lacks items.create', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.create')
    const { queryByText } = renderProductDetails()
    expect(queryByText('New Variant')).toBeNull()
  })

  it('hides all controls for a read-only user (items.view only)', () => {
    mockAuthState.can.mockReturnValue(false)
    const { queryByText } = renderProductDetails()
    expect(queryByText('Edit Product')).toBeNull()
    expect(queryByText('Delete')).toBeNull()
    expect(queryByText('New Variant')).toBeNull()
  })
})
