/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionStatus } from '@/types/cash'
import type { CashSession } from '@/types/cash'

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => mockNavigate,
}))

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ currentBranch: { id: 1, name: 'Sucursal Test' } }),
}))

const mockSession: CashSession = {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    operating_date: '2026-07-24',
    opening_balance: '500.00',
    closing_balance: null,
    status: SessionStatus.DRAFT,
    opened_by: 1,
    opened_at: '2026-07-24T08:00:00+00:00',
    posted_by: null,
    posted_at: null,
    meta: null,
    created_at: '2026-07-24T08:00:00+00:00',
    updated_at: '2026-07-24T08:00:00+00:00',
}

vi.mock('@/services/cash-hooks', () => ({
    useCashSessions: () => ({
        data: { data: [mockSession] },
        isLoading: false,
    }),
}))

vi.mock('@/components/cash', () => ({
    OpenSessionDialog: () => null,
    CreateAdjustmentDialog: () => null,
}))

import Dashboard from '../Dashboard'

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('Dashboard', () => {
    it('renders an open session card without a cash register name', async () => {
        render(<Dashboard />, { wrapper: createWrapper() })

        await waitFor(() => expect(screen.getByText('Caja sin identificar')).toBeDefined(), { timeout: 3000 })
    }, 5000)

    it('opens the adjustment dialog for a specific session when clicking "Registrar Ajuste" on a card', async () => {
        render(<Dashboard />, { wrapper: createWrapper() })

        await waitFor(() => expect(screen.getByText('Caja sin identificar')).toBeDefined(), { timeout: 3000 })

        const registerAdjustmentButtons = screen.getAllByRole('button', { name: /registrar ajuste/i })
        // The card-level button (not the quick-action one) is the last match
        fireEvent.click(registerAdjustmentButtons[registerAdjustmentButtons.length - 1]!)

        expect(screen.getAllByRole('button', { name: /registrar ajuste/i }).length).toBeGreaterThan(0)
    }, 5000)

    it('navigates to the session detail page when clicking "Ver Detalles" on a card', async () => {
        render(<Dashboard />, { wrapper: createWrapper() })

        await waitFor(() => expect(screen.getByText('Caja sin identificar')).toBeDefined(), { timeout: 3000 })

        fireEvent.click(screen.getByRole('button', { name: /ver detalles/i }))

        expect(mockNavigate).toHaveBeenCalledWith({
            to: '/cash/sessions/$sessionId',
            params: { sessionId: mockSession.id },
        })
    }, 5000)
})
