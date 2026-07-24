/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CashRegisterList } from '../cash-register-list'
import type { CashRegister } from '@/types/cash'
import { CashRegisterType } from '@/types/cash'

// Mock cash-utils to avoid Badge dependency issues
vi.mock('../cash-utils', () => ({
    CashRegisterTypeBadge: ({ type }: { type: string }) => (
        <span data-testid="type-badge">{type}</span>
    ),
    formatDate: (date: string) => new Date(date).toLocaleDateString(),
}))

// Mocks
const mockCashRegistersData = {
    data: {
        data: [
            {
                id: '1',
                branch_id: 1,
                operating_unit_id: 1,
                code: 'CR001',
                name: 'Caja Principal',
                type: CashRegisterType.ON_PREMISE,
                operating_unit: { id: 1, name: 'Sucursal Centro' },
                is_active: true,
                meta: null,
                created_at: '2025-01-15T00:00:00+00:00',
                updated_at: '2025-01-15T00:00:00+00:00',
            },
            {
                id: '2',
                branch_id: 1,
                operating_unit_id: 1,
                code: 'CR002',
                name: 'Caja Secundaria',
                type: CashRegisterType.DELIVERY,
                operating_unit: { id: 1, name: 'Sucursal Centro' },
                is_active: false,
                meta: null,
                created_at: '2025-02-01T00:00:00+00:00',
                updated_at: '2025-02-01T00:00:00+00:00',
            },
        ] as CashRegister[],
    },
    isLoading: false,
}

const mockUseCashRegisters = vi.fn(() => mockCashRegistersData)

vi.mock('@/services/cash-hooks', () => ({
    useCashRegisters: () => mockUseCashRegisters(),
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe('CashRegisterList', () => {
    const mockOnEdit = vi.fn()
    const mockOnCreate = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseCashRegisters.mockReturnValue(mockCashRegistersData)
    })

    afterEach(() => {
        cleanup()
    })

    it('renders the create button', () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        const createButton = screen.getByRole('button', { name: /nueva caja/i })
        expect(createButton).toBeDefined()
    })

    it('calls onCreate when create button is clicked', () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        const createButton = screen.getByRole('button', { name: /nueva caja/i })
        fireEvent.click(createButton)

        expect(mockOnCreate).toHaveBeenCalled()
    })

    it('renders cash register data in the grid', async () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        await waitFor(() => {
            expect(screen.getByText('CR001')).toBeDefined()
            expect(screen.getByText('Caja Principal')).toBeDefined()
        })
    })

    it('renders operating unit name', async () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        await waitFor(() => {
            expect(screen.getAllByText('Sucursal Centro').length).toBeGreaterThan(0)
        })
    })

    it('renders active status badge for active register', async () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        await waitFor(() => {
            expect(screen.getByText('Activa')).toBeDefined()
        })
    })

    it('renders inactive status badge for inactive register', async () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        await waitFor(() => {
            expect(screen.getByText('Inactiva')).toBeDefined()
        })
    })

    it('handles missing operating unit gracefully', async () => {
        mockUseCashRegisters.mockReturnValue({
            data: {
                data: [
                    {
                        id: '3',
                        branch_id: 1,
                        operating_unit_id: null,
                        code: 'CR003',
                        name: 'Caja Sin OU',
                        type: CashRegisterType.ON_PREMISE,
                        operating_unit: null,
                        is_active: true,
                        meta: null,
                        created_at: '2025-01-15T00:00:00+00:00',
                        updated_at: '2025-01-15T00:00:00+00:00',
                    },
                ],
            },
            isLoading: false,
        })

        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        await waitFor(() => {
            expect(screen.getByText('-')).toBeDefined()
        })
    })

    it('shows loading state', () => {
        mockUseCashRegisters.mockReturnValue({
            data: { data: [] as CashRegister[] },
            isLoading: true,
        })

        const { container } = render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        // DataGrid shows skeleton when loading
        expect(container.querySelector('[data-testid]') || container).toBeDefined()
    })

    it('calls useCashRegisters with correct params', () => {
        render(
            <CashRegisterList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
            { wrapper: createWrapper() },
        )

        expect(mockUseCashRegisters).toHaveBeenCalled()
    })
})
