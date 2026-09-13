/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { ProductVariants } from '../product-variants'
import type { ProductVariant } from '@/types/inventory'

const mockAuthState = {
  can: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const riceVariant: ProductVariant = {
  id: '7',
  item_id: '42',
  code: 'ARR-KG',
  barcode: '7501234567890',
  name: 'Arroz Premium 1kg',
  description: null,
  uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  track_lot: false,
  track_serial: false,
  is_active: true,
}

const inactiveVariant: ProductVariant = {
  ...riceVariant,
  id: '8',
  code: 'ARR-2KG',
  name: 'Arroz Premium 2kg',
  is_active: false,
}

describe('ProductVariants', () => {
  afterEach(() => {
    cleanup()
    mockAuthState.can.mockReturnValue(true)
  })

  it('shows a loading indicator while fetching', () => {
    const { container } = render(
      <ProductVariants
        variants={[]}
        isLoading={true}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows a placeholder instead of "0" for the count while loading', () => {
    const { getByText, queryByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={true}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText('—')).toBeDefined()
    expect(queryByText('0')).toBeNull()
  })

  it('shows an error message instead of implying the catalog is empty', () => {
    const { getByText, queryByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={true}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText(/No se pudieron cargar las variantes/)).toBeDefined()
    expect(queryByText(/Aún no hay variantes/)).toBeNull()
  })

  it('calls onRetry when the retry action is clicked on error', () => {
    const onRetry = vi.fn()
    render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={true}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
        onRetry={onRetry}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a placeholder instead of "0" for the count on error', () => {
    const { getByText, queryByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={true}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText('—')).toBeDefined()
    expect(queryByText('0')).toBeNull()
  })

  it('shows an empty-state message when there are no variants', () => {
    const { getByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText(/Aún no hay variantes/)).toBeDefined()
  })

  it('renders SKU, barcode, base UOM and status for each variant', () => {
    const { getByText } = render(
      <ProductVariants
        variants={[riceVariant]}
        isLoading={false}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText('Arroz Premium 1kg')).toBeDefined()
    expect(getByText('ARR-KG')).toBeDefined()
    expect(getByText('7501234567890')).toBeDefined()
    expect(getByText('kg')).toBeDefined()
    expect(getByText('Activa')).toBeDefined()
  })

  it('shows Inactiva for a deactivated variant', () => {
    const { getByText } = render(
      <ProductVariants
        variants={[inactiveVariant]}
        isLoading={false}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(getByText('Inactiva')).toBeDefined()
  })

  it('calls onVariantClick with the clicked variant', () => {
    const onVariantClick = vi.fn()
    const { getByText } = render(
      <ProductVariants
        variants={[riceVariant]}
        isLoading={false}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={onVariantClick}
      />
    )
    fireEvent.click(getByText('Arroz Premium 1kg'))
    expect(onVariantClick).toHaveBeenCalledWith(riceVariant)
  })

  it('calls onNewVariant when Nueva variante is clicked', () => {
    const onNewVariant = vi.fn()
    const { getByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={false}
        onNewVariant={onNewVariant}
        onVariantClick={vi.fn()}
      />
    )
    fireEvent.click(getByText('Nueva variante'))
    expect(onNewVariant).toHaveBeenCalledTimes(1)
  })

  it('hides Nueva variante when the user lacks items.create', () => {
    mockAuthState.can.mockImplementation((permission: string) => permission !== 'items.create')
    const { queryByText } = render(
      <ProductVariants
        variants={[]}
        isLoading={false}
        isError={false}
        onNewVariant={vi.fn()}
        onVariantClick={vi.fn()}
      />
    )
    expect(queryByText('Nueva variante')).toBeNull()
  })
})
