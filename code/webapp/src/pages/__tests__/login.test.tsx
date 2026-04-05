// @vitest-environment jsdom
/**
 * LoginPage unit tests
 *
 * Validates UI rendering, form behavior, validation feedback, and error display.
 * These tests replace the Cypress "Login page — UI" and "Login fallido" suites
 * per the testing strategy: validation and error cases belong in Vitest, not E2E.
 *
 * Happy-path login flow (login → dashboard) remains in Cypress.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'

// ─── Mock Dependencies ──────────────────────────────────────────────────────

let mockAuthState = {
  login: vi.fn(),
  error: null as string | null,
  isLoading: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({ component: null }),
  Link: ({ children, ...props }: Record<string, unknown>) => {
    const { to, className } = props as { to: string; className: string }
    return <a href={to} className={className}>{children as React.ReactNode}</a>
  },
}))

// ─── Helpers ────────────────────────────────────────────────────────────────

import { LoginPage } from '../login'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockAuthState = {
    login: vi.fn(),
    error: null,
    isLoading: false,
  }
})

function renderLogin() {
  return render(<LoginPage />)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LoginPage — UI rendering', () => {
  it('renders the login card', () => {
    const { container } = renderLogin()
    // The login page renders inside a Card component
    expect(container.querySelector('[class*="Card"], [class*="card"]')).not.toBeNull()
  })

  it('renders demo credentials text', () => {
    const { getByText } = renderLogin()
    expect(getByText('admin@sushigo.com')).not.toBeNull()
    expect(getByText('admin123456')).not.toBeNull()
  })

  it('renders identifier and password inputs', () => {
    const { container } = renderLogin()
    const identifier = container.querySelector('input#identifier')
    const password = container.querySelector('input#password')

    expect(identifier).not.toBeNull()
    expect(password).not.toBeNull()
    expect(password?.getAttribute('type')).toBe('password')
  })

  it('renders submit button', () => {
    const { getByRole } = renderLogin()
    const button = getByRole('button', { name: /iniciar sesión/i })
    expect(button).not.toBeNull()
  })

  it('renders forgot password link', () => {
    const { getByText } = renderLogin()
    const link = getByText(/olvidaste tu contraseña/i)
    expect(link).not.toBeNull()
    expect(link.closest('a')?.getAttribute('href')).toBe('/forgot-password')
  })
})

describe('LoginPage — Form behavior', () => {
  it('disables inputs and button while loading', () => {
    mockAuthState.isLoading = true

    const { container, getByRole } = renderLogin()
    const identifier = container.querySelector('input#identifier') as HTMLInputElement
    const password = container.querySelector('input#password') as HTMLInputElement
    const button = getByRole('button')

    expect(identifier.disabled).toBe(true)
    expect(password.disabled).toBe(true)
    expect(button).toHaveProperty('disabled', true)
  })

  it('shows loading spinner text while loading', () => {
    mockAuthState.isLoading = true

    const { getByText } = renderLogin()
    expect(getByText(/iniciando sesión/i)).not.toBeNull()
  })

  it('calls login with email credentials on submit', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined)
    mockAuthState.login = loginMock

    const { container, getByRole } = renderLogin()
    const identifier = container.querySelector('input#identifier') as HTMLInputElement
    const password = container.querySelector('input#password') as HTMLInputElement

    fireEvent.change(identifier, { target: { value: 'admin@sushigo.com' } })
    fireEvent.change(password, { target: { value: 'admin123456' } })
    fireEvent.click(getByRole('button'))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'admin@sushigo.com',
        password: 'admin123456',
      })
    })
  })

  it('calls login with phone credentials when identifier has no @', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined)
    mockAuthState.login = loginMock

    const { container, getByRole } = renderLogin()
    const identifier = container.querySelector('input#identifier') as HTMLInputElement
    const password = container.querySelector('input#password') as HTMLInputElement

    fireEvent.change(identifier, { target: { value: '5512345678' } })
    fireEvent.change(password, { target: { value: 'secret' } })
    fireEvent.click(getByRole('button'))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        phone: '5512345678',
        password: 'secret',
      })
    })
  })

  it('preserves form values after a failed login', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('Invalid'))
    mockAuthState.login = loginMock

    const { container, getByRole } = renderLogin()
    const identifier = container.querySelector('input#identifier') as HTMLInputElement
    const password = container.querySelector('input#password') as HTMLInputElement

    fireEvent.change(identifier, { target: { value: 'wrong@test.com' } })
    fireEvent.change(password, { target: { value: 'wrongpass' } })
    fireEvent.click(getByRole('button'))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled()
    })

    // Values should be preserved
    expect(identifier.value).toBe('wrong@test.com')
    expect(password.value).toBe('wrongpass')
  })
})

describe('LoginPage — Error display', () => {
  it('shows error message when auth store has error', () => {
    mockAuthState.error = 'Credenciales inválidas'

    const { getByText } = renderLogin()
    expect(getByText('Credenciales inválidas')).not.toBeNull()
  })

  it('does not show error container when there is no error', () => {
    mockAuthState.error = null

    const { container } = renderLogin()
    const errorBox = container.querySelector('.text-red-600')
    expect(errorBox).toBeNull()
  })

  it('error container has proper styling for visibility', () => {
    mockAuthState.error = 'Some error'

    const { getByText } = renderLogin()
    const errorEl = getByText('Some error')
    expect(errorEl.className).toContain('text-red-600')
    expect(errorEl.className).toContain('bg-red-50')
  })
})
