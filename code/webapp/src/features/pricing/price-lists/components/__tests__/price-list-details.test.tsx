/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PriceListDetails } from '../price-list-details'
import type { PriceList } from '../../types'

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-body">{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-footer">{children}</div>,
  },
}))

vi.mock('../assignments-section', () => ({
  AssignmentsSection: ({ onNewAssignment }: { onNewAssignment: () => void }) => (
    <button type="button" data-testid="assignments-section" onClick={onNewAssignment}>
      Assignments
    </button>
  ),
}))

vi.mock('../variant-prices-section', () => ({
  VariantPricesSection: ({ onNewVariantPrice }: { onNewVariantPrice: () => void }) => (
    <button type="button" data-testid="variant-prices-section" onClick={onNewVariantPrice}>
      Variant Prices
    </button>
  ),
}))

vi.mock('../resolved-price-preview', () => ({
  ResolvedPricePreview: () => <div data-testid="resolved-price-preview" />,
}))

const priceList: PriceList = {
  id: 'pl-1',
  code: 'STANDARD',
  name: 'Standard Pricing',
  description: 'The default list',
  priority: 3,
  is_active: true,
}

function baseProps() {
  return {
    priceList,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    assignments: [],
    assignmentsLoading: false,
    assignmentsError: false,
    onNewAssignment: vi.fn(),
    onAssignmentClick: vi.fn(),
    variantPrices: [],
    variantDetailsById: {},
    variantPricesLoading: false,
    variantPricesError: false,
    onNewVariantPrice: vi.fn(),
    onVariantPriceClick: vi.fn(),
  }
}

describe('PriceListDetails', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the code, name, priority and description', () => {
    const { getByText } = render(<PriceListDetails {...baseProps()} />)
    expect(getByText('STANDARD')).toBeDefined()
    expect(getByText('Standard Pricing')).toBeDefined()
    expect(getByText('Priority 3')).toBeDefined()
    expect(getByText('The default list')).toBeDefined()
  })

  it('shows an Inactive badge when the price list is inactive', () => {
    const { getByText } = render(<PriceListDetails {...baseProps()} priceList={{ ...priceList, is_active: false }} />)
    expect(getByText('Inactive')).toBeDefined()
  })

  it('renders the nested Assignments, Variant Prices and preview sections', () => {
    const { getByTestId } = render(<PriceListDetails {...baseProps()} />)
    expect(getByTestId('assignments-section')).toBeDefined()
    expect(getByTestId('variant-prices-section')).toBeDefined()
    expect(getByTestId('resolved-price-preview')).toBeDefined()
  })

  it('calls onEdit when Edit Price List is clicked', () => {
    const props = baseProps()
    const { getByText } = render(<PriceListDetails {...props} />)
    fireEvent.click(getByText('Edit Price List'))
    expect(props.onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when Delete is clicked', () => {
    const props = baseProps()
    const { getByText } = render(<PriceListDetails {...props} />)
    fireEvent.click(getByText('Delete'))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('propagates the section takeover callbacks', () => {
    const props = baseProps()
    const { getByTestId } = render(<PriceListDetails {...props} />)
    fireEvent.click(getByTestId('assignments-section'))
    expect(props.onNewAssignment).toHaveBeenCalledTimes(1)
    fireEvent.click(getByTestId('variant-prices-section'))
    expect(props.onNewVariantPrice).toHaveBeenCalledTimes(1)
  })
})
