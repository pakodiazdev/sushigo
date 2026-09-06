/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import type { OpeningBalancePreview } from '@/types/inventory'
import { OpeningBalanceForm } from '../opening-balance-form'

// The component is now purely presentational — all logic lives in the
// use-opening-balance-form hook, mocked here so the view can be asserted in
// isolation (Spanish copy, the initialization notice, the conversion preview).
const hookState = vi.hoisted(() => ({
  value: {
    register: () => ({}),
    handleSubmit: (fn: (data: unknown) => void) => (e: React.FormEvent) => {
      e.preventDefault()
      fn({})
    },
    onSubmit: vi.fn(),
    setFieldValue: vi.fn(),
    values: {
      inventoryLocationId: 'loc-1',
      itemVariantId: 'var-1',
      uomId: 'uom-1',
      quantity: 10,
      unitCost: 5,
    },
    errors: {} as Record<string, string | undefined>,
    locations: [
      { id: 'loc-1', name: 'Almacén Central', type: 'MAIN' },
      { id: 'loc-2', name: 'Tienda', type: 'STORE' },
    ],
    variants: [
      { id: 'var-1', code: 'VAR-001', name: 'Salmón 1kg', item: { sku: 'SAL-001', name: 'Salmón' }, uom: { id: 'uom-1', name: 'Kilogramo', symbol: 'kg' } },
    ],
    units: [{ id: 'uom-1', name: 'Kilogramo', symbol: 'kg', type: 'WEIGHT' }],
    selectedVariant: {
      id: 'var-1',
      code: 'VAR-001',
      name: 'Salmón 1kg',
      item: { sku: 'SAL-001', name: 'Salmón' },
      uom: { id: 'uom-1', name: 'Kilogramo', symbol: 'kg' },
    },
    preview: null as OpeningBalancePreview | null,
    previewLoading: false,
    previewErrorMessage: undefined as string | undefined,
    isPending: false,
  },
}))

vi.mock('../use-opening-balance-form', () => ({
  useOpeningBalanceForm: () => hookState.value,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Header: ({ children }: { children: React.ReactNode }) => <div data-testid="hdr">{children}</div>,
    Body: ({ children }: { children: React.ReactNode }) => <div data-testid="body">{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div data-testid="ftr">{children}</div>,
  },
}))

const defaultProps = {
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
}

function resetHookState() {
  hookState.value.preview = null
  hookState.value.previewLoading = false
  hookState.value.previewErrorMessage = undefined
  hookState.value.isPending = false
  hookState.value.errors = {}
}

describe('OpeningBalanceForm (view)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetHookState()
  })
  afterEach(() => cleanup())

  it('renders the Spanish header and submit label', () => {
    const { container, getByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(container.querySelector('h2')?.textContent).toBe('Registrar saldo inicial')
    expect(getByText('Cancelar')).toBeDefined()
    expect(
      container.querySelector('button[type="submit"]')?.textContent
    ).toContain('Registrar saldo inicial')
  })

  it('explains that the action initializes inventory and leaves permanent audit evidence', () => {
    const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(
      getByText(/evidencia de\s+auditoría permanente/i)
    ).toBeDefined()
    expect(getByText(/inicializa o suma/i)).toBeDefined()
  })

  it('renders Spanish reference-field copy', () => {
    const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(getByText('Ubicación')).toBeDefined()
    expect(getByText('Variante')).toBeDefined()
    expect(getByText('Unidad de medida')).toBeDefined()
    expect(getByText('Selecciona una ubicación...')).toBeDefined()
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    const { getByText } = render(<OpeningBalanceForm {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows the conversion preview with the base quantity when a conversion applies', () => {
    hookState.value.preview = {
      entry_quantity: 25000,
      entry_uom: 'GR',
      base_quantity: 25,
      base_uom: 'KG',
      conversion_applies: true,
      conversion_factor: 0.001,
      entry_unit_cost: 0.15,
      base_unit_cost: 150,
      total_value: 3750,
    }
    const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(getByText('Resumen antes de registrar')).toBeDefined()
    expect(getByText('Cantidad en unidad base:')).toBeDefined()
    expect(getByText('25 KG')).toBeDefined()
    expect(getByText('$3750.00')).toBeDefined()
  })

  it('renders "Sin costo" and no valuation when the preview has no unit cost', () => {
    hookState.value.preview = {
      entry_quantity: 10,
      entry_uom: 'KG',
      base_quantity: 10,
      base_uom: 'KG',
      conversion_applies: false,
      conversion_factor: 1,
      entry_unit_cost: null,
      base_unit_cost: null,
      total_value: null,
    }
    const { getByText, queryByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(getByText('Sin costo')).toBeDefined()
    expect(queryByText('Cantidad en unidad base:')).toBeNull()
  })

  it('surfaces a preview error message', () => {
    hookState.value.previewErrorMessage = 'No se pudo calcular la conversión para esta unidad'
    const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(getByText('No se pudo calcular la conversión para esta unidad')).toBeDefined()
  })

  it('disables the submit button while the mutation is pending', () => {
    hookState.value.isPending = true
    const { container } = render(<OpeningBalanceForm {...defaultProps} />)
    expect(container.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true)
    expect(container.querySelector('form')?.getAttribute('aria-busy')).toBe('true')
  })
})
