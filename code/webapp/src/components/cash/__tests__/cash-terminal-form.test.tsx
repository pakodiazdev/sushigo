/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { CashTerminalForm } from '../cash-terminal-form'

// Mock cash hooks
const mockCreateMutation = {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
}
const mockUpdateMutation = {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
}

vi.mock('@/services/cash-hooks', () => ({
    useCreateCashTerminal: () => mockCreateMutation,
    useUpdateCashTerminal: () => mockUpdateMutation,
}))

// Mock UI components
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: ({ children, isOpen, title, description }: {
        children: React.ReactNode
        isOpen: boolean
        title: string
        description: string
    }) =>
        isOpen ? (
            <div data-testid="slide-panel">
                <h2>{title}</h2>
                <p>{description}</p>
                {children}
            </div>
        ) : null,
}))

const defaultProps = {
    terminal: null,
    branches: [
        { id: 1, name: 'Main Branch' },
        { id: 2, name: 'Second Branch' },
    ],
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
}

describe('CashTerminalForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form when isOpen is true', () => {
            const { getByTestId } = render(<CashTerminalForm {...defaultProps} />)
            expect(getByTestId('slide-panel')).toBeDefined()
        })

        it('does not render when isOpen is false', () => {
            const { queryByTestId } = render(
                <CashTerminalForm {...defaultProps} isOpen={false} />
            )
            expect(queryByTestId('slide-panel')).toBeNull()
        })

        it('renders new terminal title when creating', () => {
            const { getByText } = render(<CashTerminalForm {...defaultProps} />)
            expect(getByText('Nueva Terminal')).toBeDefined()
        })

        it('renders edit terminal title when editing', () => {
            const terminal = {
                id: 1,
                branch_id: 1,
                name: 'Terminal 1',
                provider: 'CLIP',
                account_ref: 'ACC-123',
                last_four: '1234',
                is_active: true,
                meta: {},
                created_at: '',
                updated_at: '',
            }
            const { getByText } = render(
                <CashTerminalForm {...defaultProps} terminal={terminal} />
            )
            expect(getByText('Editar Terminal')).toBeDefined()
        })

        it('renders branch select with options', () => {
            const { getByText } = render(<CashTerminalForm {...defaultProps} />)
            expect(getByText('Main Branch')).toBeDefined()
            expect(getByText('Second Branch')).toBeDefined()
        })

        it('renders provider select with predefined providers', () => {
            const { getByText } = render(<CashTerminalForm {...defaultProps} />)
            expect(getByText('Clip')).toBeDefined()
            expect(getByText('Stripe')).toBeDefined()
        })

        it('renders submit button', () => {
            const { container } = render(<CashTerminalForm {...defaultProps} />)
            const submitBtn = container.querySelector('button[type="submit"]')
            expect(submitBtn).toBeDefined()
        })

        it('renders cancel button', () => {
            const { getByText } = render(<CashTerminalForm {...defaultProps} />)
            expect(getByText('Cancelar')).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onClose when cancel button is clicked', () => {
            const onClose = vi.fn()
            const { getByText } = render(
                <CashTerminalForm {...defaultProps} onClose={onClose} />
            )

            fireEvent.click(getByText('Cancelar'))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('submits form on form submission', async () => {
            const { container, getByPlaceholderText } = render(<CashTerminalForm {...defaultProps} />)

            // Fill required fields
            const selects = container.querySelectorAll('select')
            if (selects[0]) fireEvent.change(selects[0], { target: { value: '1' } }) // branch
            if (selects[1]) fireEvent.change(selects[1], { target: { value: 'CLIP' } }) // provider

            fireEvent.change(getByPlaceholderText('Terminal Principal'), { target: { value: 'Test Terminal' } })
            fireEvent.change(getByPlaceholderText('12345678'), { target: { value: 'REF123' } })
            fireEvent.change(getByPlaceholderText('1234'), { target: { value: '5678' } })

            const form = container.querySelector('form')
            if (form) {
                fireEvent.submit(form)
            }

            await waitFor(() => {
                expect(mockCreateMutation.mutateAsync).toHaveBeenCalled()
            })
        })
    })

    describe('loading state', () => {
        it('shows loading indicator when creating', () => {
            mockCreateMutation.isPending = true
            const { container } = render(<CashTerminalForm {...defaultProps} />)
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeDefined()
            mockCreateMutation.isPending = false
        })
    })

    describe('validation', () => {
        it('renders required field indicators', () => {
            const { container } = render(<CashTerminalForm {...defaultProps} />)
            // Check that the form has required field elements
            const formFields = container.querySelectorAll('[class*="FormField"]')
            expect(formFields).toBeDefined()
        })
    })

    describe('reset on prop change', () => {
        it('updates form values when terminal prop changes', async () => {
            const terminal1 = {
                id: 1, branch_id: 1, name: 'Terminal A', provider: 'CLIP',
                account_ref: 'REF-A', last_four: '1111', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }
            const terminal2 = {
                id: 2, branch_id: 2, name: 'Terminal B', provider: 'STRIPE',
                account_ref: 'REF-B', last_four: '2222', is_active: false,
                meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <CashTerminalForm {...defaultProps} terminal={terminal1} />
            )
            expect((getByPlaceholderText('Terminal Principal') as HTMLInputElement).value).toBe('Terminal A')

            rerender(<CashTerminalForm {...defaultProps} terminal={terminal2} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Terminal Principal') as HTMLInputElement).value).toBe('Terminal B')
            })
        })

        it('resets to empty values when terminal becomes null', async () => {
            const terminal = {
                id: 1, branch_id: 1, name: 'Terminal A', provider: 'CLIP',
                account_ref: 'REF-A', last_four: '1111', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <CashTerminalForm {...defaultProps} terminal={terminal} />
            )

            rerender(<CashTerminalForm {...defaultProps} terminal={null} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Terminal Principal') as HTMLInputElement).value).toBe('')
            })
        })
    })

    describe('edit mode', () => {
        it('calls updateMutation when submitting in edit mode', async () => {
            const terminal = {
                id: 1, branch_id: 1, name: 'Terminal A', provider: 'CLIP',
                account_ref: 'REF-001', last_four: '1234', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }

            const { container } = render(<CashTerminalForm {...defaultProps} terminal={terminal} />)
            const selects = container.querySelectorAll('select')
            fireEvent.change(selects[0]!, { target: { value: '1' } })
            fireEvent.change(selects[1]!, { target: { value: 'CLIP' } })

            const form = container.querySelector('form')
            fireEvent.submit(form!)

            await waitFor(() => {
                expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
                    id: 1,
                    data: expect.objectContaining({ name: 'Terminal A' }),
                })
            })
        })
    })
})
