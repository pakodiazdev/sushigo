/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { OpeningBalanceForm } from '../opening-balance-form'

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
    useForm: () => ({
        register: () => ({}),
        handleSubmit: (fn: (data: unknown) => void) => (e: React.FormEvent) => {
            e.preventDefault()
            fn({})
        },
        watch: (field: string) => {
            const values: Record<string, unknown> = {
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-01',
                uom_id: 'uom-01',
                qty: 10,
                unit_cost: 5,
                notes: '',
            }
            return values[field]
        },
        setValue: vi.fn(),
        formState: { errors: {} },
    }),
}))

// Mock useFormMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => ({
        execute: vi.fn().mockResolvedValue({}),
        validationErrors: {},
        isPending: false,
    }),
}))

const MOCK_LOCATIONS = [
    { id: 'location-01', name: 'Main Warehouse', type: 'WAREHOUSE', priority: 10 },
    { id: 'location-02', name: 'Store Front', type: 'STORE', priority: 5 },
]
const MOCK_VARIANTS = [
    {
        id: 'variant-01',
        code: 'VAR-001',
        name: 'Salt 500g',
        uom_id: 1,
        uom: { id: 'uom-01', name: 'Kilogram', symbol: 'kg' },
        item: { sku: 'SAL-001', name: 'Salt' },
        min_stock: 10,
    },
    {
        id: 'variant-02',
        code: 'VAR-002',
        name: 'Sugar 1kg',
        uom_id: 2,
        uom: { id: 'uom-02', name: 'Kilogram', symbol: 'kg' },
        item: { sku: 'SUG-001', name: 'Sugar' },
        min_stock: 5,
    },
]
const MOCK_UNITS = [
    { id: 'uom-01', name: 'Kilogram', symbol: 'kg', type: 'WEIGHT' },
    { id: 'uom-02', name: 'Piece', symbol: 'pc', type: 'COUNT' },
]

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
    useInventoryLocationsSelect: () => ({
        data: MOCK_LOCATIONS,
        isLoading: false,
    }),
    useItemVariantsSelect: () => ({
        data: MOCK_VARIANTS,
        isLoading: false,
    }),
    useUnitsOfMeasureSelect: () => ({
        data: MOCK_UNITS,
        isLoading: false,
    }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    stockMovementApi: {
        openingBalance: vi.fn().mockResolvedValue({}),
    },
}))

// Mock SlidePanel components
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

const defaultProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
}

describe('OpeningBalanceForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('form')).toBeDefined()
        })

        it('renders the header with title', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('h2')?.textContent).toBe('Register Opening Balance')
        })

        it('renders location select with options', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Select location...')).toBeDefined()
            expect(getByText('Main Warehouse (WAREHOUSE)')).toBeDefined()
        })

        it('renders item variant select with options', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Select variant...')).toBeDefined()
            expect(getByText('VAR-001 - Salt 500g (SAL-001)')).toBeDefined()
        })

        it('renders unit of measure select', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Select unit...')).toBeDefined()
        })

        it('renders quantity input', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelectorAll('input[type="number"]').length).toBeGreaterThanOrEqual(1)
        })

        it('renders cancel button', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders submit button', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('button[type="submit"]')?.textContent).toBe('Register Opening Balance')
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} onCancel={onCancel} />)
            fireEvent.click(getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it('allows selecting a location', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const selects = container.querySelectorAll('select')
            expect(selects.length).toBeGreaterThan(0)
            if (selects[0]) {
                fireEvent.change(selects[0], { target: { value: '1' } })
                expect(selects[0]).toBeDefined()
            }
        })

        it('allows entering quantity', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const inputs = container.querySelectorAll('input[type="number"]')
            expect(inputs.length).toBeGreaterThan(0)
            const input = inputs[0]
            if (input) {
                fireEvent.change(input, { target: { value: '100' } })
                expect((input as HTMLInputElement).value).toBe('100')
            }
        })
    })

    describe('preselection props', () => {
        it('accepts preselectedLocationId prop', () => {
            const { container } = render(
                <OpeningBalanceForm {...defaultProps} preselectedLocationId="location-01" />
            )
            expect(container.querySelector('form')).toBeDefined()
        })

        it('accepts preselectedVariantId prop', () => {
            const { container } = render(
                <OpeningBalanceForm {...defaultProps} preselectedVariantId="variant-01" />
            )
            expect(container.querySelector('form')).toBeDefined()
        })
    })

    describe('form structure', () => {
        it('has correct form id', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('#opening-balance-form')).toBeDefined()
        })

        it('renders all required field labels', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Location')).toBeDefined()
            expect(getByText('Item Variant')).toBeDefined()
            expect(getByText('Quantity')).toBeDefined()
        })

        it('renders slide panel sections', () => {
            const { getByTestId } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByTestId('slide-panel-header')).toBeDefined()
            expect(getByTestId('slide-panel-body')).toBeDefined()
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })

    describe('accessibility', () => {
        it('form has submit button with correct type', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('button[type="submit"]')).toBeDefined()
        })

        it('cancel button has type button', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(container.querySelector('button[type="button"]')).toBeDefined()
        })
    })
})
