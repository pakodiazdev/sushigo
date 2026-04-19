/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpenSessionDialog } from '../open-session-dialog'

// Mock the hooks
vi.mock('@/services/cash-hooks', () => ({
    useCashRegisters: vi.fn().mockReturnValue({
        data: {
            data: [
                { id: 1, name: 'Caja Principal', type: 'PHYSICAL', is_active: true },
                { id: 2, name: 'Caja Secundaria', type: 'PHYSICAL', is_active: true },
            ],
        },
        isLoading: false,
    }),
    useCreateCashSession: vi.fn().mockReturnValue({
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

describe('OpenSessionDialog', () => {
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
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Abrir Sesión de Caja')).toBeDefined()
    })

    it('does not render content when closed', () => {
        const { container } = render(
            <OpenSessionDialog
                isOpen={false}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        // When closed, the dialog should not show content
        expect(container.textContent).not.toContain('Abrir Sesión de Caja')
    })

    it('displays operating date label', () => {
        render(
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Fecha de Operación')).toBeDefined()
    })

    it('displays opening balance label', () => {
        render(
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Fondo Inicial (Opcional)')).toBeDefined()
    })

    it('displays cash register selector label', () => {
        render(
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Caja Registradora')).toBeDefined()
    })

    it('renders submit button', () => {
        render(
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByRole('button', { name: /abrir sesión/i })).toBeDefined()
    })

    it('renders cancel button', () => {
        render(
            <OpenSessionDialog
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByRole('button', { name: /cancelar/i })).toBeDefined()
    })
})
