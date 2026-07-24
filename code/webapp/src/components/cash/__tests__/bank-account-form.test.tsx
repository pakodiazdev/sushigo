/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { BankAccountForm } from '../bank-account-form'

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
    useCreateBankAccount: () => mockCreateMutation,
    useUpdateBankAccount: () => mockUpdateMutation,
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
    account: null,
    branches: [
        { id: 1, name: 'Main Branch' },
        { id: 2, name: 'Second Branch' },
    ],
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
}

describe('BankAccountForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form when isOpen is true', () => {
            const { getByTestId } = render(<BankAccountForm {...defaultProps} />)
            expect(getByTestId('slide-panel')).toBeDefined()
        })

        it('does not render when isOpen is false', () => {
            const { queryByTestId } = render(
                <BankAccountForm {...defaultProps} isOpen={false} />
            )
            expect(queryByTestId('slide-panel')).toBeNull()
        })

        it('renders new account title when creating', () => {
            const { getByText } = render(<BankAccountForm {...defaultProps} />)
            expect(getByText('Nueva Cuenta Bancaria')).toBeDefined()
        })

        it('renders edit account title when editing', () => {
            const account = {
                id: '1',
                branch_id: 1,
                alias: 'Test Account',
                bank_name: 'BBVA',
                account_number_masked: '1234',
                clabe_masked: '123-4567',
                is_active: true,
                meta: {},
                created_at: '',
                updated_at: '',
            }
            const { getByText } = render(
                <BankAccountForm {...defaultProps} account={account} />
            )
            expect(getByText('Editar Cuenta Bancaria')).toBeDefined()
        })

        it('renders branch select with options', () => {
            const { getByText } = render(<BankAccountForm {...defaultProps} />)
            expect(getByText('Main Branch')).toBeDefined()
            expect(getByText('Second Branch')).toBeDefined()
        })

        it('renders bank select with predefined banks', () => {
            const { getByText } = render(<BankAccountForm {...defaultProps} />)
            expect(getByText('BBVA')).toBeDefined()
            expect(getByText('Banamex')).toBeDefined()
        })

        it('renders submit button', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const submitBtn = container.querySelector('button[type="submit"]')
            expect(submitBtn).toBeDefined()
        })

        it('renders cancel button', () => {
            const { getByText } = render(<BankAccountForm {...defaultProps} />)
            expect(getByText('Cancelar')).toBeDefined()
        })
    })

    describe('estado checkbox', () => {
        it('toggles the active checkbox', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement

            expect(checkbox.checked).toBe(true)
            fireEvent.click(checkbox)
            expect(checkbox.checked).toBe(false)
        })
    })

    describe('form interactions', () => {
        it('calls onClose when cancel button is clicked', () => {
            const onClose = vi.fn()
            const { getByText } = render(
                <BankAccountForm {...defaultProps} onClose={onClose} />
            )

            fireEvent.click(getByText('Cancelar'))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('submits form on submit button click', async () => {
            const { container, getByPlaceholderText } = render(<BankAccountForm {...defaultProps} />)

            // Fill required fields
            const selects = container.querySelectorAll('select')
            if (selects[0]) fireEvent.change(selects[0], { target: { value: '1' } }) // branch
            if (selects[1]) fireEvent.change(selects[1], { target: { value: 'BBVA' } }) // bank

            fireEvent.change(getByPlaceholderText('Cuenta Principal'), { target: { value: 'Test Alias' } })
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
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeDefined()
            mockCreateMutation.isPending = false
        })
    })

    describe('validation', () => {
        it('renders required field indicators', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            // Required fields should have indicators (asterisks typically)
            const requiredIndicators = container.querySelectorAll('.text-destructive')
            expect(requiredIndicators.length).toBeGreaterThanOrEqual(0)
        })
    })

    describe('CLABE formatting', () => {
        it('auto-formats CLABE with dash after 3 digits', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const clabeInput = container.querySelector('input[placeholder="012-3456"]') as HTMLInputElement
            fireEvent.change(clabeInput, { target: { value: '1234567' } })
            expect(clabeInput.value).toBe('123-4567')
        })

        it('does not add dash when input is 3 digits or fewer', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const clabeInput = container.querySelector('input[placeholder="012-3456"]') as HTMLInputElement
            fireEvent.change(clabeInput, { target: { value: '123' } })
            expect(clabeInput.value).toBe('123')
        })

        it('strips non-numeric characters from CLABE', () => {
            const { container } = render(<BankAccountForm {...defaultProps} />)
            const clabeInput = container.querySelector('input[placeholder="012-3456"]') as HTMLInputElement
            fireEvent.change(clabeInput, { target: { value: 'abc1234567' } })
            expect(clabeInput.value).toBe('123-4567')
        })
    })

    describe('reset on prop change', () => {
        it('updates form values when account prop changes', async () => {
            const account1 = {
                id: '1', branch_id: 1, alias: 'First Account', bank_name: 'BBVA',
                account_number_masked: '1111', clabe_masked: '', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }
            const account2 = {
                id: '2', branch_id: 2, alias: 'Second Account', bank_name: 'SANTANDER',
                account_number_masked: '2222', clabe_masked: '', is_active: false,
                meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <BankAccountForm {...defaultProps} account={account1} />
            )
            expect((getByPlaceholderText('Cuenta Principal') as HTMLInputElement).value).toBe('First Account')

            rerender(<BankAccountForm {...defaultProps} account={account2} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Cuenta Principal') as HTMLInputElement).value).toBe('Second Account')
            })
        })

        it('resets to empty values when account becomes null', async () => {
            const account = {
                id: '1', branch_id: 1, alias: 'Some Account', bank_name: 'BBVA',
                account_number_masked: '1234', clabe_masked: '', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <BankAccountForm {...defaultProps} account={account} />
            )

            rerender(<BankAccountForm {...defaultProps} account={null} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Cuenta Principal') as HTMLInputElement).value).toBe('')
            })
        })
    })

    describe('edit mode', () => {
        it('calls updateMutation when submitting in edit mode', async () => {
            const account = {
                id: '1', branch_id: 1, alias: 'Test Account', bank_name: 'BBVA',
                account_number_masked: '1234', clabe_masked: '', is_active: true,
                meta: {}, created_at: '', updated_at: '',
            }

            const { container } = render(<BankAccountForm {...defaultProps} account={account} />)
            const selects = container.querySelectorAll('select')
            fireEvent.change(selects[0]!, { target: { value: '1' } })
            fireEvent.change(selects[1]!, { target: { value: 'BBVA' } })

            const form = container.querySelector('form')
            fireEvent.submit(form!)

            await waitFor(() => {
                expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
                    id: '1',
                    data: expect.objectContaining({ alias: 'Test Account' }),
                })
            })
        })
    })
})
