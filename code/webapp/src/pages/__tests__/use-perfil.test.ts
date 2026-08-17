// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockUser = { id: 1, name: 'Ana García', email: 'ana@sushigo.com', avatar_url: null as string | null }
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser }) => unknown) => selector({ user: mockUser }),
}))

const mockUseMyEmployee = vi.fn()
vi.mock('@/services/employee-hooks', () => ({
  useMyEmployee: () => mockUseMyEmployee(),
}))

import { usePerfilPage } from '../use-perfil'

const employee = {
  user: { first_name: 'Ana', last_name: 'García' },
}

describe('usePerfilPage', () => {
  it('derives displayName from the employee and avatarUrl/email from the auth store user', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })

    const { result } = renderHook(() => usePerfilPage())

    expect(result.current.displayName).toBe('Ana García')
    expect(result.current.avatarUrl).toBeNull()
    expect(result.current.email).toBe('ana@sushigo.com')
    expect(result.current.isLoadingEmployee).toBe(false)
  })

  it('falls back to the auth store user name when no employee is linked', () => {
    mockUseMyEmployee.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() => usePerfilPage())

    expect(result.current.displayName).toBe('Ana García')
  })

  it('reflects the employee query loading state', () => {
    mockUseMyEmployee.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => usePerfilPage())

    expect(result.current.isLoadingEmployee).toBe(true)
  })
})
