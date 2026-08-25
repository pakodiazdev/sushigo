/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ResolvedPricePreview } from '../resolved-price-preview'
import type { PriceResolutionResult } from '../../types'

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../../hooks/use-resolved-price-preview', () => ({
  useResolvedPricePreview: () => mockHookState.value,
}))

vi.mock('../variant-picker', () => ({
  VariantPicker: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" data-testid="variant-picker" onClick={() => onChange('iv-1')}>
      Pick variant
    </button>
  ),
}))

vi.mock('../branch-context-picker', () => ({
  BranchContextPicker: ({ onBranchChange }: { onBranchChange: (value: number | null) => void }) => (
    <button type="button" data-testid="branch-context-picker" onClick={() => onBranchChange(1)}>
      Pick branch
    </button>
  ),
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    itemVariantId: '',
    setItemVariantId: vi.fn(),
    branchId: null,
    setBranchId: vi.fn(),
    operatingUnitId: null,
    setOperatingUnitId: vi.fn(),
    asOf: '',
    setAsOf: vi.fn(),
    canPreview: false,
    handlePreview: vi.fn(),
    isPending: false,
    result: null as PriceResolutionResult | null,
  }
}

describe('ResolvedPricePreview', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('disables the Preview button until a preview is allowed', () => {
    setHookState({ canPreview: false })
    const { getByText } = render(<ResolvedPricePreview />)
    expect((getByText('Preview Resolved Price').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls handlePreview when the button is clicked', () => {
    const handlePreview = vi.fn()
    setHookState({ canPreview: true, handlePreview })
    const { getByText } = render(<ResolvedPricePreview />)
    fireEvent.click(getByText('Preview Resolved Price'))
    expect(handlePreview).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner while pending', () => {
    setHookState({ canPreview: true, isPending: true })
    const { container } = render(<ResolvedPricePreview />)
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('renders a resolved result with its price list', () => {
    setHookState({
      result: {
        item_variant_id: 'iv-1',
        branch_id: 1,
        operating_unit_id: null,
        as_of: '2026-08-25',
        resolved: true,
        price: '129.5000',
        price_list: { id: 'pl-1', code: 'STANDARD', name: 'Standard Pricing' },
      },
    })
    const { getByTestId, getByText } = render(<ResolvedPricePreview />)
    const resultBox = getByTestId('resolved-price-preview-result')
    expect(resultBox).toBeDefined()
    expect(getByText('129.5000')).toBeDefined()
    expect(getByText(/Standard Pricing \(STANDARD\)/)).toBeDefined()
  })

  it('renders an explicit no-price result, not an error', () => {
    setHookState({
      result: {
        item_variant_id: 'iv-1',
        branch_id: 1,
        operating_unit_id: null,
        as_of: '2026-08-25',
        resolved: false,
        price: null,
        price_list: null,
      },
    })
    const { getByText } = render(<ResolvedPricePreview />)
    expect(getByText(/No configured price for this context/)).toBeDefined()
  })

  it('wires the Variant and Branch pickers into the hook setters', () => {
    const setItemVariantId = vi.fn()
    const setBranchId = vi.fn()
    setHookState({ setItemVariantId, setBranchId })
    const { getByTestId } = render(<ResolvedPricePreview />)
    fireEvent.click(getByTestId('variant-picker'))
    expect(setItemVariantId).toHaveBeenCalledWith('iv-1')
    fireEvent.click(getByTestId('branch-context-picker'))
    expect(setBranchId).toHaveBeenCalledWith(1)
  })

  it('wires the As Of date input into setAsOf', () => {
    const setAsOf = vi.fn()
    setHookState({ setAsOf })
    const { container } = render(<ResolvedPricePreview />)
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2026-08-01' } })
    expect(setAsOf).toHaveBeenCalledWith('2026-08-01')
  })
})
