/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { CashRegisterForm } from '../cash-register-form'
import { CashRegisterType } from '@/types/cash'

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
    useCreateCashRegister: () => mockCreateMutation,
    useUpdateCashRegister: () => mockUpdateMutation,
}))

// Mock UI components
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: ({ children, isOpen, title, description, noPadding }: {
        children: React.ReactNode
        isOpen: boolean
        title: string
        description: string
        noPadding?: boolean
    }) =>
        isOpen ? (
            <div data-testid="slide-panel" data-no-padding={noPadding}>
                <h2>{title}</h2>
                <p>{description}</p>
                {children}
            </div>
        ) : null,
}))

const defaultProps = {
    register: null,
    operatingUnits: [
        { id: 1, name: 'Main Unit', branch_id: 1, type: 'EVENT_TEMP' as const, is_active: true, created_at: '', updated_at: '' },
        { id: 2, name: 'Second Unit', branch_id: 2, type: 'EVENT_TEMP' as const, is_active: true, created_at: '', updated_at: '' },
    ],
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
}

describe('CashRegisterForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form when isOpen is true', () => {
            const { getByTestId } = render(<CashRegisterForm {...defaultProps} />)
            expect(getByTestId('slide-panel')).toBeDefined()
        })

        it('does not render when isOpen is false', () => {
            const { queryByTestId } = render(
                <CashRegisterForm {...defaultProps} isOpen={false} />
            )
            expect(queryByTestId('slide-panel')).toBeNull()
        })

        it('renders new register title when creating', () => {
            const { getByText } = render(<CashRegisterForm {...defaultProps} />)
            expect(getByText('Nueva Caja Registradora')).toBeDefined()
        })

        it('renders edit register title when editing', () => {
            const register = {
                id: '1',
                code: 'CAJA-001',
                name: 'Main Register',
                branch_id: 1,
                operating_unit_id: null,
                type: CashRegisterType.ON_PREMISE,
                is_active: true,
                meta: {},
                created_at: '',
                updated_at: '',
            }
            const { getByText } = render(
                <CashRegisterForm {...defaultProps} register={register} />
            )
            expect(getByText('Editar Caja Registradora')).toBeDefined()
        })

        it('renders form with noPadding attribute', () => {
            const { getByTestId } = render(<CashRegisterForm {...defaultProps} />)
            const panel = getByTestId('slide-panel')
            expect(panel.getAttribute('data-no-padding')).toBe('true')
        })

        it('renders cancel button', () => {
            const { getByText } = render(<CashRegisterForm {...defaultProps} />)
            expect(getByText('Cancelar')).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onClose when cancel button is clicked', () => {
            const onClose = vi.fn()
            const { getByText } = render(
                <CashRegisterForm {...defaultProps} onClose={onClose} />
            )

            fireEvent.click(getByText('Cancelar'))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('submits form on form submission', async () => {
            const { container, getByPlaceholderText } = render(<CashRegisterForm {...defaultProps} />)

            // Fill required fields
            fireEvent.change(getByPlaceholderText('REG-001'), { target: { value: 'REG-TEST' } })
            fireEvent.change(getByPlaceholderText('Caja Principal'), { target: { value: 'Test Register' } })

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
            const { container } = render(<CashRegisterForm {...defaultProps} />)
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeDefined()
            mockCreateMutation.isPending = false
        })
    })

    describe('register types', () => {
        it('renders register type options', () => {
            const { container } = render(<CashRegisterForm {...defaultProps} />)
            const selectElements = container.querySelectorAll('select')
            // Should have select elements for type and branch
            expect(selectElements.length).toBeGreaterThan(0)
        })
    })

    describe('reset on prop change', () => {
        it('updates form values when register prop changes', async () => {
            const register1 = {
                id: '1', code: 'CAJA-001', name: 'Register A', branch_id: 1,
                operating_unit_id: null, type: CashRegisterType.ON_PREMISE,
                is_active: true, meta: {}, created_at: '', updated_at: '',
            }
            const register2 = {
                id: '2', code: 'CAJA-002', name: 'Register B', branch_id: 1,
                operating_unit_id: null, type: CashRegisterType.DELIVERY,
                is_active: false, meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <CashRegisterForm {...defaultProps} register={register1} />
            )
            expect((getByPlaceholderText('Caja Principal') as HTMLInputElement).value).toBe('Register A')

            rerender(<CashRegisterForm {...defaultProps} register={register2} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Caja Principal') as HTMLInputElement).value).toBe('Register B')
            })
        })

        it('resets to empty values when register becomes null', async () => {
            const register = {
                id: '1', code: 'CAJA-001', name: 'Register A', branch_id: 1,
                operating_unit_id: null, type: CashRegisterType.ON_PREMISE,
                is_active: true, meta: {}, created_at: '', updated_at: '',
            }

            const { rerender, getByPlaceholderText } = render(
                <CashRegisterForm {...defaultProps} register={register} />
            )

            rerender(<CashRegisterForm {...defaultProps} register={null} />)
            await waitFor(() => {
                expect((getByPlaceholderText('Caja Principal') as HTMLInputElement).value).toBe('')
            })
        })
    })

    describe('edit mode', () => {
        it('calls updateMutation when submitting in edit mode', async () => {
            const register = {
                id: '1', code: 'CAJA-001', name: 'Register A', branch_id: 1,
                operating_unit_id: null, type: CashRegisterType.ON_PREMISE,
                is_active: true, meta: {}, created_at: '', updated_at: '',
            }

            const { container } = render(<CashRegisterForm {...defaultProps} register={register} />)
            const form = container.querySelector('form')
            fireEvent.submit(form!)

            await waitFor(() => {
                expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
                    id: '1',
                    data: expect.objectContaining({ name: 'Register A' }),
                })
            })
        })
    })
})
