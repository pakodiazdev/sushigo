/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WageHistorySection } from '../wage-history-section'

// Mock the hook
vi.mock('@/services/employee-hooks', () => ({
    useWageHistory: vi.fn().mockReturnValue({
        data: [
            {
                id: 1,
                employee_id: 'emp-1',
                amount: 5000,
                effective_date: '2025-01-01',
                wage_type: 'MONTHLY',
                is_current: true,
            },
            {
                id: 2,
                employee_id: 'emp-1',
                amount: 4500,
                effective_date: '2024-06-01',
                wage_type: 'MONTHLY',
                is_current: false,
            },
        ],
        isLoading: false,
        error: null,
    }),
    useCreateWage: vi.fn().mockReturnValue({
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

describe('WageHistorySection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    it('renders section title', () => {
        render(
            <WageHistorySection employeeId="emp-1" />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Historial de Salarios')).toBeDefined()
    })

    it('renders register wage button', () => {
        render(
            <WageHistorySection employeeId="emp-1" />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByRole('button', { name: /registrar salario/i })).toBeDefined()
    })

    it('shows form when register button is clicked', () => {
        render(
            <WageHistorySection employeeId="emp-1" />,
            { wrapper: createWrapper() },
        )

        const button = screen.getByRole('button', { name: /registrar salario/i })
        fireEvent.click(button)

        // Form should now be visible
        expect(screen.queryByRole('button', { name: /registrar salario/i })).toBeNull()
    })

    it('renders without crashing', () => {
        const { container } = render(
            <WageHistorySection employeeId="emp-1" />,
            { wrapper: createWrapper() },
        )

        expect(container).toBeDefined()
    })
})
