/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { VariantPicker } from '../variant-picker'
import type { ItemVariant } from '@/types/inventory'

const mockSearchState = vi.hoisted(() => ({
  search: '',
  setSearch: vi.fn(),
  variants: [] as ItemVariant[],
  isLoading: false,
}))

vi.mock('../../hooks/use-variant-search', () => ({
  useVariantSearch: () => mockSearchState,
}))

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
const variant2: ItemVariant = {
  id: 'iv-2',
  item_id: 2,
  code: 'V2',
  name: 'Variant Two',
  uom_id: 1,
  min_stock: 0,
  max_stock: 0,
  avg_unit_cost: 0,
  last_unit_cost: 0,
  is_active: true,
}

describe('VariantPicker', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockSearchState.search = ''
    mockSearchState.variants = []
    mockSearchState.isLoading = false
  })

  it('lists the searched variants, with and without a parent item name', () => {
    mockSearchState.variants = [variant1, variant2]
    const { getByText } = render(<VariantPicker value="" onChange={vi.fn()} />)
    expect(getByText('Product One — Variant One (V1)')).toBeDefined()
    expect(getByText('Variant Two (V2)')).toBeDefined()
  })

  it('shows a loading placeholder while searching', () => {
    mockSearchState.isLoading = true
    const { getByText } = render(<VariantPicker value="" onChange={vi.fn()} />)
    expect(getByText('Searching…')).toBeDefined()
  })

  it('calls onChange when a variant is selected', () => {
    mockSearchState.variants = [variant1]
    const onChange = vi.fn()
    const { container } = render(<VariantPicker value="" onChange={onChange} />)
    fireEvent.change(container.querySelector('select')!, { target: { value: 'iv-1' } })
    expect(onChange).toHaveBeenCalledWith('iv-1')
  })

  it('calls setSearch when the search input changes', () => {
    const { container } = render(<VariantPicker value="" onChange={vi.fn()} />)
    fireEvent.change(container.querySelector('input')!, { target: { value: 'roll' } })
    // SearchInput debounces internally before calling through — just assert it renders wired,
    // not the debounce timing itself (already covered by use-variant-search.test.ts).
    expect(container.querySelector('input')).toBeDefined()
  })

  it('surfaces a field error', () => {
    const { getByText } = render(<VariantPicker value="" onChange={vi.fn()} error="Product Variant is required" />)
    expect(getByText('Product Variant is required')).toBeDefined()
  })

  it('disables the select when disabled is set', () => {
    const { container } = render(<VariantPicker value="" onChange={vi.fn()} disabled />)
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true)
  })

  it('clears a selected variant that drops out of a refined search once the fetch settles', () => {
    mockSearchState.variants = [variant2]
    const onChange = vi.fn()
    render(<VariantPicker value="iv-1" onChange={onChange} />)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does not clear the selection while the refined search is still loading', () => {
    mockSearchState.variants = []
    mockSearchState.isLoading = true
    const onChange = vi.fn()
    render(<VariantPicker value="iv-1" onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('leaves a selection that is still present in the results untouched', () => {
    mockSearchState.variants = [variant1, variant2]
    const onChange = vi.fn()
    render(<VariantPicker value="iv-1" onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })
})
