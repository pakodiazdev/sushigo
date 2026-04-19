/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { BranchSwitcher } from '../BranchSwitcher'

// Mock auth store
const mockSwitchBranch = vi.fn()
const mockUseAuthStore = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

describe('BranchSwitcher', () => {
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
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    const { container } = render(<BranchSwitcher />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when admin has only one branch', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: [mockBranches[0]],
      switchBranch: mockSwitchBranch,
    })

    const { container } = render(<BranchSwitcher />)
    expect(container.firstChild).toBeNull()
  })

  it('renders switcher when admin has multiple branches', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    expect(screen.getByText('Sucursal Actual')).toBeDefined()
    expect(screen.getByText('Branch 1')).toBeDefined()
  })

  it('shows "Seleccionar sucursal" when no branch is selected', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: null,
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    expect(screen.getByText('Seleccionar sucursal')).toBeDefined()
  })

  it('opens dropdown when button is clicked', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    const button = screen.getByText('Sucursal Actual').closest('button')
    if (button) {
      fireEvent.click(button)
    }

    // Should show both branches in dropdown
    expect(screen.getAllByText('Branch 1').length).toBeGreaterThan(0)
    expect(screen.getByText('Branch 2')).toBeDefined()
  })

  it('displays branch codes in dropdown', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    const button = screen.getByText('Sucursal Actual').closest('button')
    if (button) {
      fireEvent.click(button)
    }

    expect(screen.getByText('B001')).toBeDefined()
    expect(screen.getByText('B002')).toBeDefined()
  })

  it('calls switchBranch when different branch is selected', async () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    // Open dropdown
    const triggerButton = screen.getByText('Sucursal Actual').closest('button')
    if (triggerButton) {
      fireEvent.click(triggerButton)
    }

    // Click Branch 2
    const branch2Button = screen.getByText('Branch 2').closest('button')
    if (branch2Button) {
      fireEvent.click(branch2Button)
    }

    await waitFor(() => {
      expect(mockSwitchBranch).toHaveBeenCalledWith(2)
    })
  })

  it('does not call switchBranch when same branch is selected', async () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    // Open dropdown
    const triggerButton = screen.getByText('Sucursal Actual').closest('button')
    if (triggerButton) {
      fireEvent.click(triggerButton)
    }

    // Find buttons in dropdown and click the one for Branch 1
    const buttons = screen.getAllByRole('button')
    const branch1DropdownButton = buttons.find(
      (btn) => btn.textContent?.includes('B001'),
    )
    if (branch1DropdownButton) {
      fireEvent.click(branch1DropdownButton)
    }

    // Should not call switchBranch since it's the same branch
    expect(mockSwitchBranch).not.toHaveBeenCalled()
  })

  it('closes dropdown when clicking outside', () => {
    mockUseAuthStore.mockReturnValue({
      isAdmin: true,
      currentBranch: mockBranches[0],
      availableBranches: mockBranches,
      switchBranch: mockSwitchBranch,
    })

    render(<BranchSwitcher />)

    // Open dropdown
    const triggerButton = screen.getByText('Sucursal Actual').closest('button')
    if (triggerButton) {
      fireEvent.click(triggerButton)
    }

    // Verify dropdown is open
    expect(screen.getByText('B002')).toBeDefined()

    // Click outside (backdrop)
    const backdrop = document.querySelector('.fixed.inset-0')
    if (backdrop) {
      fireEvent.click(backdrop)
    }

    // Dropdown should be closed - B002 should no longer be visible
    expect(screen.queryByText('B002')).toBeNull()
  })
})
