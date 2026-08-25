/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantPricesSection } from '../variant-prices-section'
import type { VariantPrice } from '../../types'
import type { ItemVariant } from '@/types/inventory'

const mockPermissions = vi.hoisted(() => ({
  price_lists_update: true,
  items_view: true,
}))

vi.mock('@/hooks/use-can-access', () => ({
  useCanAccess: ({ permission }: { permission: string }) =>
    permission === 'price_lists.update'
      ? mockPermissions.price_lists_update
      : mockPermissions.items_view,
}))

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const vp1: VariantPrice = {
  id: 'vp-1',
  item_variant_id: 'iv-1',
  price_list_id: 'pl-1',
  price: '129.5000',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}
const vp2: VariantPrice = {
  id: 'vp-2',
  item_variant_id: 'iv-unknown',
  price_list_id: 'pl-1',
  price: '10.0000',
  effective_from: '2026-01-01',
  effective_to: '2026-06-01',
  is_active: false,
}

const variant1: ItemVariant = {
  id: 'iv-1',
  item_id: 1,
  code: 'V1',
  name: 'Variant One',
  uom_id: 1,
  min_stock: 0,
  max_stock: 0,
  avg_unit_cost: 0,
  last_unit_cost: 0,
  is_active: true,
  item: { id: 1, sku: null, name: 'Product One', type: 'PRODUCTO', is_stocked: false, is_perishable: false, is_active: true },
}

describe('VariantPricesSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockPermissions.price_lists_update = true
    mockPermissions.items_view = true
  })

  it('shows a loading state', () => {
    const { container } = render(
      <VariantPricesSection
        variantPrices={[]}
        variantDetailsById={{}}
        isLoading
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={vi.fn()}
      />
    )
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('shows an error state', () => {
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[]}
        variantDetailsById={{}}
        isLoading={false}
        isError
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={vi.fn()}
      />
    )
    expect(getByText(/Failed to load variant prices/)).toBeDefined()
  })

  it('shows an empty state', () => {
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[]}
        variantDetailsById={{}}
        isLoading={false}
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={vi.fn()}
      />
    )
    expect(getByText(/No prices yet/)).toBeDefined()
  })

  it('shows the enriched Variant name when known, and the bare id otherwise', () => {
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[vp1, vp2]}
        variantDetailsById={{ 'iv-1': variant1 }}
        isLoading={false}
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={vi.fn()}
      />
    )
    expect(getByText('Product One — Variant One')).toBeDefined()
    expect(getByText('iv-unknown')).toBeDefined()
    expect(getByText(/129.5000/)).toBeDefined()
    expect(getByText(/2026-01-01 → 2026-06-01/)).toBeDefined()
  })

  it('calls onVariantPriceClick when a row is clicked', () => {
    const onVariantPriceClick = vi.fn()
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[vp1]}
        variantDetailsById={{ 'iv-1': variant1 }}
        isLoading={false}
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={onVariantPriceClick}
      />
    )
    fireEvent.click(getByText('Product One — Variant One'))
    expect(onVariantPriceClick).toHaveBeenCalledWith(vp1)
  })

  it('renders a non-interactive row without update permission', () => {
    mockPermissions.price_lists_update = false
    const onVariantPriceClick = vi.fn()
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[vp1]}
        variantDetailsById={{ 'iv-1': variant1 }}
        isLoading={false}
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={onVariantPriceClick}
      />
    )

    expect(getByText('Product One — Variant One').closest('button')).toBeNull()
    fireEvent.click(getByText('Product One — Variant One'))
    expect(onVariantPriceClick).not.toHaveBeenCalled()
  })

  it('calls onNewVariantPrice when the button is clicked', () => {
    const onNewVariantPrice = vi.fn()
    const { getByText } = render(
      <VariantPricesSection
        variantPrices={[]}
        variantDetailsById={{}}
        isLoading={false}
        isError={false}
        onNewVariantPrice={onNewVariantPrice}
        onVariantPriceClick={vi.fn()}
      />
    )
    fireEvent.click(getByText('New Price'))
    expect(onNewVariantPrice).toHaveBeenCalledTimes(1)
  })

  it('hides editing controls without items.view permission', () => {
    mockPermissions.items_view = false
    const onVariantPriceClick = vi.fn()
    const { queryByText, getByText } = render(
      <VariantPricesSection
        variantPrices={[vp1]}
        variantDetailsById={{}}
        isLoading={false}
        isError={false}
        onNewVariantPrice={vi.fn()}
        onVariantPriceClick={onVariantPriceClick}
      />
    )

    expect(queryByText('New Price')).toBeNull()
    expect(getByText('iv-1').closest('button')).toBeNull()
  })
})
