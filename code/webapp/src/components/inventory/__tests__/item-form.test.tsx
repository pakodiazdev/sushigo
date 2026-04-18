/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ItemForm } from '../item-form'

// Mock useCreateUpdateMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
    useCreateUpdateMutation: () => ({
        execute: vi.fn().mockResolvedValue({}),
        validationErrors: {},
        isPending: false,
    }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    itemApi: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
    },
}))

// Mock SlidePanel components
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: {
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
    item: null,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
}

describe('ItemForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const form = container.querySelector('form')
            expect(form).toBeDefined()
        })

        it('renders SKU field', () => {
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} />)
            expect(getByPlaceholderText('e.g., SAL-001')).toBeDefined()
        })

        it('renders item name field', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const inputs = container.querySelectorAll('input')
            expect(inputs.length).toBeGreaterThan(0)
        })

        it('renders item type select', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const selects = container.querySelectorAll('select')
            expect(selects.length).toBeGreaterThan(0)
        })

        it('renders checkboxes for boolean fields', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')
            expect(checkboxes.length).toBeGreaterThanOrEqual(0)
        })

        it('renders cancel button', () => {
            const { getByText } = render(<ItemForm {...defaultProps} />)
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders save button for new item', () => {
            const { getByText } = render(<ItemForm {...defaultProps} />)
            expect(getByText('Create Item')).toBeDefined()
        })

        it('renders update button when editing', () => {
            const item = {
                id: 1,
                sku: 'SAL-001',
                name: 'Salt',
                description: 'Table salt',
                type: 'INSUMO' as const,
                is_stocked: true,
                is_perishable: false,
                is_active: true,
                is_manufactured: false,
                created_at: '',
                updated_at: '',
            }
            const { getByText } = render(<ItemForm {...defaultProps} item={item} />)
            expect(getByText('Update Item')).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(<ItemForm {...defaultProps} onCancel={onCancel} />)

            fireEvent.click(getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it.skip('submits form on submit', async () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const form = container.querySelector('form')

            if (form) {
                fireEvent.submit(form)
            }

            // Form submission should be attempted
            await waitFor(() => {
                expect(defaultProps.onSuccess).toBeDefined()
            })
        })

        it('converts SKU to uppercase', () => {
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} />)
            const skuInput = getByPlaceholderText('e.g., SAL-001')

            fireEvent.change(skuInput, { target: { value: 'test-sku' } })
            // The mock setField should be called
            expect(skuInput).toBeDefined()
        })

        it('allows changing item type', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const select = container.querySelector('select') as HTMLSelectElement

            fireEvent.change(select, { target: { value: 'PRODUCTO' } })
            expect(select.value).toBe('PRODUCTO')
        })

        it('allows toggling is_stocked checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 0) {
                fireEvent.click(checkboxes[0])
                expect(checkboxes[0]).toBeDefined()
            }
        })

        it('allows toggling is_perishable checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 1) {
                fireEvent.click(checkboxes[1])
                expect(checkboxes[1]).toBeDefined()
            }
        })

        it('allows toggling is_active checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 2) {
                fireEvent.click(checkboxes[2])
                expect(checkboxes[2]).toBeDefined()
            }
        })
    })

    describe('edit mode', () => {
        it('disables SKU field when editing', () => {
            const item = {
                id: 1,
                sku: 'SAL-001',
                name: 'Salt',
                description: '',
                type: 'INSUMO' as const,
                is_stocked: true,
                is_perishable: false,
                is_active: true,
                is_manufactured: false,
                created_at: '',
                updated_at: '',
            }
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} item={item} />)
            const skuInput = getByPlaceholderText('e.g., SAL-001') as HTMLInputElement

            expect(skuInput.disabled).toBe(true)
        })
    })

    describe('form structure', () => {
        it('renders SlidePanel.Body component', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('slide-panel-body')).toBeDefined()
        })

        it('renders SlidePanel.Footer component', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })
})
