/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// Create STABLE mock references OUTSIDE the mock to prevent infinite re-renders
const mockRegister = vi.fn(() => ({}))
const mockSetValue = vi.fn()
const mockHandleSubmit = vi.fn((fn: (data: unknown) => void) => (e: React.FormEvent) => {
    e.preventDefault()
    fn({})
})
const mockWatch = vi.fn((field?: string) => {
    const values: Record<string, number | string> = {
        location_id: 0,
        variant_id: 0,
        uom_id: 0,
        qty: 0,
        reason: 'SALE',
        sale_price: 0,
        notes: '',
    }
    return field ? values[field] : values
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
const mockRefetch = vi.fn()
const mockQueryResult = {
    data: { data: { data: [] } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    isFetching: false,
}

vi.mock('@tanstack/react-query', () => ({
    useQuery: () => mockQueryResult,
}))

// Mock useFormMutation hook with stable references
const mockExecute = vi.fn().mockResolvedValue({})
const mockMutationResult = {
    execute: mockExecute,
    validationErrors: {},
    isPending: false,
}

vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => mockMutationResult,
}))

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
    useInventoryLocationsSelect: () => ({
        data: [{ id: 1, name: 'Main Warehouse', type: 'WAREHOUSE', priority: 10 }],
        isLoading: false,
    }),
    useItemVariantsSelect: () => ({
        data: [{
            id: 1, code: 'VAR-001', name: 'Salt 500g', uom_id: 1,
            uom: { name: 'Kilogram', symbol: 'kg' },
            item: { sku: 'SAL-001', name: 'Salt' },
            last_unit_cost: 5.0, min_stock: 10,
        }],
        isLoading: false,
    }),
    useUnitsOfMeasureSelect: () => ({
        data: [{ id: 1, name: 'Kilogram', symbol: 'kg', type: 'WEIGHT' }],
        isLoading: false,
    }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    stockMovementApi: { stockOut: vi.fn().mockResolvedValue({}) },
    stockApi: { byVariant: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}))

// Mock toast provider with stable references
const mockShowWarning = vi.fn()
const mockShowError = vi.fn()
const mockShowSuccess = vi.fn()
const mockToast = {
    showWarning: mockShowWarning,
    showError: mockShowError,
    showSuccess: mockShowSuccess,
}

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => mockToast,
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
    beforeEach(() => { vi.clearAllMocks() })
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
        const { container } = render(<StockOutForm {...defaultProps} preselectedLocationId={1} />)
        expect(container.querySelector('form')).toBeDefined()
    })

    it('accepts preselectedVariantId prop', () => {
        const { container } = render(<StockOutForm {...defaultProps} preselectedVariantId={1} />)
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
})
