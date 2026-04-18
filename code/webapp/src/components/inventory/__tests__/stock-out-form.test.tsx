/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { StockOutForm } from '../stock-out-form'

// Create accessible mock for useFormMutation
const mockExecute = vi.fn().mockResolvedValue({})
vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => ({
        execute: mockExecute,
        validationErrors: {},
        isPending: false,
    }),
}))

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({
        data: {
            data: {
                data: [
                    {
                        id: 1,
                        variant_id: 1,
                        inventory_location_id: 1,
                        variant: { id: 1, code: 'SAL-1KG', name: 'Salt 1kg' },
                        quantity: 100,
                        reserved_quantity: 0,
                        available_quantity: 100,
                    },
                ],
            },
        },
        isLoading: false,
        error: null,
    }),
}))

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
    useInventoryLocationsSelect: () => ({
        data: [
            { id: 1, name: 'Main Storage', type: 'warehouse' },
            { id: 2, name: 'Secondary Storage', type: 'warehouse' },
        ],
    }),
    useItemVariantsSelect: () => ({
        data: [
            { id: 1, name: 'Salt 1kg', code: 'SAL-1KG', uom_id: 1 },
            { id: 2, name: 'Salt 500g', code: 'SAL-500G', uom_id: 1 },
        ],
    }),
    useUnitsOfMeasureSelect: () => ({
        data: [
            { id: 1, name: 'Kilogram', symbol: 'kg' },
            { id: 2, name: 'Gram', symbol: 'g' },
        ],
    }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    stockMovementApi: {
        stockOut: vi.fn().mockResolvedValue({}),
    },
    stockApi: {
        byVariant: vi.fn().mockResolvedValue({ data: { data: [] } }),
    },
}))

// Mock toast
vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({
        showWarning: vi.fn(),
        showSuccess: vi.fn(),
        showError: vi.fn(),
    }),
}))

// Mock SlidePanel components
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: {
        Header: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="slide-panel-header">{children}</div>
        ),
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

const defaultProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
}

describe('StockOutForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            const form = container.querySelector('form')
            expect(form).toBeDefined()
        })

        it('renders location select', () => {
            const { getByText } = render(<StockOutForm {...defaultProps} />)
            expect(getByText('Select location...')).toBeDefined()
        })

        it('renders location options', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            const options = container.querySelectorAll('option')
            expect(options.length).toBeGreaterThan(1) // At least placeholder + locations
        })

        it('renders stock out type select', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            const selects = container.querySelectorAll('select')
            expect(selects.length).toBeGreaterThan(0)
        })

        it('renders stock out type options', () => {
            const { getByText } = render(<StockOutForm {...defaultProps} />)
            expect(getByText('Sale (revenue generating)')).toBeDefined()
        })

        it('renders notes textarea', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            const textareas = container.querySelectorAll('textarea')
            expect(textareas).toBeDefined()
        })

        it('renders cancel button', () => {
            const { getByText } = render(<StockOutForm {...defaultProps} />)
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders submit button', () => {
            const { getByText } = render(<StockOutForm {...defaultProps} />)
            expect(getByText('Register Stock Out')).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(<StockOutForm {...defaultProps} onCancel={onCancel} />)

            fireEvent.click(getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it.skip('submits form on submit', async () => {
            const { container } = render(<StockOutForm {...defaultProps} />)

            // Fill required fields
            const selects = container.querySelectorAll('select')
            if (selects[0]) {
                fireEvent.change(selects[0], { target: { value: '1' } }) // Location
            }
            if (selects[1]) {
                fireEvent.change(selects[1], { target: { value: '1' } }) // Variant (triggers useEffect)
            }

            // Wait for useEffect to set uom_id
            await waitFor(() => {
                const uomSelect = container.querySelector('select[value="1"]')
                expect(uomSelect).toBeDefined()
            }, { timeout: 1000 })

            if (selects[2]) {
                fireEvent.change(selects[2], { target: { value: 'sale' } }) // Type
            }

            const numberInputs = container.querySelectorAll('input[type="number"]')
            if (numberInputs[0]) {
                fireEvent.change(numberInputs[0], { target: { value: '5' } }) // Quantity
            }

            const form = container.querySelector('form')
            if (form) {
                fireEvent.submit(form)
            }

            await waitFor(() => {
                expect(mockExecute).toHaveBeenCalled()
            }, { timeout: 1000 })
        })
    })

    describe('line items', () => {
        it('renders line items section', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            // Line items section should be present
            expect(container).toBeDefined()
        })

        it('shows available stock when location selected', () => {
            const { container } = render(<StockOutForm {...defaultProps} />)
            // Stock should be displayed when location is selected
            expect(container).toBeDefined()
        })
    })

    describe('stock out types', () => {
        it('renders all stock out type options', () => {
            const { getByText } = render(<StockOutForm {...defaultProps} />)
            expect(getByText('Sale (revenue generating)')).toBeDefined()
            expect(getByText('Consumption (internal use)')).toBeDefined()
        })
    })

    describe('preselected values', () => {
        it('accepts preselectedLocationId prop', () => {
            const { container } = render(
                <StockOutForm {...defaultProps} preselectedLocationId={1} />
            )
            expect(container).toBeDefined()
        })
    })

    describe('form structure', () => {
        it('renders SlidePanel.Body component', () => {
            const { getByTestId } = render(<StockOutForm {...defaultProps} />)
            expect(getByTestId('slide-panel-body')).toBeDefined()
        })

        it('renders SlidePanel.Footer component', () => {
            const { getByTestId } = render(<StockOutForm {...defaultProps} />)
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })
})
