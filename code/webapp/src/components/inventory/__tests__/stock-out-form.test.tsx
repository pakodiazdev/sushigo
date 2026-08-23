/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// Create STABLE mock references OUTSIDE the mock
const mockRegister = vi.fn(() => ({}))
const mockSetValue = vi.fn()
const mockHandleSubmit = vi.fn((fn: (data: unknown) => void) => (e: React.FormEvent) => {
    e.preventDefault()
    fn({})
})
let watchValues: Record<string, number | string> = {
    location_id: '',
    variant_id: '',
    uom_id: '',
    qty: 0,
    reason: 'SALE',
    sale_price: 0,
    notes: '',
}
const mockWatch = vi.fn((field?: string) => {
    return field ? watchValues[field] : watchValues
})
const mockFormState = { errors: {} }

vi.mock('react-hook-form', () => ({
    useForm: () => ({
        register: mockRegister,
        handleSubmit: mockHandleSubmit,
        watch: mockWatch,
        setValue: mockSetValue,
        formState: mockFormState,
    }),
}))

// Mock @tanstack/react-query with stable references
const mockQueryResult: { data: unknown } & Record<string, unknown> = {
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
}

vi.mock('@tanstack/react-query', () => ({
    useQuery: () => mockQueryResult,
}))

// Mock useFormMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => ({
        execute: vi.fn().mockResolvedValue({}),
        validationErrors: {},
        isPending: false,
    }),
}))

// Stable references — real react-query memoizes `data` between renders when unchanged;
// returning fresh array/object literals on every call (as before) breaks that assumption and
// causes the variant-lookup useEffect to loop forever once a test actually selects a variant.
const MOCK_LOCATIONS = [{ id: 'location-01', name: 'Main Warehouse', type: 'WAREHOUSE', priority: 10 }]
const MOCK_VARIANTS = [{
    id: 'variant-01', code: 'VAR-001', name: 'Salt 500g', uom_id: 1,
    uom: { id: 'uom-01', name: 'Kilogram', symbol: 'kg' },
    item: { sku: 'SAL-001', name: 'Salt' },
    last_unit_cost: 5.0, min_stock: 10,
}]
const MOCK_UNITS = [{ id: 'uom-01', name: 'Kilogram', symbol: 'kg', type: 'WEIGHT' }]

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
    useInventoryLocationsSelect: () => ({ data: MOCK_LOCATIONS, isLoading: false }),
    useItemVariantsSelect: () => ({ data: MOCK_VARIANTS, isLoading: false }),
    useUnitsOfMeasureSelect: () => ({ data: MOCK_UNITS, isLoading: false }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    stockMovementApi: { stockOut: vi.fn().mockResolvedValue({}) },
    stockApi: { byVariant: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}))

// Mock toast provider
vi.mock('@/components/ui/toast-context', () => ({
    useToast: () => ({
        showWarning: vi.fn(),
        showError: vi.fn(),
        showSuccess: vi.fn(),
    }),
}))

// Mock SlidePanel
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: {
        Header: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="slide-panel-header">{children}</div>
        ),
        Body: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="slide-panel-body">{children}</div>
        ),
        Footer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="slide-panel-footer">{children}</div>
        ),
    },
}))

import { StockOutForm } from '../stock-out-form'

const defaultProps = { onSuccess: vi.fn(), onCancel: vi.fn() }

describe('StockOutForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        watchValues = {
            location_id: '',
            variant_id: '',
            uom_id: '',
            qty: 0,
            reason: 'SALE',
            sale_price: 0,
            notes: '',
        }
        mockQueryResult.data = null
    })
    afterEach(() => { cleanup() })

    it('exports StockOutForm component', () => {
        expect(StockOutForm).toBeDefined()
        expect(typeof StockOutForm).toBe('function')
    })

    it('renders the form', () => {
        const { container } = render(<StockOutForm {...defaultProps} />)
        expect(container.querySelector('form')).toBeDefined()
    })

    it('renders the header with title', () => {
        const { getByRole } = render(<StockOutForm {...defaultProps} />)
        expect(getByRole('heading', { name: /register stock out/i })).toBeDefined()
    })

    it('renders location select with options', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Main Warehouse (WAREHOUSE)')).toBeDefined()
    })

    it('renders variant select with options', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('VAR-001 - Salt 500g (SAL-001)')).toBeDefined()
    })

    it('renders unit of measure select', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Kilogram (kg) - WEIGHT')).toBeDefined()
    })

    it('renders reason select options', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Sale (revenue generating)')).toBeDefined()
        expect(getByText('Consumption (internal use)')).toBeDefined()
    })

    it('renders cancel button', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Cancel')).toBeDefined()
    })

    it('renders submit button', () => {
        const { getByRole } = render(<StockOutForm {...defaultProps} />)
        expect(getByRole('button', { name: /register stock out/i })).toBeDefined()
    })

    it('renders slide panel sections', () => {
        const { container } = render(<StockOutForm {...defaultProps} />)
        expect(container.querySelector('[data-testid="slide-panel-header"]')).toBeDefined()
        expect(container.querySelector('[data-testid="slide-panel-body"]')).toBeDefined()
        expect(container.querySelector('[data-testid="slide-panel-footer"]')).toBeDefined()
    })

    it('calls onCancel when cancel button is clicked', () => {
        const onCancel = vi.fn()
        const { getByText } = render(<StockOutForm {...defaultProps} onCancel={onCancel} />)
        fireEvent.click(getByText('Cancel'))
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('accepts preselectedLocationId prop', () => {
        const { container } = render(<StockOutForm {...defaultProps} preselectedLocationId="location-01" />)
        expect(container.querySelector('form')).toBeDefined()
    })

    it('accepts preselectedVariantId prop', () => {
        const { container } = render(<StockOutForm {...defaultProps} preselectedVariantId="variant-01" />)
        expect(container.querySelector('form')).toBeDefined()
    })

    it('has correct form id', () => {
        const { container } = render(<StockOutForm {...defaultProps} />)
        expect(container.querySelector('#stock-out-form')).toBeDefined()
    })

    it('renders required field labels', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Location')).toBeDefined()
        expect(getByText('Item Variant')).toBeDefined()
        expect(getByText('Quantity')).toBeDefined()
        expect(getByText('Reason')).toBeDefined()
    })

    it('renders description text', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText(/remove inventory from location/i)).toBeDefined()
    })

    it('renders sale price field', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Sale Price per Unit')).toBeDefined()
    })

    it('renders notes field', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Notes')).toBeDefined()
    })

    it('renders unit of measure field', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Unit of Measure')).toBeDefined()
    })

    it('submits form when submit button is clicked', () => {
        const { getByRole } = render(<StockOutForm {...defaultProps} />)
        const submitButton = getByRole('button', { name: /register stock out/i })
        fireEvent.click(submitButton)
        expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('renders variant select help text', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Select the product variant to remove')).toBeDefined()
    })

    it('calls watch for location_id', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('location_id')
    })

    it('calls watch for variant_id', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('variant_id')
    })

    it('calls watch for reason', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('reason')
    })

    it('renders placeholder option for location select', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Select location...')).toBeDefined()
    })

    it('renders placeholder option for variant select', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Select variant...')).toBeDefined()
    })

    it('calls watch for uom_id', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('uom_id')
    })

    it('calls watch for qty', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('qty')
    })

    it('calls watch for sale_price', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockWatch).toHaveBeenCalledWith('sale_price')
    })

    it('registers qty field', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockRegister).toHaveBeenCalledWith('qty', { valueAsNumber: true })
    })

    it('registers sale_price field', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockRegister).toHaveBeenCalledWith('sale_price', { valueAsNumber: true })
    })

    it('registers notes field', () => {
        render(<StockOutForm {...defaultProps} />)
        expect(mockRegister).toHaveBeenCalledWith('notes')
    })

    it('calls setValue when location select changes', () => {
        const { getAllByRole } = render(<StockOutForm {...defaultProps} />)
        const selects = getAllByRole('combobox')
        fireEvent.change(selects[0]!, { target: { value: 'location-01' } })
        expect(mockSetValue).toHaveBeenCalledWith('location_id', 'location-01')
    })

    it('calls setValue when variant select changes', () => {
        const { getAllByRole } = render(<StockOutForm {...defaultProps} />)
        const selects = getAllByRole('combobox')
        fireEvent.change(selects[1]!, { target: { value: 'variant-01' } })
        expect(mockSetValue).toHaveBeenCalledWith('variant_id', 'variant-01')
    })

    it('calls setValue when uom select changes', () => {
        const { getAllByRole } = render(<StockOutForm {...defaultProps} />)
        const selects = getAllByRole('combobox')
        fireEvent.change(selects[2]!, { target: { value: 'uom-01' } })
        expect(mockSetValue).toHaveBeenCalledWith('uom_id', 'uom-01')
    })

    it('calls setValue when reason select changes', () => {
        const { getAllByRole } = render(<StockOutForm {...defaultProps} />)
        const selects = getAllByRole('combobox')
        fireEvent.change(selects[3]!, { target: { value: 'CONSUMPTION' } })
        expect(mockSetValue).toHaveBeenCalledWith('reason', 'CONSUMPTION')
    })

    it('renders quantity hint', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText(/amount to remove from inventory/i)).toBeDefined()
    })

    it('renders UoM hint', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText(/auto-filled from variant/i)).toBeDefined()
    })

    it('renders selling price hint', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText(/selling price per unit/i)).toBeDefined()
    })

    it('renders notes placeholder', () => {
        const { container } = render(<StockOutForm {...defaultProps} />)
        const textarea = container.querySelector('textarea')
        expect(textarea).toBeDefined()
    })

    it('renders select unit placeholder', () => {
        const { getByText } = render(<StockOutForm {...defaultProps} />)
        expect(getByText('Select unit...')).toBeDefined()
    })

    it('shows the current stock info panel with normal stock levels', async () => {
        watchValues.variant_id = 'variant-01'
        watchValues.location_id = 'location-01'
        mockQueryResult.data = {
            data: { data: [{ inventory_location_id: 'location-01', on_hand: 50, reserved: 5, available: 45 }] },
        }

        const { findByText, queryByText } = render(<StockOutForm {...defaultProps} />)

        expect(await findByText('Current Stock')).toBeTruthy()
        expect(queryByText(/stock below minimum level/i)).toBeNull()
        expect(queryByText(/insufficient stock for this operation/i)).toBeNull()
    })

    it('shows a low-stock warning when available stock is below the variant minimum', async () => {
        watchValues.variant_id = 'variant-01'
        watchValues.location_id = 'location-01'
        mockQueryResult.data = {
            data: { data: [{ inventory_location_id: 'location-01', on_hand: 8, reserved: 3, available: 5 }] },
        }

        const { findByText } = render(<StockOutForm {...defaultProps} />)

        expect(await findByText(/stock below minimum level/i)).toBeTruthy()
    })

    it('shows an insufficient-stock error when quantity exceeds available stock', async () => {
        watchValues.variant_id = 'variant-01'
        watchValues.location_id = 'location-01'
        watchValues.qty = 10
        mockQueryResult.data = {
            data: { data: [{ inventory_location_id: 'location-01', on_hand: 8, reserved: 3, available: 5 }] },
        }

        const { findByText } = render(<StockOutForm {...defaultProps} />)

        expect(await findByText(/insufficient stock for this operation/i)).toBeTruthy()
        expect(await findByText('Only 5 units available')).toBeTruthy()
    })

    it('shows the profit analysis panel with revenue, cost and profit for a sale', async () => {
        watchValues.variant_id = 'variant-01'
        watchValues.qty = 10
        watchValues.sale_price = 20
        watchValues.reason = 'SALE'

        const { findByText } = render(<StockOutForm {...defaultProps} />)

        expect(await findByText('Profit Analysis')).toBeTruthy()
        expect(await findByText('$200.00')).toBeTruthy() // revenue: 10 * 20
        expect(await findByText('$50.00')).toBeTruthy() // cost: 10 * 5 (last_unit_cost)
        expect(await findByText('$150.00')).toBeTruthy() // profit: 200 - 50
        expect(await findByText('75.0% margin')).toBeTruthy()
    })
})
