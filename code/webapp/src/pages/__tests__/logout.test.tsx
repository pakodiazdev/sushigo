/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  logout: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ logout: mocks.logout }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: mocks.clear }),
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => opts,
  useRouter: () => ({ navigate: mocks.navigate }),
}))

import { LogoutPage } from '../logout'

describe('LogoutPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('clears the React Query cache after logout so the next user gets no cached data, then redirects', async () => {
    render(<LogoutPage />)

    await waitFor(() => expect(mocks.logout).toHaveBeenCalled())
    await waitFor(() => expect(mocks.clear).toHaveBeenCalled())

    // cache is cleared only after the store logout resolves
    const [logoutOrder] = mocks.logout.mock.invocationCallOrder
    const [clearOrder] = mocks.clear.mock.invocationCallOrder
    expect(logoutOrder).toBeLessThan(clearOrder ?? 0)
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' }))
  })
})
