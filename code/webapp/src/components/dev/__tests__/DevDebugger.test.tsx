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

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isAdmin: mockIsAdmin,
    token: mockToken,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries,
    getQueryCache: () => ({
      getAll: () => mockQueries,
    }),
  }),
  useQuery: () => ({
    data: undefined,
    isLoading: false,
  }),
}))

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

  it('refreshes queries and toggles collapsible sections', async () => {
    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    fireEvent.click(screen.getByTitle('Refresh all queries'))
    expect(invalidateQueries).toHaveBeenCalledTimes(1)

    expect(document.body.textContent).not.toContain('isAdmin (store)')
    fireEvent.click(screen.getByText('Roles y Permisos'))
    expect(document.body.textContent).toContain('isAdmin (store)')

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

  it('renders unauthenticated state when there is no active user', async () => {
    mockUser = null
    mockIsAuthenticated = false
    mockIsAdmin = false
    mockToken = null

    const DevDebugger = await loadDevDebugger('false')
    renderFresh(DevDebugger)

    expect(screen.getAllByText('No autenticado').length).toBeGreaterThan(0)
    expect(screen.getByText(/Cmd\+Shift\+D|Ctrl\+Shift\+D/)).toBeTruthy()
  })
})