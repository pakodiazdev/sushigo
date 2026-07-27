/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateAdjustmentDialog } from '../create-adjustment-dialog'

// Mock the hooks
vi.mock('@/services/cash-hooks', () => ({
    useCashSessions: vi.fn().mockReturnValue({
        data: {
            data: [
                { id: '1', operating_date: '2025-01-15', cash_register: { name: 'Caja 1' } },
            ],
        },
        isLoading: false,
    }),
    useCashTerminals: vi.fn().mockReturnValue({
        data: {
            data: [
                { id: '1', name: 'Terminal 1', provider: 'Clip', is_active: true },
            ],
        },
    }),
    useBankAccounts: vi.fn().mockReturnValue({
        data: {
            data: [
                { id: '1', alias: 'Cuenta Principal', bank_name: 'BBVA', is_active: true },
            ],
        },
    }),
    useCreateCashAdjustment: vi.fn().mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
    }),
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe('CreateAdjustmentDialog', () => {
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    it('renders when open', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Registrar Ajuste de Caja')).toBeDefined()
    })

    it('does not render content when closed', () => {
        const { container } = render(
            <CreateAdjustmentDialog
                isOpen={false}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(container.textContent).not.toContain('Registrar Ajuste de Caja')
    })

    it('displays session selector label', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Sesión de Caja')).toBeDefined()
    })

    it('displays type selector label', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Tipo de Ajuste')).toBeDefined()
    })

    it('displays direction selector label', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Dirección')).toBeDefined()
    })

    it('renders submit button', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByRole('button', { name: /registrar/i })).toBeDefined()
    })

    it('renders cancel button', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByRole('button', { name: /cancelar/i })).toBeDefined()
    })

    it('renders add line button', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText(/Agregar Línea/i)).toBeDefined()
    })

    it('adds a new line when "Agregar Línea" is clicked', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        const addButton = screen.getByText(/Agregar Línea/i)
        const initialAmountInputs = screen.getAllByPlaceholderText('0.00')
        fireEvent.click(addButton)
        const updatedAmountInputs = screen.getAllByPlaceholderText('0.00')
        expect(updatedAmountInputs.length).toBe(initialAmountInputs.length + 1)
    })

    it('removes a line and keeps the remaining line values when there is more than one line', () => {
        const { container } = render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        const addButton = screen.getByText(/Agregar Línea/i)
        fireEvent.click(addButton)

        const amountInputs = screen.getAllByPlaceholderText('0.00')
        fireEvent.change(amountInputs[0]!, { target: { value: '100' } })
        fireEvent.change(amountInputs[1]!, { target: { value: '200' } })

        const removeButtons = container.querySelectorAll('button.text-red-600')
        expect(removeButtons.length).toBe(2)
        fireEvent.click(removeButtons[0]!)

        const remainingAmountInputs = screen.getAllByPlaceholderText('0.00')
        expect(remainingAmountInputs.length).toBe(1)
        expect((remainingAmountInputs[0] as HTMLInputElement).value).toBe('200')
    })

    it('shows the terminal selector and allows picking a terminal for CARD tender type', () => {
        const { container } = render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
                cashSessionId={'1'}
            />,
            { wrapper: createWrapper() },
        )

        const tenderTypeSelect = container.querySelectorAll('select')[2]!
        fireEvent.change(tenderTypeSelect, { target: { value: 'CARD' } })

        expect(screen.getByText('Terminal de Pago')).toBeDefined()

        const terminalSelect = screen.getByText('Terminal de Pago')
            .closest('div')!
            .querySelector('select')!
        fireEvent.change(terminalSelect, { target: { value: '1' } })

        expect((terminalSelect as HTMLSelectElement).value).toBe('1')
    })

    it('shows the bank account selector and allows picking an account for TRANSFER tender type', () => {
        const { container } = render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
                cashSessionId={'1'}
            />,
            { wrapper: createWrapper() },
        )

        const tenderTypeSelect = container.querySelectorAll('select')[2]!
        fireEvent.change(tenderTypeSelect, { target: { value: 'TRANSFER' } })

        expect(screen.getByText('Cuenta Bancaria')).toBeDefined()

        const bankAccountSelect = screen.getByText('Cuenta Bancaria')
            .closest('div')!
            .querySelector('select')!
        fireEvent.change(bankAccountSelect, { target: { value: '1' } })

        expect((bankAccountSelect as HTMLSelectElement).value).toBe('1')
    })

    it('renders preselected session without session selector', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
                cashSessionId={'1'}
            />,
            { wrapper: createWrapper() },
        )

        // With preselected session, session selector should not be visible
        expect(screen.queryByText('Sesión de Caja')).toBeNull()
    })

    it('shows source system field for EXTERNAL_IMPORT type by default', () => {
        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        // EXTERNAL_IMPORT is default, so source system field should be visible
        expect(screen.getByPlaceholderText(/POS, UBER_EATS, RAPPI/i)).toBeDefined()
    })

    it('submits form and calls onSuccess/onClose when valid', async () => {
        const mockMutateAsync = vi.fn().mockResolvedValue({})
        const { useCreateCashAdjustment } = await import('@/services/cash-hooks')
        vi.mocked(useCreateCashAdjustment).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useCreateCashAdjustment>)

        render(
            <CreateAdjustmentDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
                cashSessionId={'1'}
            />,
            { wrapper: createWrapper() },
        )

        const amountInput = screen.getByPlaceholderText('0.00')
        fireEvent.change(amountInput, { target: { value: '100' } })

        const submitButton = screen.getByRole('button', { name: /registrar/i })
        await act(async () => {
            fireEvent.click(submitButton)
        })

        expect(mockMutateAsync).toHaveBeenCalled()
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
    })
})
