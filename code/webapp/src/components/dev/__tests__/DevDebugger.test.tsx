// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

type MockUser = {
  id: number
  name: string
  email: string
  roles: Array<{ id: number; name: string }>
  permissions: Array<{ id: number; name: string }>
}

let mockUser: MockUser | null = null
let mockIsAuthenticated = false
let mockIsAdmin = false
let mockToken: string | null = null
let mockQueries: Array<{
  state: { dataUpdatedAt: number; fetchStatus: 'fetching' | 'idle' }
  isStale: () => boolean
}> = []
const invalidateQueries = vi.fn()
const mockInitializeAfterReset = vi.fn()

let mockDevUsersQueryData: unknown = undefined
let mockIsLoadingDevUsers = false

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isAdmin: mockIsAdmin,
    token: mockToken,
    initializeAfterReset: mockInitializeAfterReset,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select?: (s: { location: { pathname: string } }) => unknown } = {}) =>
    select ? select({ location: { pathname: '/dashboard' } }) : { location: { pathname: '/dashboard' } },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries,
    getQueryCache: () => ({
      getAll: () => mockQueries,
    }),
  }),
  useQuery: () => ({
    data: mockDevUsersQueryData,
    isLoading: mockIsLoadingDevUsers,
  }),
  useMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
}))

vi.mock('@/services/dev-api', () => ({
  listDevUsers: vi.fn(),
  loginAs: vi.fn(),
}))

import { loginAs } from '@/services/dev-api'
const mockLoginAs = vi.mocked(loginAs)

async function loadDevDebugger(startHidden = 'false') {
  vi.stubEnv('VITE_DEV_DEBUGGER_START_HIDDEN', startHidden)
  const module = await import('@/components/dev/DevDebugger')
  return module.DevDebugger
}

function renderFresh(Component: Awaited<ReturnType<typeof loadDevDebugger>>) {
  return render(<Component />)
}

describe('DevDebugger', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockDevUsersQueryData = undefined
    mockIsLoadingDevUsers = false
    mockUser = {
      id: 1,
      name: 'Admin User',
      email: 'admin@sushigo.com',
      roles: [{ id: 1, name: 'admin' }],
      permissions: [{ id: 10, name: 'users.update' }],
    }
    mockIsAuthenticated = true
    mockIsAdmin = true
    mockToken = 'token-1234567890-abcdefghijklmnopqrstuvwxyz'
    mockQueries = [
      {
        state: { dataUpdatedAt: Date.now(), fetchStatus: 'fetching' },
        isStale: () => false,
      },
      {
        state: { dataUpdatedAt: Date.now() - 10_000, fetchStatus: 'idle' },
        isStale: () => true,
      },
    ]
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders visible by default in development and shows user details', async () => {
    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    expect(screen.getByText('Dev Debugger')).toBeTruthy()
    expect(document.body.textContent).toContain('Admin User')
    expect(document.body.textContent).toContain('admin@sushigo.com')
    expect(document.body.textContent).toContain('admin')

    fireEvent.click(screen.getByText('Roles y Permisos'))

    expect(document.body.textContent).toContain('users.update')
  })

  it('starts hidden when the env flag is true and can be shown with the keyboard shortcut', async () => {
    const DevDebugger = await loadDevDebugger('true')
    renderFresh(DevDebugger)

    expect(screen.queryByText('Dev Debugger')).toBeNull()

    fireEvent.keyDown(window, { key: 'd', metaKey: true, shiftKey: true })

    expect(screen.getByText('Dev Debugger')).toBeTruthy()
  })

  it('ignores the keyboard shortcut when focus is inside an editable field', async () => {
    const DevDebugger = await loadDevDebugger('true')
    renderFresh(DevDebugger)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'd', ctrlKey: true, shiftKey: true })

    expect(screen.queryByText('Dev Debugger')).toBeNull()
  })

  it('can be minimized, expanded, and hidden again with the shortcut', async () => {
    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    fireEvent.click(screen.getByTitle('Minimize debugger'))
    expect(screen.getByText('Debugger')).toBeTruthy()
    expect(screen.queryByText('Dev Debugger')).toBeNull()

    fireEvent.click(screen.getByTitle('Expand debugger'))
    expect(screen.getByText('Dev Debugger')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'd', metaKey: true, shiftKey: true })
    expect(screen.queryByText('Dev Debugger')).toBeNull()
  })

  it('refreshes queries and toggles collapsible sections including user section', async () => {
    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    fireEvent.click(screen.getByTitle('Refresh all queries'))
    expect(invalidateQueries).toHaveBeenCalledTimes(1)

    expect(document.body.textContent).not.toContain('isAdmin (store)')
    fireEvent.click(screen.getByText('Roles y Permisos'))
    expect(document.body.textContent).toContain('isAdmin (store)')

    // Collapse the user section (covers the onToggle arrow fn on that Section)
    fireEvent.click(screen.getByText('Usuario'))
    expect(document.body.textContent).not.toContain('Nombre:')

    expect(document.body.textContent).not.toContain('Total:')
    fireEvent.click(screen.getByText('Query Cache'))
    expect(document.body.textContent).toContain('Total:')
    expect(document.body.textContent).toContain('Fetching:')
  })

  it('loads persisted state from localStorage and handles invalid saved JSON', async () => {
    localStorage.setItem('dev_debugger_state', JSON.stringify({
      position: { x: 123, y: 456 },
      expandedSections: { user: false, roles: true, queries: true },
    }))

    let DevDebugger = await loadDevDebugger('false')
    const { unmount } = renderFresh(DevDebugger)

    expect(document.body.textContent).not.toContain('Nombre:')
    expect(document.body.textContent).toContain('isAdmin (store)')
    expect(document.body.textContent).toContain('Total:')

    unmount()
    localStorage.setItem('dev_debugger_state', '{invalid-json')
    DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    expect(screen.getByText('Dev Debugger')).toBeTruthy()
    expect(document.body.textContent).toContain('Nombre:')
  })

  it('renders the dev login section when the feature is enabled and users are available', async () => {
    mockUser = null
    mockIsAuthenticated = false
    mockIsAdmin = false
    mockToken = null
    mockDevUsersQueryData = [
      { id: 1, name: 'Admin', email: 'admin@test.com', roles: ['admin'] },
      { id: 2, name: 'Staff', email: 'staff@test.com', roles: ['inventory-manager'] },
    ]
    vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
    vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'testing')
    vi.stubEnv('VITE_APP_ENV', 'testing')

    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    expect(document.body.textContent).toContain('Dev Login')
    expect(document.body.textContent).toContain('Admin')
    expect(document.body.textContent).toContain('admin@test.com')
  })

  it('filters dev users by search and shows no-results message', async () => {
    mockUser = null
    mockIsAuthenticated = false
    mockToken = null
    mockDevUsersQueryData = [
      { id: 1, name: 'Admin User', email: 'admin@test.com', roles: ['admin'] },
    ]
    vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
    vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'testing')
    vi.stubEnv('VITE_APP_ENV', 'testing')

    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    const searchInput = screen.getByPlaceholderText('Buscar usuario...')
    fireEvent.change(searchInput, { target: { value: 'xyz-not-found' } })

    expect(document.body.textContent).toContain('Sin resultados')
  })

  it('shows loading skeleton when dev users are being fetched', async () => {
    mockUser = null
    mockIsAuthenticated = false
    mockToken = null
    mockIsLoadingDevUsers = true
    mockDevUsersQueryData = undefined
    vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
    vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'testing')
    vi.stubEnv('VITE_APP_ENV', 'testing')

    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    expect(document.body.textContent).toContain('Dev Login')
    // Loading skeleton: 3 pulse divs should be present
    const pulseDivs = document.querySelectorAll('.animate-pulse')
    expect(pulseDivs.length).toBeGreaterThan(0)
  })

  it('calls handleDevLogin when a dev user button is clicked', async () => {
    mockUser = null
    mockIsAuthenticated = false
    mockToken = null
    mockDevUsersQueryData = [
      { id: 3, name: 'Ops User', email: 'ops@test.com', roles: ['inventory-manager'] },
    ]
    vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
    vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'testing')
    vi.stubEnv('VITE_APP_ENV', 'testing')
    mockLoginAs.mockResolvedValue(null)

    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    const userButton = screen.getByTestId('dev-login-user')
    fireEvent.click(userButton)

    expect(mockLoginAs).toHaveBeenCalledWith(3)
  })
})