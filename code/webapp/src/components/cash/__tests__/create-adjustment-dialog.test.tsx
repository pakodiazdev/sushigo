/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateAdjustmentDialog } from '../create-adjustment-dialog'

// Mock the hooks
vi.mock('@/services/cash-hooks', () => ({
  useCashSessions: vi.fn().mockReturnValue({
    data: {
      data: [
        { id: 1, operating_date: '2025-01-15', cash_register: { name: 'Caja 1' } },
      ],
    },
    isLoading: false,
  }),
  useCashTerminals: vi.fn().mockReturnValue({
    data: {
      data: [
        { id: 1, name: 'Terminal 1', is_active: true },
      ],
    },
  }),
  useBankAccounts: vi.fn().mockReturnValue({
    data: {
      data: [
        { id: 1, name: 'Cuenta Principal', is_active: true },
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
})
