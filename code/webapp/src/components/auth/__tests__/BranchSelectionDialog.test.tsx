/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { BranchSelectionDialog } from '../BranchSelectionDialog'

// Mock auth store
const mockSwitchBranch = vi.fn()
const mockUseAuthStore = vi.fn()

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => mockUseAuthStore(),
}))

describe('BranchSelectionDialog', () => {
    const mockBranches = [
        {
            id: 1,
            code: 'B001',
            name: 'Branch 1',
            region: 'North',
            timezone: 'America/Mexico_City',
            is_active: true,
            meta: null,
            created_at: '2025-01-01T00:00:00+00:00',
            updated_at: '2025-01-01T00:00:00+00:00',
        },
        {
            id: 2,
            code: 'B002',
            name: 'Branch 2',
            region: null,
            timezone: 'America/Mexico_City',
            is_active: true,
            meta: null,
            created_at: '2025-01-01T00:00:00+00:00',
            updated_at: '2025-01-01T00:00:00+00:00',
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        mockSwitchBranch.mockResolvedValue(undefined)
    })

    afterEach(() => {
        cleanup()
    })

    it('renders nothing when user is not admin', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: false,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        const { container } = render(<BranchSelectionDialog />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when admin has only one branch', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: [mockBranches[0]],
            switchBranch: mockSwitchBranch,
        })

        const { container } = render(<BranchSelectionDialog />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when admin already has a branch selected', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: mockBranches[0],
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        const { container } = render(<BranchSelectionDialog />)
        expect(container.firstChild).toBeNull()
    })

    it('renders dialog when admin has multiple branches and none selected', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        expect(screen.getByText('Seleccionar Sucursal')).toBeDefined()
    })

    it('displays all available branches', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        expect(screen.getByText('Branch 1')).toBeDefined()
        expect(screen.getByText('Branch 2')).toBeDefined()
        expect(screen.getByText('Código: B001')).toBeDefined()
        expect(screen.getByText('Código: B002')).toBeDefined()
    })

    it('displays region when available', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        expect(screen.getByText('Región: North')).toBeDefined()
    })

    it('calls switchBranch when branch button is clicked', async () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        const branch1Button = screen.getByText('Branch 1').closest('button')
        if (branch1Button) {
            fireEvent.click(branch1Button)
        }

        await waitFor(() => {
            expect(mockSwitchBranch).toHaveBeenCalledWith(1)
        })
    })

    it('displays error when switchBranch fails', async () => {
        mockSwitchBranch.mockRejectedValue(new Error('Switch failed'))

        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        const branch1Button = screen.getByText('Branch 1').closest('button')
        if (branch1Button) {
            fireEvent.click(branch1Button)
        }

        await waitFor(() => {
            expect(screen.getByText(/error al cambiar de sucursal/i)).toBeDefined()
        })
    })

    it('displays help text at bottom', () => {
        mockUseAuthStore.mockReturnValue({
            isAdmin: true,
            currentBranch: null,
            availableBranches: mockBranches,
            switchBranch: mockSwitchBranch,
        })

        render(<BranchSelectionDialog />)

        expect(screen.getByText(/podrás cambiar de sucursal/i)).toBeDefined()
    })
})
