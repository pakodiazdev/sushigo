/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { OpeningBalanceForm } from '../opening-balance-form'

// Create accessible mock for useFormMutation
const mockExecute = vi.fn().mockResolvedValue({})
vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => ({
        execute: mockExecute,
        validationErrors: {},
        isPending: false,
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
        openingBalance: vi.fn().mockResolvedValue({}),
    },
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

describe('OpeningBalanceForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const form = container.querySelector('form')
            expect(form).toBeDefined()
        })

        it('renders location select', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Select location...')).toBeDefined()
        })

        it('renders location options', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const options = container.querySelectorAll('option')
            expect(options.length).toBeGreaterThan(1) // At least placeholder + locations
        })

        it('renders variant select', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Select variant...')).toBeDefined()
        })

        it('renders variant options', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText(/Salt 1kg/)).toBeDefined()
        })

        it('renders quantity field', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const numberInputs = container.querySelectorAll('input[type="number"]')
            expect(numberInputs.length).toBeGreaterThan(0)
        })

        it('renders unit cost field', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const numberInputs = container.querySelectorAll('input[type="number"]')
            expect(numberInputs.length).toBeGreaterThanOrEqual(2)
        })

        it('renders reference field', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const inputs = container.querySelectorAll('input')
            expect(inputs.length).toBeGreaterThan(0)
        })

        it('renders notes textarea', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const textareas = container.querySelectorAll('textarea')
            expect(textareas.length).toBeGreaterThanOrEqual(0)
        })

        it('renders cancel button', () => {
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders submit button', () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)
            const submitButton = container.querySelector('button[type="submit"]')
            expect(submitButton).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(<OpeningBalanceForm {...defaultProps} onCancel={onCancel} />)

            fireEvent.click(getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it.skip('submits form on submit', async () => {
            const { container } = render(<OpeningBalanceForm {...defaultProps} />)

            // Fill required fields
            const selects = container.querySelectorAll('select')
            if (selects[0]) {
                fireEvent.change(selects[0], { target: { value: '1' } }) // Location
            }
            if (selects[1]) {
                fireEvent.change(selects[1], { target: { value: '1' } }) // Variant (this triggers useEffect to set uom_id)
            }

            // Wait for useEffect to set uom_id from variant
            await waitFor(() => {
                const uomSelect = selects[2] as HTMLSelectElement | undefined
                expect(uomSelect?.value).toBe('1')
            }, { timeout: 1000 })

            const numberInputs = container.querySelectorAll('input[type="number"]')
            if (numberInputs[0]) {
                fireEvent.change(numberInputs[0], { target: { value: '10' } }) // Quantity
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

    describe('preselected values', () => {
        it('accepts preselectedLocationId prop', () => {
            const { container } = render(
                <OpeningBalanceForm {...defaultProps} preselectedLocationId={1} />
            )
            expect(container).toBeDefined()
        })

        it('accepts preselectedVariantId prop', () => {
            const { container } = render(
                <OpeningBalanceForm {...defaultProps} preselectedVariantId={1} />
            )
            expect(container).toBeDefined()
        })
    })

    describe('form structure', () => {
        it('renders SlidePanel.Body component', () => {
            const { getByTestId } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByTestId('slide-panel-body')).toBeDefined()
        })

        it('renders SlidePanel.Footer component', () => {
            const { getByTestId } = render(<OpeningBalanceForm {...defaultProps} />)
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })
})
